/**
 * Helper to bypass strict table typing for tables that exist in the database
 * but aren't yet reflected in the auto-generated types.
 * Usage: supabaseFrom('sites') instead of supabase.from('sites')
 */
import { supabase } from "@/lib/supabase-external";

export function supabaseFrom(table: string) {
  return (supabase as any).from(table);
}

export function supabaseRpc(fn: string, args?: Record<string, any>) {
  return (supabase as any).rpc(fn, args);
}
