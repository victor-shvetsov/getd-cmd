import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAutomation } from "@/lib/automations/registry";

/**
 * POST /api/automations/[key]/trigger
 *
 * External webhook entrypoint for triggering an automation.
 *
 * Authentication: Bearer token in Authorization header.
 * Token should be the AUTOMATION_WEBHOOK_SECRET env var.
 *
 * Body: arbitrary JSON — each automation defines its own expected payload shape.
 *
 * The route:
 *   1. Validates auth
 *   2. Resolves client from client_id or client_slug in the body
 *   3. Checks that the automation exists and is enabled
 *   4. Looks up client-specific config from the automations table
 *   5. Calls the automation's run() method
 *   6. Increments the counter and logs the run
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = process.env.AUTOMATION_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (!auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { key } = await params;
  const body = await req.json().catch(() => ({}));

  // ── Resolve client ────────────────────────────────────────────────────
  const clientId: string | undefined = body.client_id;
  const clientSlug: string | undefined = body.client_slug;

  if (!clientId && !clientSlug) {
    return NextResponse.json(
      { error: "client_id or client_slug required in body" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: client, error: clientError } = clientId
    ? await supabase.from("clients").select("id, slug").eq("id", clientId).single()
    : await supabase.from("clients").select("id, slug").eq("slug", clientSlug!).single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── Resolve automation ────────────────────────────────────────────────
  const { data: automationRow, error: automationError } = await supabase
    .from("automations")
    .select("id, is_enabled, config")
    .eq("client_id", client.id)
    .eq("automation_key", key)
    .single();

  if (automationError || !automationRow) {
    return NextResponse.json(
      { error: `Automation "${key}" not found for this client` },
      { status: 404 }
    );
  }

  if (!automationRow.is_enabled) {
    return NextResponse.json(
      { error: `Automation "${key}" is disabled` },
      { status: 200 } // 200, not an error — just skipped
    );
  }

  // ── Get handler ───────────────────────────────────────────────────────
  const automation = getAutomation(key);
  if (!automation) {
    return NextResponse.json(
      { error: `No handler registered for automation key "${key}"` },
      { status: 501 }
    );
  }

  // ── Run ───────────────────────────────────────────────────────────────
  const startedAt = Date.now();
  let result;

  try {
    result = await automation.run(body, {
      client_id: client.id,
      slug: client.slug,
      config: (automationRow.config as Record<string, unknown>) ?? {},
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[automation/${key}] Unhandled error:`, error);

    await supabase.from("automation_runs").insert({
      automation_id: automationRow.id,
      client_id: client.id,
      status: "error",
      input_summary: JSON.stringify(body).slice(0, 500),
      error,
    });

    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }

  // ── Log the run ───────────────────────────────────────────────────────
  await supabase.from("automation_runs").insert({
    automation_id: automationRow.id,
    client_id: client.id,
    status: result.success ? "success" : "error",
    input_summary: JSON.stringify(body).slice(0, 500),
    output_summary: result.summary,
    error: result.error ?? null,
  });

  // ── Increment counter if successful ───────────────────────────────────
  if (result.success) {
    const increment = result.increment ?? 1;
    await supabase.rpc("increment_automation_counter", {
      p_automation_id: automationRow.id,
      p_increment: increment,
    });
  }

  const duration = Date.now() - startedAt;
  console.log(`[automation/${key}] ${result.success ? "OK" : "FAIL"} in ${duration}ms — ${result.summary || result.error}`);

  return NextResponse.json({
    success: result.success,
    summary: result.summary,
    ...(result.error ? { error: result.error } : {}),
  });
}
