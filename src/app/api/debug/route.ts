import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // 1. Check env vars
  diagnostics.DATABASE_URL = process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "NOT SET";
  diagnostics.DIRECT_URL = process.env.DIRECT_URL ? "SET" : "NOT SET";
  diagnostics.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";
  diagnostics.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET";
  diagnostics.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET";

  // 2. Test DB connection
  try {
    const pg = require("pg");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    const result = await pool.query("SELECT 1 as test");
    diagnostics.db = { status: "OK", result: result.rows };
    await pool.end();
  } catch (e: unknown) {
    diagnostics.db = { status: "ERROR", message: (e as Error).message };
  }

  // 3. Test Prisma
  try {
    const { prisma } = require("@/lib/prisma");
    const count = await prisma.user.count();
    diagnostics.prisma = { status: "OK", userCount: count };
  } catch (e: unknown) {
    diagnostics.prisma = { status: "ERROR", message: (e as Error).message };
  }

  // 4. Test Supabase Auth
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
    diagnostics.supabase = error
      ? { status: "ERROR", message: error.message }
      : { status: "OK", userCount: data?.users?.length };
  } catch (e: unknown) {
    diagnostics.supabase = { status: "ERROR", message: (e as Error).message };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
