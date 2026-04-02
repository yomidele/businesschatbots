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

interface CartItem {
  name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

/**
 * Build a cart from AI function call arguments and call the dynamic checkout endpoint
 */
async function callDynamicCheckout(
  supabase: any,
  siteId: string,
  items: CartItem[],
  customerEmail: string,
  customerName: string,
  conversationId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/create-payment-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        site_id: siteId,
        items,
        total_amount: items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
        customer_email: customerEmail,
        customer_name: customerName,
        conversation_id: conversationId,
        description: items.map(i => `${i.quantity}x ${i.name}`).join(" + "),
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data.error || "Payment service error" };
    return { success: true, data };
  } catch (e) {
    console.error("Dynamic checkout error:", e);
    return { success: false, error: "Payment service unavailable" };
  }
}

/**
 * Extract structured cart intent from conversation using AI function calling
 */
function buildCartTools(products: any[]) {
  return [
    {
      type: "function",
      function: {
        name: "create_order",
        description: "Create a checkout order when the customer confirms they want to buy. Call this ONLY when you have: items to buy, customer email, and customer name. Calculate total from unit_price * quantity for each item.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              description: "List of items the customer wants to buy",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name" },
                  unit_price: { type: "number", description: "Price per unit" },
                  quantity: { type: "integer", description: "Number of items", minimum: 1 },
                },
                required: ["name", "unit_price", "quantity"],
              },
            },
            customer_email: { type: "string", description: "Customer email address" },
            customer_name: { type: "string", description: "Customer name" },
          },
          required: ["items", "customer_email", "customer_name"],
        },
      },
    },
  ];
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
      .select("name, url, ai_provider, ai_model, currency, industry")
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

    // Search knowledge + products in parallel
    const [chunksResult, productsResult, manualPayResult] = await Promise.all([
      supabase.rpc("search_knowledge", { p_site_id: siteId, p_query: query, p_limit: 5 }),
      supabase.from("products").select("name, description, price, image_url, category, stock").eq("site_id", siteId).limit(50),
      supabase.from("manual_payment_config").select("bank_name, account_name, account_number, instructions").eq("site_id", siteId).single(),
    ]);

    const chunks = chunksResult.data;
    const products = productsResult.data || [];
    const manualPayConfig = manualPayResult.data;

    // Build context strings
    const currSymbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵", ZAR: "R", INR: "₹", CAD: "CA$", AUD: "A$" };
    const sym = currSymbols[site.currency || "USD"] || (site.currency + " ");

    let knowledgeContext = "";
    if (chunks?.length) {
      knowledgeContext = chunks.map((c: any) => `[${c.category?.toUpperCase() || "INFO"}] ${c.title ? c.title + ": " : ""}${c.content}`).join("\n\n---\n\n");
    }

    let productContext = "";
    if (products.length) {
      productContext = "\n\nAVAILABLE PRODUCTS (REAL DATA — use ONLY these):\n" + products.map((p: any) =>
        `- ${p.name} | ${p.price != null ? `${sym}${p.price}` : "Price on inquiry"} | ${p.category || "General"}${p.description ? ` | ${p.description.slice(0, 100)}` : ""}${p.image_url ? ` | Image: ${p.image_url}` : ""}${p.stock != null ? ` | Stock: ${p.stock}` : ""}`
      ).join("\n");
    }

    let manualPaymentContext = "";
    if (manualPayConfig) {
      manualPaymentContext = `\n\nMANUAL PAYMENT OPTION AVAILABLE:
Bank: ${manualPayConfig.bank_name}
Account Name: ${manualPayConfig.account_name}
Account Number: ${manualPayConfig.account_number}
${manualPayConfig.instructions ? `Instructions: ${manualPayConfig.instructions}` : ""}
NOTE: Only share these details when customer explicitly asks about bank transfer.`;
    }

    const systemPrompt = `You are a high-conversion AI Sales Rep for "${site.name}" (${site.url || ""}).
Currency: ${sym} (${site.currency || "USD"})

IDENTITY: You are a trained sales representative. NEVER say you're an AI, bot, or assistant.

🛒 DYNAMIC CHECKOUT SYSTEM (CRITICAL):
You have a tool called "create_order" to generate secure payment links.
When a customer wants to buy:
1. CONFIRM the items, quantities, and prices from the product list
2. COLLECT their full name and email address
3. Call create_order with the cart items, email, and name
4. The system will return a real payment link — show it as: [Complete Payment](url)

MULTI-PRODUCT SUPPORT:
- Customers can buy MULTIPLE products in ONE order
- Example: "5 cupcakes and 2 cakes" = one order with 2 line items
- Always calculate: unit_price × quantity for each item
- Show order summary before checkout

PAYMENT RULES (CRITICAL):
- NEVER generate, invent, or guess payment links or bank details
- ONLY use links returned from create_order tool
- If payment fails, tell the customer honestly and suggest trying again
- For bank transfers, use ONLY the manual payment details provided below

SALES BEHAVIOR:
- Use ONLY the product data below — NEVER invent products or prices
- Guide users toward purchasing with enthusiasm
- Sales flow: DISCOVER → SELECT → COLLECT details (name, email) → CALL create_order → SHOW LINK
- Keep responses short (2-4 sentences) unless listing products
- When showing products, include name, price, and image if available
- Suggest complementary products when appropriate

WEBSITE KNOWLEDGE:
${knowledgeContext || "No specific knowledge available."}
${productContext || "No products catalogued yet."}
${manualPaymentContext}`;

    // Store user message
    if (activeConvoId && lastUserMsg) {
      await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "user", content: lastUserMsg.content });
    }

    // AI Router with function calling
    const preferredProvider = site.ai_provider || "openai";
    const preferredModel = site.ai_model || "gpt-4o-mini";
    const orderedProviders = [
      ...PROVIDERS.filter(p => p.name === preferredProvider),
      ...PROVIDERS.filter(p => p.name !== preferredProvider),
    ];

    const aiMessages = [{ role: "system", content: systemPrompt }, ...messages.slice(-10)];
    const tools = buildCartTools(products);

    // First AI call — may return tool_call or direct response
    let aiResult: any = null;
    let usedProvider = "";

    for (const provider of orderedProviders) {
      const apiKey = Deno.env.get(provider.envKey);
      if (!apiKey) continue;
      try {
        const model = provider.name === preferredProvider ? preferredModel :
          provider.name === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

        const bodyPayload: any = { model, messages: aiMessages };

        // Only add tools for OpenAI (Groq tool calling is less reliable)
        if (provider.name === "openai") {
          bodyPayload.tools = tools;
          bodyPayload.tool_choice = "auto";
        }

        const resp = await fetch(provider.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });

        if (resp.ok) {
          aiResult = await resp.json();
          usedProvider = provider.name;
          console.log(`AI Router: Using ${provider.name}/${model}`);
          break;
        }
        console.error(`${provider.name} failed: ${resp.status}`);
      } catch (err) {
        console.error(`${provider.name} error:`, err);
      }
    }

    if (!aiResult) {
      let fallbackMsg = products.length
        ? "Here are our available products:\n\n" + products.slice(0, 5).map((p: any) => `**${p.name}** — ${p.price != null ? `${sym}${p.price}` : "Contact for pricing"}\n${p.description?.slice(0, 80) || ""}`).join("\n\n") + "\n\nWhat would you like to order?"
        : "I'm experiencing a brief delay. Please try again in a moment! 🙏";

      if (activeConvoId) {
        await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: fallbackMsg });
      }
      return new Response(JSON.stringify({ reply: fallbackMsg, conversationId: activeConvoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if AI wants to call create_order
    const choice = aiResult.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];

    if (toolCall && toolCall.function?.name === "create_order") {
      // AI decided to create an order — execute the dynamic checkout
      let args: any;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        const errorMsg = "I had trouble processing your order. Could you confirm the items and quantities again?";
        if (activeConvoId) await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: errorMsg });
        return new Response(JSON.stringify({ reply: errorMsg, conversationId: activeConvoId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build validated cart items
      const cartItems: CartItem[] = (args.items || []).map((item: any) => ({
        name: item.name,
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        total_price: Number(item.unit_price) * Number(item.quantity),
      }));

      const checkoutResult = await callDynamicCheckout(
        supabase,
        siteId,
        cartItems,
        args.customer_email,
        args.customer_name || "Customer",
        activeConvoId,
      );

      // Build the response message
      let responseMsg = "";
      const totalAmount = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const orderSummary = cartItems.map(i => `• ${i.quantity}x ${i.name} — ${sym}${(i.unit_price * i.quantity).toLocaleString()}`).join("\n");

      if (checkoutResult.success && checkoutResult.data) {
        const d = checkoutResult.data;
        if (d.type === "gateway" && d.payment_link) {
          responseMsg = `Great! Here's your order summary:\n\n${orderSummary}\n\n**Total: ${sym}${totalAmount.toLocaleString()}**\n\nClick below to complete your payment securely:\n\n[✅ Complete Payment — ${sym}${totalAmount.toLocaleString()}](${d.payment_link})\n\nReference: ${d.reference}`;
        } else if (d.type === "manual" && d.bank_details) {
          responseMsg = `Here's your order summary:\n\n${orderSummary}\n\n**Total: ${sym}${totalAmount.toLocaleString()}**\n\nPlease make a bank transfer to:\n🏦 **${d.bank_details.bank_name}**\n📋 Account: **${d.bank_details.account_number}**\n👤 Name: **${d.bank_details.account_name}**\n\nReference: ${d.reference}\n${d.bank_details.instructions ? `\n${d.bank_details.instructions}` : ""}\n\nPlease send proof of payment after transferring.`;
        } else {
          responseMsg = `Order created! Summary:\n\n${orderSummary}\n\n**Total: ${sym}${totalAmount.toLocaleString()}**\n\nPayment is being processed. Reference: ${d.reference}`;
        }
      } else {
        responseMsg = `I've prepared your order:\n\n${orderSummary}\n\n**Total: ${sym}${totalAmount.toLocaleString()}**\n\nHowever, ${checkoutResult.error || "payment is currently unavailable"}. Please try again shortly or contact us directly.`;
      }

      if (activeConvoId) {
        await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: responseMsg });
      }

      return new Response(JSON.stringify({ reply: responseMsg, conversationId: activeConvoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool call — stream the regular AI response
    // Re-call with streaming enabled
    const streamProvider = orderedProviders.find(p => p.name === usedProvider) || orderedProviders[0];
    const streamApiKey = Deno.env.get(streamProvider.envKey);

    if (!streamApiKey) {
      const content = choice?.message?.content || "How can I help you today?";
      if (activeConvoId) await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content });
      return new Response(JSON.stringify({ reply: content, conversationId: activeConvoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we already have a non-streamed content, just return it
    if (choice?.message?.content) {
      const content = choice.message.content;

      // Check if non-tool-calling provider — stream for UX
      const streamModel = streamProvider.name === "openai" ? preferredModel :
        streamProvider.name === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

      const streamResp = await fetch(streamProvider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${streamApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: streamModel, messages: aiMessages, stream: true }),
      });

      if (!streamResp.ok || !streamResp.body) {
        if (activeConvoId) await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content });
        return new Response(JSON.stringify({ reply: content, conversationId: activeConvoId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const reader = streamResp.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n")) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try { const p = JSON.parse(line.slice(6)); const c = p.choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
            }
          }
        } finally {
          if (activeConvoId && fullContent) {
            await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: fullContent });
          }
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": activeConvoId || "", "X-AI-Provider": usedProvider },
      });
    }

    // Fallback
    const fallback = "What are you looking to buy today? 😊";
    if (activeConvoId) await supabase.from("chat_messages").insert({ conversation_id: activeConvoId, role: "assistant", content: fallback });
    return new Response(JSON.stringify({ reply: fallback, conversationId: activeConvoId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
