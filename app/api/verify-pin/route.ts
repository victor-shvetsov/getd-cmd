import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  const { slug, pin } = await request.json();

  if (!slug || !pin) {
    return NextResponse.json({ error: "Missing slug or pin" }, { status: 400 });
  }

  // Use admin client for rate-limit table (bypasses RLS) + client table reads
  const adminSupabase = createAdminClient();

  // ── Rate limit check ─────────────────────────────────────────────────
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await adminSupabase
    .from("pin_login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("slug", slug)
    .gte("attempted_at", windowStart);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${WINDOW_MINUTES} minutes.` },
      { status: 429 }
    );
  }

  // ── Fetch client (using RLS-respecting client for reads) ─────────────
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("pin, pin_hash")
    .eq("slug", slug)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── Verify PIN ────────────────────────────────────────────────────────
  let valid: boolean;
  if (client.pin_hash) {
    valid = await bcrypt.compare(String(pin), client.pin_hash);
  } else {
    // Legacy fallback: plaintext until PIN is next updated by admin
    valid = client.pin === String(pin);
  }

  if (!valid) {
    // Record failed attempt for rate limiting
    await adminSupabase
      .from("pin_login_attempts")
      .insert({ slug });

    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  // Success — clear attempts for this slug
  await adminSupabase
    .from("pin_login_attempts")
    .delete()
    .eq("slug", slug);

  return NextResponse.json({ success: true });
}
