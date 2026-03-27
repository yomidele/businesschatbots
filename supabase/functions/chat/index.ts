import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { siteId, messages, conversationId } = await req.json();

    if (!siteId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "siteId and messages are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the latest user message for search
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const query = lastUserMsg?.content || "";

    // Search knowledge base
    const { data: chunks } = await supabase.rpc("search_knowledge", {
      p_site_id: siteId,
      p_query: query,
      p_limit: 5,
    });

    // Get site info
    const { data: site } = await supabase.from("sites").select("name, url").eq("id", siteId).single();

    // Build context from chunks
    let context = "";
    if (chunks && chunks.length > 0) {
      context = chunks.map((c: any) =>
        `[${c.category?.toUpperCase() || "INFO"}] ${c.title ? c.title + ": " : ""}${c.content}`
      ).join("\n\n---\n\n");
    }

    const systemPrompt = `You are a friendly, human-like customer support and sales assistant for "${site?.name || "this business"}" (${site?.url || ""}).

RULES:
- Use ONLY the provided website knowledge below to answer questions
- Be conversational, natural, and helpful — like a trained employee
- Keep responses short (1-3 sentences max) unless detail is needed
- If info is missing, say "I'm not completely sure about that, let me check" or suggest contacting the business
- NEVER invent pricing, services, or policies
- Guide users toward actions: buying, booking, inquiring, contacting
- Ask smart follow-up questions to help users
- Use light natural expressions and emojis sparingly 👍
- Never mention you're an AI or that you're using a knowledge base

WEBSITE KNOWLEDGE:
${context || "No specific information available for this query. Suggest the user contact the business directly."}`;

    // Call Lovable AI with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10), // Last 10 messages for context window
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store messages in conversation if conversationId provided
    if (conversationId && lastUserMsg) {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
