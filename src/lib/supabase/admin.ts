import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the Service Role key.
 * This client bypasses RLS and can perform administrative actions (like creating auth users directly).
 * ONLY use on the server side in secure contexts (APIs / Server Actions).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
