import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AI Provider configs — OpenAI primary, Groq fallback
const PROVIDERS = [
  { name: "openai", url: "https://api.openai.com/v1/chat/completions", envKey: "OPENAI_API_KEY" },
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", envKey: "GROQ_API_KEY" },
];

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
      .select("name, url, ai_provider, ai_model")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure conversation exists for persistence
    let activeConvoId = conversationId;
    if (!activeConvoId && visitorId) {
      // Try to find existing conversation for this visitor
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("site_id", siteId)
        .eq("visitor_id", visitorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConvo) {
        activeConvoId = existingConvo.id;
        await supabase.from("conversations").update({ updated_at: new Date().toISOString(), last_active_at: new Date().toISOString() }).eq("id", activeConvoId);
      } else {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({ site_id: siteId, visitor_id: visitorId })
          .select("id")
          .single();
        activeConvoId = newConvo?.id;
      }
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const query = lastUserMsg?.content || "";

    // Search knowledge base
    const { data: chunks } = await supabase.rpc("search_knowledge", {
      p_site_id: siteId, p_query: query, p_limit: 5,
    });

    // Search products for this site
    const { data: products } = await supabase
      .from("products")
      .select("name, description, price, image_url, category, stock")
      .eq("site_id", siteId)
      .limit(20);

    // Build context
    let knowledgeContext = "";
    if (chunks && chunks.length > 0) {
      knowledgeContext = chunks.map((c: any) =>
        `[${c.category?.toUpperCase() || "INFO"}] ${c.title ? c.title + ": " : ""}${c.content}`
      ).join("\n\n---\n\n");
    }

    let productContext = "";
    if (products && products.length > 0) {
      productContext = "\n\nAVAILABLE PRODUCTS/SERVICES:\n" + products.map((p: any) =>
        `- ${p.name} | ${p.price ? `$${p.price}` : "Price on inquiry"} | ${p.category || "General"}${p.description ? ` | ${p.description.slice(0, 100)}` : ""}${p.image_url ? ` | Image: ${p.image_url}` : ""}${p.stock !== null ? ` | Stock: ${p.stock}` : ""}`
      ).join("\n");
    }

    const systemPrompt = `You are a high-conversion sales assistant for "${site.name || "this business"}" (${site.url || ""}).

CORE IDENTITY: You are a trained employee and sales expert. NEVER say you're an AI.

SALES RULES:
- Use ONLY the provided knowledge and product data below
- ALWAYS guide users toward purchasing, booking, or inquiring
- When showing products, include name, price, and description
- If a user shows interest, collect: Name, Phone, Address, Quantity
- NEVER say "I'm not sure", "contact support", or "check the website"
- NEVER invent products, prices, or policies
- Keep responses short (2-4 sentences) unless showing products
- Use natural, conversational language with light emojis 👍
- Ask smart follow-up questions to close the sale

SALES FLOW:
1. DISCOVER → Show 3-5 relevant products
2. SELECT → Ask quantity & preferences
3. COLLECT → Get customer details (name, phone, address)
4. CLOSE → Confirm order details and guide to payment

WEBSITE KNOWLEDGE:
${knowledgeContext || "No specific knowledge available."}
${productContext || "No products catalogued yet."}`;

    // Store user message
    if (activeConvoId && lastUserMsg) {
      await supabase.from("chat_messages").insert({
        conversation_id: activeConvoId,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    // AI Router — try preferred provider first, then fallback
    const preferredProvider = site.ai_provider || "openai";
    const preferredModel = site.ai_model || "gpt-4o-mini";

    // Build ordered provider list: preferred first, then others
    const orderedProviders = [
      ...PROVIDERS.filter(p => p.name === preferredProvider),
      ...PROVIDERS.filter(p => p.name !== preferredProvider),
    ];

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

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
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages: aiMessages, stream: true }),
        });

        if (resp.ok) {
          aiResponse = resp;
          usedProvider = provider.name;
          console.log(`AI Router: Using ${provider.name}/${model}`);
          break;
        }

        console.error(`${provider.name} failed: ${resp.status}`);
      } catch (err) {
        console.error(`${provider.name} error:`, err);
      }
    }

    // If all AI providers fail, return cached product data
    if (!aiResponse) {
      let fallbackMsg = "Here are the available options I found for you:\n\n";
      if (products && products.length > 0) {
        fallbackMsg += products.slice(0, 5).map((p: any) =>
          `**${p.name}** — ${p.price ? `$${p.price}` : "Contact for pricing"}\n${p.description?.slice(0, 80) || ""}`
        ).join("\n\n");
        fallbackMsg += "\n\nWould you like more details on any of these?";
      } else {
        fallbackMsg = "I'm experiencing a brief delay. Please try again in a moment! 🙏";
      }

      // Store fallback as assistant message
      if (activeConvoId) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConvoId, role: "assistant", content: fallbackMsg,
        });
      }

      return new Response(JSON.stringify({ reply: fallbackMsg, conversationId: activeConvoId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response, but also collect for storage
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

          // Parse SSE to collect content
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullAssistantContent += content;
            } catch {}
          }
        }
      } finally {
        // Store complete assistant message
        if (activeConvoId && fullAssistantContent) {
          await supabase.from("chat_messages").insert({
            conversation_id: activeConvoId, role: "assistant", content: fullAssistantContent,
          });
        }
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": activeConvoId || "",
        "X-AI-Provider": usedProvider,
      },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
