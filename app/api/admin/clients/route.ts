import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const supabase = createAdminClient();

  // Hash PIN before storing if provided
  const insertBody = { ...body };
  if (insertBody.pin) {
    insertBody.pin_hash = await bcrypt.hash(String(insertBody.pin), 10);
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(insertBody)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create default English translations
  await supabase.from("translations").insert({
    client_id: data.id,
    language_code: "en",
    translations: getDefaultTranslations(),
  });

  // Seed 6 primary tabs — new clients start with all active tabs visible
  await supabase.from("client_tabs").insert([
    { client_id: data.id, tab_key: "sales",       sort_order: 0, data: { revenue_goal: 0, currency: "DKK", product_categories: [] }, is_visible: true },
    { client_id: data.id, tab_key: "demand",      sort_order: 1, data: {}, is_visible: true },
    { client_id: data.id, tab_key: "activity",    sort_order: 2, data: {}, is_visible: true },
    { client_id: data.id, tab_key: "assets",      sort_order: 3, data: {}, is_visible: true },
    { client_id: data.id, tab_key: "automations", sort_order: 4, data: {}, is_visible: true },
    { client_id: data.id, tab_key: "execution",   sort_order: 5, data: {}, is_visible: true },
  ]);

  return NextResponse.json(data, { status: 201 });
}

function getDefaultTranslations() {
  return {
    brief: {
      title: "Brief", service_provider: "Service Provider", company_name: "Company Name",
      short_brief: "Short Brief", services: "Services", location: "Location",
      icp: "Ideal Customer Profile", pains: "Pain Points", search_methods: "Search Methods",
      timeframe: "Timeframe", age_group: "Age Group", habitant_location: "Location",
      funnel: "Marketing Funnel", kpis: "KPIs", label: "Label", value: "Value",
      target: "Target", note: "Note",
    },
    marketing_channels: {
      title: "Marketing Channels", channel_prioritization: "Channel Prioritization",
      channel: "Channel", allocated_budget: "Budget", currency: "Currency",
      objective: "Objective", funnel_stage: "Funnel Stage", primary_offer: "Primary Offer",
      audience_segment: "Audience", primary_kpi: "Primary KPI", status: "Status",
    },
    demand: {
      title: "Demand", keyword_research: "Keyword Research", sheet_link: "Research Sheet",
      country: "Country", location: "Location", service: "Service",
      ready_to_book: "Ready to Book", total_volume: "Total Volume",
      ppc_low: "PPC Low", ppc_high: "PPC High", notes: "Notes",
    },
    website: {
      title: "Website", website_architecture: "Website Architecture", cluster: "Cluster",
      url: "URL", focus_kw: "Focus Keyword", search_volume: "Search Volume",
      intent: "Intent", funnel_stage: "Funnel Stage", page_type: "Page Type",
      status: "Status", notes: "Notes",
    },
    assets: {
      title: "Assets", asset_library: "Asset Library", category: "Category",
      link: "Link", notes: "Notes", items: "Items",
    },
    execution: {
      title: "Execution", execution_checklist: "Execution Checklist", action: "Action",
      price: "Price", payment_type: "Payment Type", payment_status: "Payment Status",
      action_status: "Status", deadline: "Deadline", deadline_status: "Deadline Status",
      priority: "Priority", deliverable: "Deliverable", notes: "Notes",
    },
    common: {
      language: "Language", pin_title: "Enter PIN", pin_subtitle: "Enter your access code",
      submit: "Submit", back: "Back", loading: "Loading...", no_data: "No data available",
    },
  };
}
