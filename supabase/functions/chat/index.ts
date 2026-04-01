import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDERS = [
  { name: "openai", url: "https://api.openai.com/v1/chat/completions", envKey: "OPENAI_API_KEY" },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", envKey: "GROQ_API_KEY" },
];

async function generatePaymentLink(supabase: any, siteId: string, customerEmail: string, customerName: string, amount: number): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data: paymentConfig } = await supabase
      .from("payment_configs")
      .select("secret_key, public_key, provider")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .single();

    if (!paymentConfig?.secret_key) {
      return { success: false, error: "Payment not configured for this business" };
    }

    if (paymentConfig.provider === "paystack") {
      const resp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${paymentConfig.secret_key}`,
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(amount * 100),
          metadata: { customer_name: customerName, site_id: siteId },
        }),
      });
      const data = await resp.json();
      if (data.status && data.data?.authorization_url) {
        return { success: true, url: data.data.authorization_url };
      }
      return { success: false, error: data.message || "Paystack error" };
    }

    if (paymentConfig.provider === "flutterwave") {
      const resp = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${paymentConfig.secret_key}`,
        },
        body: JSON.stringify({
          tx_ref: `txn_${Date.now()}`,
          amount,
          currency: "NGN",
          customer: { email: customerEmail, name: customerName },
          redirect_url: "https://businesschatbots.lovable.app",
        }),
      });
      const data = await resp.json();
      if (data.status === "success" && data.data?.link) {
        return { success: true, url: data.data.link };
      }
      return { success: false, error: data.message || "Flutterwave error" };
    }

    return { success: false, error: `Unsupported provider: ${paymentConfig.provider}` };
  } catch (e) {
    console.error("Payment link error:", e);
    return { success: false, error: "Payment service unavailable" };
  }
}

