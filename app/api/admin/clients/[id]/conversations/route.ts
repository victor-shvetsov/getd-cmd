import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clients/[id]/conversations
 *
 * Returns:
 *   - stats: aggregate counts for the AI Voice Training corpus card
 *   - threads: per-contact groupings (email, count, last activity)
 *   - recent: last 50 conversations ordered by sent_at desc
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const supabase = createAdminClient();

  // Load all conversations for this client
  const { data: rows, error } = await supabase
    .from("lead_conversations")
    .select("id, direction, from_email, to_email, subject, content, was_ai_generated, was_edited, sent_at, lead_id, automation_run_id")
    .eq("client_id", clientId)
    .order("sent_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[conversations] DB error:", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }

  const all = rows ?? [];

  // ── Stats ─────────────────────────────────────────────────────────────
  const inboundRows = all.filter((r) => r.direction === "inbound");
  const outboundRows = all.filter((r) => r.direction === "outbound");
  const aiGeneratedRows = outboundRows.filter((r) => r.was_ai_generated);
  const aiEditedRows = aiGeneratedRows.filter((r) => r.was_edited);

  const stats = {
    total_conversations: all.length,
    inbound: inboundRows.length,
    outbound: outboundRows.length,
    ai_generated: aiGeneratedRows.length,
    ai_edited: aiEditedRows.length,
  };

  // ── Threads: group by contact email (from_email of inbound messages) ──
  const threadMap = new Map<
    string,
    { email: string; inbound: number; outbound: number; last_at: string }
  >();

  for (const row of all) {
    // For grouping, use the "other party's" email
    const contactEmail = row.direction === "inbound" ? row.from_email : row.to_email;
    const existing = threadMap.get(contactEmail);
    if (!existing) {
      threadMap.set(contactEmail, {
        email: contactEmail,
        inbound: row.direction === "inbound" ? 1 : 0,
        outbound: row.direction === "outbound" ? 1 : 0,
        last_at: row.sent_at,
      });
    } else {
      if (row.direction === "inbound") existing.inbound++;
      else existing.outbound++;
      // Keep the most recent timestamp
      if (row.sent_at > existing.last_at) existing.last_at = row.sent_at;
    }
  }

  const threads = [...threadMap.values()].sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  );

  // ── Recent conversations (last 50) ────────────────────────────────────
  const recent = all.slice(0, 50);

  return NextResponse.json({ stats, threads, recent });
}
