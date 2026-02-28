import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/clients/migrate-pins
 *
 * One-time migration: hashes all plaintext PINs that don't have a pin_hash yet.
 * Safe to call multiple times — only processes clients where pin_hash IS NULL.
 * Returns { migrated: number } — the count of PINs that were hashed.
 *
 * Call this once after deploying the bcrypt update, then forget about it.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch clients that still have plaintext PINs (pin_hash not yet set)
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, pin")
    .is("pin_hash", null)
    .not("pin", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let migrated = 0;

  for (const client of clients ?? []) {
    if (!client.pin) continue;
    const pin_hash = await bcrypt.hash(String(client.pin), 10);
    await supabase
      .from("clients")
      .update({ pin_hash })
      .eq("id", client.id);
    migrated++;
  }

  return NextResponse.json({ migrated });
}
