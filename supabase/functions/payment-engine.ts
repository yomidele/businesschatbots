/**
 * LAYER B: PAYMENT ENGINE SERVICE
 * 
 * ✅ RULE: This is the ONLY place where payment logic lives
 * ✅ Single source of truth for all payment operations
 * ✅ AI CANNOT call payment functions directly - must use this layer
 * ✅ Ensures real payment links only (no hallucination)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PaymentConfig {
  provider: string;
  public_key: string;
  is_active: boolean;
}

export interface ManualPaymentConfig {
  bank_name: string;
  account_name: string;
  account_number: string;
  instructions?: string;
}

export interface PaymentInstructions {
  type: "gateway" | "manual" | "none";
  gateway?: {
    provider: string;
    paymentUrl?: string;
  };
  manual?: ManualPaymentConfig;
  error?: string;
}

/**
 * Get payment instructions for a specific site
 * ✅ RULE: ALWAYS filter by site_id (no cross-tenant leaks)
 * ✅ Returns REAL config only, never fabricated
 */
export async function getPaymentInstructions(
  supabase: SupabaseClient,
  siteId: string
): Promise<PaymentInstructions> {
  // SECURITY: Always validate site exists first
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .single();

  if (siteError || !site) {
    return { type: "none", error: "Site not found" };
  }

  try {
    // Check for active payment gateway
    const { data: gateway, error: gatewayError } = await supabase
      .from("payment_configs")
      .select("provider, public_key, is_active")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .single();

    if (!gatewayError && gateway) {
      return {
        type: "gateway",
        gateway: {
          provider: gateway.provider,
          // IMPORTANT: Public key only - secret stays on backend
        },
      };
    }

    // Fallback: Check for manual payment config
    const { data: manual, error: manualError } = await supabase
      .from("manual_payment_config")
      .select("bank_name, account_name, account_number, instructions")
      .eq("site_id", siteId)
      .single();

    if (!manualError && manual) {
      return {
        type: "manual",
        manual: {
          bank_name: manual.bank_name,
          account_name: manual.account_name,
          account_number: manual.account_number,
          instructions: manual.instructions,
        },
      };
    }

    // No payment method configured
    return {
      type: "none",
      error: "No payment method configured for this business",
    };
  } catch (error) {
    console.error("Payment engine error:", error);
    return {
      type: "none",
      error: "Error retrieving payment configuration",
    };
  }
}

/**
 * Create payment link via Paystack
 * ✅ Backend-only operation (never expose to AI)
 * ✅ Requires real payment config
 */
export async function createPaystackLink(
  supabase: SupabaseClient,
  siteId: string,
  amount: number,
  customerEmail: string
): Promise<{ url: string; reference: string } | null> {
  const { data: config } = await supabase
    .from("payment_configs")
    .select("secret_key")
    .eq("site_id", siteId)
    .eq("provider", "paystack")
    .eq("is_active", true)
    .single();

  if (!config) {
    return null;
  }

  try {
    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secret_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to kobo
        email: customerEmail,
        metadata: { siteId },
      }),
    });

    const data = await resp.json();
    if (data.status) {
      return {
        url: data.data.authorization_url,
        reference: data.data.reference,
      };
    }
    return null;
  } catch (error) {
    console.error("Paystack error:", error);
    return null;
  }
}

/**
 * Validate data isolation - prevent cross-tenant leaks
 * ✅ Call this in every data fetch
 */
export async function validateSiteOwnership(
  supabase: SupabaseClient,
  siteId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sites")
    .select("user_id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}
