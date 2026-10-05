import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * Supabase client with the secret key (the service role), which bypasses Row Level Security.
 * Server code only: route handlers, lib/ and scripts. Never import it from a client component.
 */
export function createServiceClient() {
  const env = supabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