function detectPaymentIntent(messages: any[]): { isPayment: boolean; email?: string; name?: string; product?: string; amount?: number } {
  const recent = messages.slice(-6);
  const allText = recent.map((m: any) => m.content).join(" ").toLowerCase();
  
  // Check if conversation has progressed to payment stage
  const paymentKeywords = ["pay now", "buy now", "proceed to pay", "make payment", "complete purchase", "checkout", "place order", "i want to buy", "i'll take", "i want to order"];
  const isPayment = paymentKeywords.some(k => allText.includes(k));
  
  // Try to extract email from recent messages
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
  
  // Try to extract name
  const namePatterns = [/my name is (\w+[\s\w]*)/i, /i'm (\w+)/i, /name:\s*(\w+[\s\w]*)/i];
  let name: string | undefined;
  for (const msg of recent) {
    for (const pat of namePatterns) {
      const m = msg.content.match(pat);
      if (m) { name = m[1].trim(); break; }
    }
    if (name) break;
  }

  return { isPayment, email: emailMatch?.[0], name };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { siteId, messages, conversationId, visitorId } = await req.json();

    if (!siteId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "siteId and messages are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get site config
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("name, url, ai_provider, ai_model, currency")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure conversation exists
    let activeConvoId = conversationId;
    if (!activeConvoId && visitorId) {
      const { data: existingConvo } = await supabase
        .from("conversations").select("id")
        .eq("site_id", siteId).eq("visitor_id", visitorId)
        .order("updated_at", { ascending: false }).limit(1).single();

      if (existingConvo) {
        activeConvoId = existingConvo.id;
        await supabase.from("conversations").update({ updated_at: new Date().toISOString(), last_active_at: new Date().toISOString() }).eq("id", activeConvoId);
      } else {
        const { data: newConvo } = await supabase
          .from("conversations").insert({ site_id: siteId, visitor_id: visitorId }).select("id").single();
        activeConvoId = newConvo?.id;
      }
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const query = lastUserMsg?.content || "";

    // Search knowledge + products
    const { data: chunks } = await supabase.rpc("search_knowledge", { p_site_id: siteId, p_query: query, p_limit: 5 });
    const { data: products } = await supabase.from("products").select("name, description, price, image_url, category, stock").eq("site_id", siteId).limit(20);

    // Fetch manual payment config for context
    const { data: manualPayConfig } = await supabase
      .from("manual_payment_config")
      .select("bank_name, account_name, account_number, instructions")
      .eq("site_id", siteId)
      .single();

    // Fetch payment links (fallback) for this site
    const { data: paymentLinks } = await supabase
      .from("payment_links")
      .select("amount, link, label")
      .eq("site_id", siteId);

    // Check for payment intent
    const paymentIntent = detectPaymentIntent(messages);
    let paymentContext = "";
    
    if (paymentIntent.isPayment && paymentIntent.email) {
      // Try to find the product and amount from conversation context
      const allText = messages.map((m: any) => m.content).join(" ");
      let matchedProduct: any = null;
      if (products) {
        for (const p of products) {
          if (allText.toLowerCase().includes(p.name.toLowerCase())) {
            matchedProduct = p;
            break;
          }
        }
      }

      if (matchedProduct?.price) {
        // First try payment gateway
        const result = await generatePaymentLink(
          supabase, siteId,
          paymentIntent.email,
          paymentIntent.name || "Customer",
          matchedProduct.price
        );

        if (result.success && result.url) {
          // Create order record
          await supabase.from("orders").insert({
            site_id: siteId,
            customer_name: paymentIntent.name || "Customer",
            customer_email: paymentIntent.email,
            total_amount: matchedProduct.price,
            payment_status: "pending",
            conversation_id: activeConvoId,
          });

          paymentContext = `\n\n🔗 PAYMENT LINK GENERATED (REAL - from backend):
Product: ${matchedProduct.name}
Amount: ${site.currency || "USD"} ${matchedProduct.price}
Payment URL: ${result.url}

INSTRUCTION: Show the customer this EXACT payment link. Tell them to click the link to complete payment securely. Format it as: [Complete Payment](${result.url})`;
        } else {
          // FALLBACK: Try payment_links table
          let fallbackLink: any = null;
          if (paymentLinks?.length) {
            fallbackLink = paymentLinks.find((pl: any) => Number(pl.amount) === Number(matchedProduct.price));
            if (!fallbackLink) {
              // Find closest match
              fallbackLink = paymentLinks.reduce((closest: any, pl: any) => {
                if (!closest) return pl;
                return Math.abs(Number(pl.amount) - matchedProduct.price) < Math.abs(Number(closest.amount) - matchedProduct.price) ? pl : closest;
              }, null);
            }
          }

          if (fallbackLink?.link) {
            await supabase.from("orders").insert({
              site_id: siteId,
              customer_name: paymentIntent.name || "Customer",
              customer_email: paymentIntent.email,
              total_amount: matchedProduct.price,
              payment_status: "pending",
              conversation_id: activeConvoId,
            });

            paymentContext = `\n\n🔗 PAYMENT LINK (FALLBACK - from database):
Product: ${matchedProduct.name}
Amount: ${site.currency || "USD"} ${matchedProduct.price}
Payment URL: ${fallbackLink.link}

INSTRUCTION: Show the customer this EXACT payment link. Format it as: [Complete Payment](${fallbackLink.link})`;
          } else if (manualPayConfig) {
            // FALLBACK 2: Show manual bank payment
            paymentContext = `\n\n🏦 MANUAL PAYMENT DETAILS (REAL - from database):
Product: ${matchedProduct.name}
Amount: ${site.currency || "USD"} ${matchedProduct.price}
Bank: ${manualPayConfig.bank_name}
Account Name: ${manualPayConfig.account_name}
Account Number: ${manualPayConfig.account_number}
${manualPayConfig.instructions ? `Instructions: ${manualPayConfig.instructions}` : ""}

INSTRUCTION: Show the customer these EXACT bank details. Ask them to make a transfer and send proof of payment.`;
          } else {
            paymentContext = `\n\n⚠️ Payment link for this amount is unavailable. No payment method is configured. Tell the customer: "Payment is currently unavailable. Please contact us directly."`;
          }
        }
      } else if (!matchedProduct) {
        paymentContext = "\n\n⚠️ Could not identify which product the customer wants to buy. Ask the customer to specify the exact product name.";
      }
    } else if (paymentIntent.isPayment && !paymentIntent.email) {
      paymentContext = "\n\n⚠️ Customer wants to pay but hasn't provided their email. You MUST ask for their email address before processing payment.";
    }

    // Add manual payment context if available (for general queries about payment)
    let manualPaymentContext = "";
    if (manualPayConfig && !paymentContext.includes("MANUAL PAYMENT")) {
      manualPaymentContext = `\n\nMANUAL PAYMENT OPTION AVAILABLE:
Bank: ${manualPayConfig.bank_name}
Account Name: ${manualPayConfig.account_name}
Account Number: ${manualPayConfig.account_number}
${manualPayConfig.instructions ? `Instructions: ${manualPayConfig.instructions}` : ""}
NOTE: Only share these details when customer asks about payment methods or bank transfer. Use ONLY these real values.`; 
    }

    // Build context
    let knowledgeContext = "";
    if (chunks?.length) {
      knowledgeContext = chunks.map((c: any) => `[${c.category?.toUpperCase() || "INFO"}] ${c.title ? c.title + ": " : ""}${c.content}`).join("\n\n---\n\n");
    }

    let productContext = "";
    if (products?.length) {
      const currSymbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵", ZAR: "R" };
      const sym = currSymbols[site.currency || "USD"] || (site.currency + " ");
      productContext = "\n\nAVAILABLE PRODUCTS:\n" + products.map((p: any) =>
        `- ${p.name} | ${p.price ? `${sym}${p.price}` : "Price on inquiry"} | ${p.category || "General"}${p.description ? ` | ${p.description.slice(0, 100)}` : ""}${p.image_url ? ` | Image: ${p.image_url}` : ""}${p.stock !== null ? ` | Stock: ${p.stock}` : ""}`
      ).join("\n");
    }

    const systemPrompt = `You are a high-conversion AI Sales Rep for "${site.name}" (${site.url || ""}).

IDENTITY: You are a trained sales representative. NEVER say you're an AI, bot, or chatbot.

PAYMENT RULES (CRITICAL):
- NEVER generate, invent, or guess payment links or bank details
- ONLY use payment links provided in the PAYMENT LINK GENERATED section below
- If no payment link is provided, ask the customer for: email, name, and which product they want
- When a real payment link IS provided, show it as a clickable link: [Complete Payment](url)
- NEVER fabricate transaction references or account numbers

SALES BEHAVIOR:
- Use ONLY the product data below — NEVER invent products or prices
- Guide users toward purchasing with enthusiasm
- When showing products, include name, price, and description
- Sales flow: DISCOVER → SELECT → COLLECT details (name, email, phone) → PAYMENT
- NEVER say "I'm not sure", "contact support", or "check the website"
- Keep responses short (2-4 sentences) unless listing products
- Use natural language with light emojis

WEBSITE KNOWLEDGE:
${knowledgeContext || "No specific knowledge available."}
${productContext || "No products catalogued yet."}
${paymentContext}
${manualPaymentContext}`;

    // Store user message
    if (activeConvoId && lastUserMsg) {
      await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "user", content: lastUserMsg.content });
    }

    // AI Router
    const preferredProvider = site.ai_provider || "openai";
    const preferredModel = site.ai_model || "gpt-4o-mini";
    const orderedProviders = [
      ...PROVIDERS.filter(p => p.name === preferredProvider),
      ...PROVIDERS.filter(p => p.name !== preferredProvider),
    ];

    const aiMessages = [{ role: "system", content: systemPrompt }, ...messages.slice(-10)];
    let aiResponse: Response | null = null;
    let usedProvider = "";

    for (const provider of orderedProviders) {
      const apiKey = Deno.env.get(provider.envKey);
      if (!apiKey) continue;
      try {
        const model = provider.name === preferredProvider ? preferredModel :
          provider.name === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
        const resp = await fetch(provider.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: aiMessages, stream: true }),
        });
        if (resp.ok) { aiResponse = resp; usedProvider = provider.name; console.log(`AI Router: Using ${provider.name}/${model}`); break; }
        console.error(`${provider.name} failed: ${resp.status}`);
      } catch (err) { console.error(`${provider.name} error:`, err); }
    }

    if (!aiResponse) {
      let fallbackMsg = "Here are the available options I found for you:\n\n";
      if (products?.length) {
        fallbackMsg += products.slice(0, 5).map((p: any) => `**${p.name}** — ${p.price ? `$${p.price}` : "Contact for pricing"}\n${p.description?.slice(0, 80) || ""}`).join("\n\n");
        fallbackMsg += "\n\nWould you like more details on any of these?";
      } else {
        fallbackMsg = "I'm experiencing a brief delay. Please try again in a moment! 🙏";
      }
      if (activeConvoId) {
        await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: fallbackMsg });
      }
      return new Response(JSON.stringify({ reply: fallbackMsg, conversationId: activeConvoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let fullAssistantContent = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try { const p = JSON.parse(line.slice(6)); const c = p.choices?.[0]?.delta?.content; if (c) fullAssistantContent += c; } catch {}
          }
        }
      } finally {
        if (activeConvoId && fullAssistantContent) {
          await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: fullAssistantContent });
        }
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": activeConvoId || "", "X-AI-Provider": usedProvider },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
