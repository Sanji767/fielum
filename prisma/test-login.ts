import dotenv from "dotenv";
import path from "path";
// Load .env.local variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "juan@serviciosclima.com";
const ADMIN_PASSWORD = "Password123!";

async function testLogin() {
  console.log("🔍 Testing Supabase client authentication programmatically...");
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log(`Attempting to sign in as ${ADMIN_EMAIL}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    console.error("❌ Authentication failed!");
    console.error("Error Message:", error.message);
    console.error("Error Code:", error.status || "no status code");
  } else {
    console.log("✅ Authentication successful!");
    console.log("User UID:", data.user?.id);
    console.log("Session token exists:", !!data.session?.access_token);
  }
}

testLogin();
