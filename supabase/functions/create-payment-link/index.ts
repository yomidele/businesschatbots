import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

interface OrderPayload {
  site_id: string;
  items: CartItem[];
  total_amount: number;
  currency?: string;
  description?: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  conversation_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: OrderPayload = await req.json();
    const { site_id, items, customer_email, customer_name, customer_phone, conversation_id, description } = body;

    // ── VALIDATION ──
    if (!site_id || !customer_email) {
      return new Response(JSON.stringify({ error: "site_id and customer_email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array is required and must not be empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.name || typeof item.unit_price !== "number" || typeof item.quantity !== "number" || item.quantity < 1) {
        return new Response(JSON.stringify({ error: `Invalid item: ${JSON.stringify(item)}. Each item needs name, unit_price, and quantity >= 1` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── SERVER-SIDE TOTAL CALCULATION (never trust client) ──
    const calculatedTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    if (calculatedTotal <= 0) {
      return new Response(JSON.stringify({ error: "Total amount must be greater than zero" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── FETCH SITE + CURRENCY ──
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, currency, name")
      .eq("id", site_id)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currency = site.currency || "NGN";

    // ── FETCH PAYMENT CONFIG ──
    const { data: paymentConfig, error: configError } = await supabase
      .from("payment_configs")
      .select("secret_key, public_key, provider")
      .eq("site_id", site_id)
      .eq("is_active", true)
      .single();

    if (configError || !paymentConfig?.secret_key) {
      // Fallback: check manual payment
      const { data: manualConfig } = await supabase
        .from("manual_payment_config")
        .select("bank_name, account_name, account_number, instructions")
        .eq("site_id", site_id)
        .single();

      if (manualConfig) {
        // Create order with manual payment
        const reference = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const orderDesc = description || items.map(i => `${i.quantity}x ${i.name}`).join(", ");

        const { data: order, error: orderError } = await supabase.from("orders").insert({
          site_id,
          customer_name: customer_name || "Customer",
          customer_email,
          customer_phone,
          total_amount: calculatedTotal,
          payment_status: "pending",
          payment_reference: reference,
          conversation_id: conversation_id || null,
        }).select("id").single();

        if (orderError) {
          console.error("Order insert error:", orderError);
          return new Response(JSON.stringify({ error: "Failed to create order" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          type: "manual",
          reference,
          amount: calculatedTotal,
          currency,
          order_id: order.id,
          items,
          description: orderDesc,
          bank_details: {
            bank_name: manualConfig.bank_name,
            account_name: manualConfig.account_name,
            account_number: manualConfig.account_number,
            instructions: manualConfig.instructions,
          },
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "No payment method configured for this business" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GENERATE UNIQUE REFERENCE ──
    const reference = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderDesc = description || items.map(i => `${i.quantity}x ${i.name}`).join(", ");

    // ── CREATE ORDER RECORD FIRST ──
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      site_id,
      customer_name: customer_name || "Customer",
      customer_email,
      customer_phone,
      total_amount: calculatedTotal,
      payment_status: "pending",
      payment_reference: reference,
      conversation_id: conversation_id || null,
    }).select("id").single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CALL PAYMENT PROVIDER ──
    let paymentLink: string | null = null;

    if (paymentConfig.provider === "paystack") {
      const paystackAmount = Math.round(calculatedTotal * 100); // kobo
      const resp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paymentConfig.secret_key}`,
        },
        body: JSON.stringify({
          email: customer_email,
          amount: paystackAmount,
          currency,
          reference,
          metadata: {
            site_id,
            order_id: order.id,
            customer_name: customer_name || "Customer",
            items,
            description: orderDesc,
          },
        }),
      });

      const data = await resp.json();
      if (data.status && data.data?.authorization_url) {
        paymentLink = data.data.authorization_url;
      } else {
        console.error("Paystack error:", data);
        // Update order to failed
        await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
        const providerMessage = typeof data.message === "string" ? data.message : "Unable to initialize payment";
        const isCurrencyMismatch = providerMessage.toLowerCase().includes("currency not supported");

        return new Response(JSON.stringify({
          error: isCurrencyMismatch
            ? `The selected currency (${currency}) is not supported by this Paystack account`
            : "Payment provider error",
          details: providerMessage,
        }), {
          status: isCurrencyMismatch ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (paymentConfig.provider === "flutterwave") {
      const resp = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paymentConfig.secret_key}`,
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: calculatedTotal,
          currency,
          customer: {
            email: customer_email,
            name: customer_name || "Customer",
            phonenumber: customer_phone || "",
          },
          meta: {
            site_id,
            order_id: order.id,
            items,
          },
          redirect_url: `https://businesschatbots.lovable.app/payment-complete?ref=${reference}`,
        }),
      });

      const data = await resp.json();
      if (data.status === "success" && data.data?.link) {
        paymentLink = data.data.link;
      } else {
        console.error("Flutterwave error:", data);
        await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
        return new Response(JSON.stringify({ error: "Payment provider error", details: data.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: `Unsupported payment provider: ${paymentConfig.provider}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RETURN RESPONSE ──
    return new Response(JSON.stringify({
      type: "gateway",
      payment_link: paymentLink,
      reference,
      amount: calculatedTotal,
      currency,
      order_id: order.id,
      items,
      description: orderDesc,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
