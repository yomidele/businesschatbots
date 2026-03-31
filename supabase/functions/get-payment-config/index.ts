import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || url.searchParams.get("site_id");

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate site exists
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, name, user_id")
      .eq("id", tenantId)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch active payment gateway config
    const { data: gatewayConfig } = await supabase
      .from("payment_configs")
      .select("provider, public_key, secret_key, is_active")
      .eq("site_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (gatewayConfig) {
      return new Response(
        JSON.stringify({
          type: "gateway",
          provider: gatewayConfig.provider,
          public_key: gatewayConfig.public_key,
          secret_key: gatewayConfig.secret_key,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to manual payment config
    const { data: manualConfig } = await supabase
      .from("manual_payment_config")
      .select("bank_name, account_name, account_number, instructions")
      .eq("site_id", tenantId)
      .single();

    if (manualConfig) {
      return new Response(
        JSON.stringify({
          type: "manual",
          bank_name: manualConfig.bank_name,
          account_name: manualConfig.account_name,
          account_number: manualConfig.account_number,
          instructions: manualConfig.instructions,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No payment config
    return new Response(
      JSON.stringify({
        type: "none",
        error: "No payment configuration found for this business",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching payment config:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
