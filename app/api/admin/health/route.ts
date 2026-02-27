import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_CHECKS, type ClientHealth, type CheckResult, type CheckContext } from "@/lib/health-checks";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const clientFilter = url.searchParams.get("client_id");

  // Fetch clients
  let clientQuery = supabase.from("clients").select("*");
  if (clientFilter) clientQuery = clientQuery.eq("id", clientFilter);
  const { data: clients, error: clientsError } = await clientQuery;

  if (clientsError || !clients) {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }

  const healthResults: ClientHealth[] = [];

  for (const client of clients) {
    // Fetch tabs
    const { data: tabs } = await supabase
      .from("client_tabs")
      .select("tab_key, data, sort_order, is_visible")
      .eq("client_id", client.id)
      .order("sort_order");

    const tabRows = (tabs ?? []) as CheckContext["tabs"];

    // Fetch translations
    const { data: translations } = await supabase
      .from("translations")
      .select("language_code, translations")
      .eq("client_id", client.id);

    // Fetch tab translations via join
    const { data: tabTransJoin } = await supabase
      .from("client_tab_translations")
      .select("language_code, client_tabs!inner(tab_key, client_id)")
      .eq("client_tabs.client_id", client.id);

    const tabTranslations = (tabTransJoin ?? []).map((tt: Record<string, unknown>) => ({
      tab_key: (tt.client_tabs as Record<string, unknown>)?.tab_key as string,
      language_code: tt.language_code as string,
    }));

    // Build context for all checks
    const ctx: CheckContext = {
      client: client as Record<string, unknown>,
      tabs: tabRows,
      translations: (translations ?? []) as CheckContext["translations"],
      tabTranslations,
      supabase,
    };

    // Run all registered checks
    const checks: CheckResult[] = [];
    for (const check of ALL_CHECKS) {
      const result = check.run(ctx);
      const items = result instanceof Promise ? await result : result;
      checks.push(...items);
    }

    // Calculate score
    const total = checks.length;
    const passing = checks.filter((c) => c.status === "pass").length;
    const warnings = checks.filter((c) => c.status === "warn").length;
    const score = total > 0 ? Math.round(((passing + warnings * 0.5) / total) * 100) : 0;

    healthResults.push({
      clientId: client.id,
      clientName: client.name,
      slug: client.slug,
      checks,
      score,
    });
  }

  return NextResponse.json(healthResults);
}
