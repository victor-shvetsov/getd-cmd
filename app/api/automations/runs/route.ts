import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * GET /api/automations/runs?automation_id=...&limit=20
 *
 * Returns recent automation_runs for a given automation.
 * Admin auth required.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const automationId = searchParams.get("automation_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  if (!automationId) {
    return NextResponse.json({ error: "automation_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("automation_runs")
    .select("id, status, input_summary, output_summary, error, ran_at, process_after")
    .eq("automation_id", automationId)
    .order("ran_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[automations/runs]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}
