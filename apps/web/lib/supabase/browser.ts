import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * The browser's Supabase client, with the publishable key only. Screens use it to hear which
 * area changed (spec section 13); every number still comes from the API. One per page, since each
 * client starts its own auth listener. Null when the keys are not set, and the screens then
 * refresh on their timer alone.
 */
export function browserClient(): SupabaseClient | null {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    client =
      url && key
        ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;
  }
  return client;
}
