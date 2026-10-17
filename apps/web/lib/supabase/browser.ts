import { createClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client, with the publishable key only. Screens use it to hear which
 * area changed (spec section 13); every number still comes from the API. Null when the keys are
 * not set, and the screens then refresh on their timer alone.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
