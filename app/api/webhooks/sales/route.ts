import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

const WEBHOOK_SECRET = process.env.SALES_WEBHOOK_SECRET ?? "";

/**
 * POST /api/webhooks/sales
 *
 * Webhook endpoint for pushing sales/invoice data from any external source.
 * Accepts a single entry or a batch of entries.
 *
 * ── Authentication ──
 * Header:  Authorization: Bearer <SALES_WEBHOOK_SECRET>
 *
 * ── Multi-tenant ──
 * Each entry MUST include `client_slug` (the URL slug for the client).
 * The endpoint resolves slug -> client_id internally.
 *
 * ── Deduplication ──
 * If `external_ref` is provided (e.g. invoice number), the endpoint will
 * skip entries that already exist for that client + ref combo. This makes
 * it safe to call on a cron schedule without duplicating data.
 *
 * ── Payload (single) ──
 * {
 *   "client_slug": "lucaffe",
 *   "amount": 35000,
 *   "currency": "DKK",
 *   "category_name": "Automatic machines",
 *   "customer_name": "Lars Hansen",
 *   "description": "DeLonghi Magnifica Evo",
 *   "external_ref": "INV-2026-0047",
 *   "source": "online",           // optional -- null = untagged (client tags it)
 *   "sold_at": "2026-02-25T14:30:00Z",
 *   "note": "Paid via MobilePay"   // optional
 * }
 *
 * ── Payload (batch) ──
 * {
 *   "entries": [
 *     { "client_slug": "lucaffe", "amount": 35000, ... },
 *     { "client_slug": "lucaffe", "amount": 4500, ... }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  // ── Auth ──
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "SALES_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──
  const body = await req.json();
  const topLevelSlug: string | undefined = body.client_slug;
  const rawEntries: RawEntry[] = Array.isArray(body.entries)
    ? body.entries.map((e: RawEntry) => ({ ...e, client_slug: e.client_slug || topLevelSlug }))
    : [body];

  if (rawEntries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Resolve all unique slugs -> client IDs (cached) ──
  const uniqueSlugs = [...new Set(rawEntries.map((e) => e.client_slug))];
  const slugMap: Record<string, string> = {};

  for (const slug of uniqueSlugs) {
    if (!slug) continue;
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .single();
    if (data) slugMap[slug] = data.id;
  }

  // ── Process entries ──
  const results: EntryResult[] = [];

  for (const entry of rawEntries) {
    const clientId = slugMap[entry.client_slug];

    if (!clientId) {
      results.push({
        external_ref: entry.external_ref ?? null,
        status: "error",
        reason: `Unknown client_slug: "${entry.client_slug}"`,
      });
      continue;
    }

    if (!entry.amount || Number(entry.amount) <= 0) {
      results.push({
        external_ref: entry.external_ref ?? null,
        status: "error",
        reason: "amount must be a positive number",
      });
      continue;
    }

    // ── Dedup by external_ref ──
    if (entry.external_ref) {
      const { data: existing } = await supabase
        .from("sales_entries")
        .select("id")
        .eq("client_id", clientId)
        .eq("external_ref", entry.external_ref)
        .maybeSingle();

      if (existing) {
        results.push({
          external_ref: entry.external_ref,
          status: "skipped",
          reason: "duplicate external_ref",
        });
        continue;
      }
    }

    // ── Insert ──
    const { error } = await supabase.from("sales_entries").insert({
      client_id: clientId,
      amount: Number(entry.amount),
      currency: entry.currency || "DKK",
      category_name: entry.category_name || "Other",
      customer_name: entry.customer_name || null,
      description: entry.description || null,
      external_ref: entry.external_ref || null,
      source: entry.source || null, // null = untagged
      note: entry.note || null,
      sold_at: entry.sold_at || new Date().toISOString(),
    });

    if (error) {
      results.push({
        external_ref: entry.external_ref ?? null,
        status: "error",
        reason: error.message,
      });
    } else {
      results.push({
        external_ref: entry.external_ref ?? null,
        status: "created",
        reason: null,
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    summary: { total: results.length, created, skipped, errors },
    results,
  });
}

// ── Types ──

interface RawEntry {
  client_slug: string;
  amount: number;
  currency?: string;
  category_name?: string;
  customer_name?: string;
  description?: string;
  external_ref?: string;
  source?: string | null;
  note?: string;
  sold_at?: string;
}

interface EntryResult {
  external_ref: string | null;
  status: "created" | "skipped" | "error";
  reason: string | null;
}
