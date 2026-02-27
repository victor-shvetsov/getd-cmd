import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

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

  const { data, error } = await supabase
    .from("clients")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create default English translations
  await supabase.from("translations").insert({
    client_id: data.id,
    language_code: "en",
    translations: getDefaultTranslations(),
  });

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
