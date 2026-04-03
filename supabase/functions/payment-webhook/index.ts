import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PAYMENT WEBHOOK VERIFICATION
 * Handles callbacks from Paystack and Flutterwave
 * 
 * Flow:
 * 1. Receive event
 * 2. Check for duplicate event_id
 * 3. Find order with site_id validation
 * 4. Verify with gateway API
 * 5. Update order + payment status
 */

// Paystack signature verification
async function verifyPaystackSignature(body: string, signature: string, secretKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hash === signature;
}

// Verify payment with Paystack API
async function verifyPaystackPayment(reference: string, secretKey: string) {
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status && data.data?.status === "success") {
    return { verified: true, amount: data.data.amount / 100, currency: data.data.currency, metadata: data.data.metadata };
  }
  return { verified: false };
}

// Verify payment with Flutterwave API
async function verifyFlutterwavePayment(transactionId: string, secretKey: string) {
  const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status === "success" && data.data?.status === "successful") {
    return { verified: true, amount: data.data.amount, currency: data.data.currency, metadata: data.data.meta };
  }
  return { verified: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Detect provider from URL path or headers
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "paystack";

    let eventId: string;
    let reference: string;
    let siteId: string | null = null;
    let orderId: string | null = null;
    let eventData: any;

    if (provider === "paystack") {
      // ── PAYSTACK WEBHOOK ──
      eventData = JSON.parse(rawBody);
      eventId = String(eventData.data?.id || eventData.data?.reference || Date.now());
      reference = eventData.data?.reference || "";
      siteId = eventData.data?.metadata?.site_id || null;
      orderId = eventData.data?.metadata?.order_id || null;

      // Only process charge.success events
      if (eventData.event !== "charge.success") {
        return new Response(JSON.stringify({ status: "ignored", reason: "not charge.success" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify Paystack signature if we have the secret
      if (siteId) {
        const { data: payConfig } = await supabase
          .from("payment_configs")
          .select("secret_key")
          .eq("site_id", siteId)
          .eq("provider", "paystack")
          .eq("is_active", true)
          .single();

        if (payConfig?.secret_key) {
          const paystackSig = req.headers.get("x-paystack-signature") || "";
          const valid = await verifyPaystackSignature(rawBody, paystackSig, payConfig.secret_key);
          if (!valid) {
            console.error("[WEBHOOK] Invalid Paystack signature");
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
              status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Gateway verification
          const verification = await verifyPaystackPayment(reference, payConfig.secret_key);
          if (!verification?.verified) {
            console.error("[WEBHOOK] Paystack gateway verification failed for", reference);
            return new Response(JSON.stringify({ error: "Payment verification failed" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

    } else if (provider === "flutterwave") {
      // ── FLUTTERWAVE WEBHOOK ──
      eventData = JSON.parse(rawBody);
      eventId = String(eventData.data?.id || eventData.id || Date.now());
      reference = eventData.data?.tx_ref || "";
      siteId = eventData.data?.meta?.site_id || null;
      orderId = eventData.data?.meta?.order_id || null;

      if (eventData.event !== "charge.completed" || eventData.data?.status !== "successful") {
        return new Response(JSON.stringify({ status: "ignored" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gateway verification
      if (siteId) {
        const { data: payConfig } = await supabase
          .from("payment_configs")
          .select("secret_key")
          .eq("site_id", siteId)
          .eq("provider", "flutterwave")
          .eq("is_active", true)
          .single();

        if (payConfig?.secret_key) {
          const verification = await verifyFlutterwavePayment(String(eventData.data?.id), payConfig.secret_key);
          if (!verification?.verified) {
            console.error("[WEBHOOK] Flutterwave verification failed");
            return new Response(JSON.stringify({ error: "Payment verification failed" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

    } else {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 5: PREVENT DUPLICATES ──
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (existing) {
      console.log(`[WEBHOOK] Duplicate event ${eventId}, skipping`);
      return new Response(JSON.stringify({ status: "duplicate", event_id: eventId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: FIND ORDER ──
    let order: any = null;

    if (orderId && siteId) {
      const { data } = await supabase
        .from("orders")
        .select("id, total_amount, payment_status, site_id")
        .eq("id", orderId)
        .eq("site_id", siteId)
        .single();
      order = data;
    }

    // Fallback: find by payment_reference
    if (!order && reference) {
      const { data } = await supabase
        .from("orders")
        .select("id, total_amount, payment_status, site_id")
        .eq("payment_reference", reference)
        .single();
      order = data;
    }

    // ── STEP 2: REJECT IF MISMATCH ──
    if (!order) {
      console.error(`[WEBHOOK] No matching order for ref=${reference}, orderId=${orderId}, siteId=${siteId}`);

      // Still record the event to prevent reprocessing
      await supabase.from("webhook_events").insert({
        event_id: eventId,
        provider,
        site_id: siteId || "00000000-0000-0000-0000-000000000000",
        order_id: null,
        payload: eventData,
      });

      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already paid
    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid", order_id: order.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 4: UPDATE ORDER ──
    await supabase.from("orders").update({
      payment_status: "paid",
      status: "processing",
    }).eq("id", order.id).eq("site_id", order.site_id);

    // Update payments table too
    await supabase.from("payments").update({
      status: "paid",
    }).eq("reference", reference);

    // ── RECORD WEBHOOK EVENT ──
    await supabase.from("webhook_events").insert({
      event_id: eventId,
      provider,
      site_id: order.site_id,
      order_id: order.id,
      payload: eventData,
    });

    console.log(`[WEBHOOK] ✅ Order ${order.id} marked as PAID via ${provider}`);

    return new Response(JSON.stringify({
      status: "success",
      order_id: order.id,
      payment_status: "paid",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
