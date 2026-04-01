import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(JSON.stringify({ error: "slug parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve slug to site
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select(
        `
        id,
        name,
        url,
        slug,
        show_chat_on_landing_page,
        chat_mode,
        show_products_on_landing,
        welcome_message,
        ai_provider,
        ai_model,
        currency,
        industry
      `
      )
      .eq("slug", slug)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch products for this site
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, category, stock")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Products fetch error:", productsError);
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check payment mode - detect if Paystack config exists
    const { data: paymentConfig } = await supabase
      .from("payment_configs")
      .select("id, provider")
      .eq("site_id", site.id)
      .eq("provider", "paystack")
      .eq("is_active", true)
      .single();

    // Check if manual payment config exists
    const { data: manualConfig } = await supabase
      .from("manual_payment_config")
      .select("id, bank_name, account_name, account_number, instructions")
      .eq("site_id", site.id)
      .single();

    // Determine payment mode
    let paymentMode = "none";
    if (paymentConfig) {
      paymentMode = "gateway";
    } else if (manualConfig) {
      paymentMode = "manual";
    }

    const response = {
      business: {
        id: site.id,
        name: site.name,
        url: site.url,
        slug: site.slug,
        welcome_message: site.welcome_message,
        currency: site.currency,
        industry: site.industry,
      },
      chat: {
        enabled: site.show_chat_on_landing_page,
        mode: site.chat_mode,
        welcome_message: site.welcome_message,
        ai_provider: site.ai_provider,
        ai_model: site.ai_model,
      },
      products: site.show_products_on_landing ? products || [] : [],
      payment: {
        mode: paymentMode,
        manual_config: manualConfig || null,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
