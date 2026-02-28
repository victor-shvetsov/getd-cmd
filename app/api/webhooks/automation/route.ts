import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/webhooks/automation
 * 
 * Inbound webhook for automation engine to report activity and increment counters.
 * 
 * Body options:
 * 
 * 1. Increment counter by automation ID:
 *    { automation_id: "uuid", increment?: number }
 * 
 * 2. Increment counter by client + automation_key:
 *    { client_id: "uuid", automation_key: "lead_reply", increment?: number }
 * 
 * 3. Set counter to a specific value:
 *    { automation_id: "uuid", set_counter: 42 }
 * 
 * Defaults: increment = 1
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { automation_id, client_id, automation_key, increment, set_counter } = body;

  const supabase = createAdminClient();

  // Resolve the automation row
  let automationId = automation_id;

  if (!automationId && client_id && automation_key) {
    const { data } = await supabase
      .from("automations")
      .select("id")
      .eq("client_id", client_id)
      .eq("automation_key", automation_key)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Automation not found for client_id + automation_key" }, { status: 404 });
    }
    automationId = data.id;
  }

  if (!automationId) {
    return NextResponse.json({ error: "automation_id or (client_id + automation_key) required" }, { status: 400 });
  }

  // Set counter to exact value
  if (typeof set_counter === "number") {
    const { error } = await supabase
      .from("automations")
      .update({ counter_value: set_counter, updated_at: new Date().toISOString() })
      .eq("id", automationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, counter_value: set_counter });
  }

  // Increment counter (default +1)
  const inc = typeof increment === "number" ? increment : 1;

  const { data: current, error: fetchError } = await supabase
    .from("automations")
    .select("counter_value")
    .eq("id", automationId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  const newValue = (current.counter_value ?? 0) + inc;

  const { error: updateError } = await supabase
    .from("automations")
    .update({ counter_value: newValue, updated_at: new Date().toISOString() })
    .eq("id", automationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counter_value: newValue });
}
