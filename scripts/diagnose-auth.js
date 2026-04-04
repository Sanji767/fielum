const { createClient } = require('@supabase/supabase-js');

// Read env manually since ts-node may not load .env.local
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- Config ---');
console.log('URL:', url);
console.log('Service key starts:', serviceKey?.slice(0, 15) + '...');
console.log('Anon key starts:', anonKey?.slice(0, 15) + '...');

async function main() {
  // 1. List users with service role
  const admin = createClient(url, serviceKey);
  
  console.log('\n--- Listing Auth users ---');
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error('List error:', listErr.message);
  } else {
    console.log('Total users:', listData.users.length);
    listData.users.forEach(u => {
      console.log(`  - ${u.email} | id: ${u.id} | confirmed: ${!!u.email_confirmed_at}`);
    });
  }

  // 2. Try to create user
  const email = 'mohamedelabyad56@gmail.com';
  const password = 'A123456678a';

  console.log('\n--- Creating user ---');
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (createErr) {
    console.log('Create result:', createErr.message);
  } else {
    console.log('Created user:', createData.user?.id);
  }

  // 3. Test sign-in with anon key (like the browser does)
  console.log('\n--- Testing sign-in ---');
  const client = createClient(url, anonKey);
  const { data: signData, error: signErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signErr) {
    console.error('Sign-in FAILED:', signErr.message);
  } else {
    console.log('Sign-in OK! User ID:', signData.user?.id);
    console.log('Session token starts:', signData.session?.access_token?.slice(0, 20));
  }
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => process.exit());
