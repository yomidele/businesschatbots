import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_FIELDS = "id, name, url, slug, user_id, show_chat_on_landing_page, chat_mode, show_products_on_landing, welcome_message, ai_provider, ai_model, currency, industry, store_type, auth_required, wallet_enabled, payment_mode, api_config";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const websiteId = url.searchParams.get("id");

    if (!websiteId) {
      return new Response(JSON.stringify({ success: false, error: "id parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch site by ID or slug
    let { data: site, error: siteError } = await supabase
      .from("sites")
      .select(SITE_FIELDS)
      .eq("id", websiteId)
      .single();

    if (siteError || !site) {
      const { data: siteBySlug, error: slugError } = await supabase
        .from("sites")
        .select(SITE_FIELDS)
        .eq("slug", websiteId)
        .single();

      if (slugError || !siteBySlug) {
        return new Response(JSON.stringify({ success: false, error: "Website not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      site = siteBySlug;
    }

    // Fetch theme, products, payment config in parallel
    const [themeResult, productsResult, paymentConfigResult, manualConfigResult] = await Promise.all([
      supabase.from("chatbot_themes").select("primary_color, secondary_color, background_color, text_color, button_color").eq("site_id", site.id).single(),
      supabase.from("products").select("id, name, description, price, image_url, category, stock").eq("site_id", site.id).order("created_at", { ascending: false }),
      supabase.from("payment_configs").select("id, provider").eq("site_id", site.id).eq("is_active", true).single(),
      supabase.from("manual_payment_config").select("bank_name, account_name, account_number, instructions").eq("site_id", site.id).single(),
    ]);

    let paymentMode = "none";
    if (paymentConfigResult.data) paymentMode = "gateway";
    else if (manualConfigResult.data) paymentMode = "manual";

    return new Response(JSON.stringify({
      success: true,
      website: {
        id: site.id,
        tenant_id: site.user_id,
        name: site.name,
        url: site.url,
        slug: site.slug,
        currency: site.currency,
        industry: site.industry,
        welcome_message: site.welcome_message,
        store_config: {
          store_type: site.store_type || "storefront",
          auth_required: site.auth_required || false,
          wallet_enabled: site.wallet_enabled || false,
          payment_mode: site.payment_mode || "direct",
          api_config: site.api_config || null,
        },
        chatbot_config: {
          enabled: site.show_chat_on_landing_page !== false,
          mode: site.chat_mode || "sales",
          ai_provider: site.ai_provider,
          ai_model: site.ai_model,
          welcome_message: site.welcome_message,
        },
        theme: themeResult.data || null,
        products: productsResult.data || [],
        payment: {
          mode: paymentMode,
          manual_config: manualConfigResult.data || null,
        },
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-website error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
