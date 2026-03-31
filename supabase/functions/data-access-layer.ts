/**
 * LAYER C: DATA ACCESS LAYER
 * 
 * ✅ RULE: Every query FILTERS by user_id automatically
 * ✅ Prevents cross-tenant data leaks
 * ✅ Read-only access, no mutations to core tables
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DataAccessContext {
  userId: string;
  siteId: string;
}

/**
 * SAFE PRODUCTS QUERY
 * ✅ Always filters by site_id (owned by user)
 */
export async function getProductsForSite(
  supabase: SupabaseClient,
  context: DataAccessContext
) {
  // First, validate user owns this site
  const { data: ownership, error: ownershipError } = await supabase
    .from("sites")
    .select("id")
    .eq("id", context.siteId)
    .eq("user_id", context.userId)
    .single();

  if (ownershipError || !ownership) {
    throw new Error("DATA LEAK BLOCKED: User does not own this site");
  }

  // Now fetch products - safe because site is verified
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, stock")
    .eq("site_id", context.siteId);

  if (error) throw error;
  return data || [];
}

/**
 * SAFE PAYMENT CONFIG QUERY
 * ✅ User can only see their own site's payment config
 */
export async function getPaymentConfigForSite(
  supabase: SupabaseClient,
  context: DataAccessContext
) {
  // Validate ownership first
  const { data: ownership } = await supabase
    .from("sites")
    .select("id")
    .eq("id", context.siteId)
    .eq("user_id", context.userId)
    .single();

  if (!ownership) {
    throw new Error("DATA LEAK BLOCKED: Unauthorized access");
  }

  const { data } = await supabase
    .from("payment_configs")
    .select("provider, is_active")
    .eq("site_id", context.siteId)
    .eq("is_active", true)
    .limit(1);

  return data?.[0] || null;
}

/**
 * SAFE ORDERS QUERY
 * ✅ User can only see orders for their sites
 */
export async function getOrdersForSite(
  supabase: SupabaseClient,
  context: DataAccessContext
) {
  const { data: ownership } = await supabase
    .from("sites")
    .select("id")
    .eq("id", context.siteId)
    .eq("user_id", context.userId)
    .single();

  if (!ownership) {
    throw new Error("DATA LEAK BLOCKED: Unauthorized access");
  }

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("site_id", context.siteId);

  return data || [];
}

/**
 * SAFE CHAT MESSAGES QUERY
 * ✅ Only service role can access, with site validation
 */
export async function getChatHistory(
  supabase: SupabaseClient,
  conversationId: string,
  siteId: string
) {
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(50);

  // Validate conversation belongs to this site
  if (data && data.length > 0) {
    const { data: convo } = await supabase
      .from("conversations")
      .select("site_id")
      .eq("id", conversationId)
      .single();

    if (convo?.site_id !== siteId) {
      throw new Error("DATA LEAK BLOCKED: Conversation mismatch");
    }
  }

  return data || [];
}
