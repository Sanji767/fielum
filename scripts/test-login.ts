import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const email = 'mohamedelabyad56@gmail.com';
  const password = 'A123456678a';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('❌ Sign‑in error:', error.message);
  } else {
    console.log('✅ Sign‑in succeeded, access token starts:', data.session?.access_token?.slice(0, 20) ?? 'none');
    console.log('User ID:', data.user?.id);
  }
}

main()
  .catch((e) => console.error('❌ Unexpected error:', e))
  .finally(() => process.exit());
