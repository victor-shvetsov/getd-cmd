import { createClient } from "@/lib/supabase/server";
import type {
  ClientConfig,
  ClientRow,
  ClientTabRow,
  TranslationRow,
  ClientTabTranslationRow,
  SubscriptionRow,
  TabKey,
} from "./types";

/** Fetch a single client by slug with all related data assembled */
export async function getClientBySlug(
  slug: string
): Promise<ClientConfig | null> {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single<ClientRow>();

  if (!client) return null;

  const [tabsRes, translationsRes, subsRes] = await Promise.all([
    supabase
      .from("client_tabs")
      .select("*")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("translations")
      .select("*")
      .eq("client_id", client.id),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true }),
  ]);

  const tabs = (tabsRes.data as ClientTabRow[]) ?? [];
  const translationRows = (translationsRes.data as TranslationRow[]) ?? [];
  const subscriptions = (subsRes.data as SubscriptionRow[]) ?? [];

  // Fetch tab translations for all tabs
  const tabIds = tabs.map((t) => t.id);
  let tabTranslations: ClientTabTranslationRow[] = [];
  if (tabIds.length > 0) {
    const { data } = await supabase
      .from("client_tab_translations")
      .select("*")
      .in("client_tab_id", tabIds);
    tabTranslations = (data as ClientTabTranslationRow[]) ?? [];
  }

  // Group tab translations by tab id
  const tabTransByTabId: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const tt of tabTranslations) {
    if (!tabTransByTabId[tt.client_tab_id]) tabTransByTabId[tt.client_tab_id] = {};
    tabTransByTabId[tt.client_tab_id][tt.language_code] = tt.data;
  }

  // Assemble translations object
  const translations: Record<string, Record<string, Record<string, string>>> = {};
  for (const row of translationRows) {
    translations[row.language_code] = row.translations;
  }

  return {
    id: client.id,
    slug: client.slug,
    name: client.name,
    pin: client.pin,
    client_type: client.client_type ?? "service_outbound",
    project_objective: client.project_objective ?? "",
    logo_url: client.logo_url,
    branding: {
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      accent_color: client.accent_color,
      background_color: client.background_color,
      header_color: client.header_color,
      text_color: client.text_color,
      font_heading: client.font_heading,
      font_body: client.font_body,
      border_radius: client.border_radius,
      nav_color: client.nav_color ?? client.text_color ?? "#1a1a1a",
      nav_text_color: client.nav_text_color ?? "#ffffff",
    },
    default_language: client.default_language,
    available_languages: client.available_languages,
    tabs: tabs
      .filter((t) => t.is_visible)
      .map((t) => ({
        tab_key: t.tab_key as TabKey,
        data: t.data,
        sort_order: t.sort_order,
        is_visible: t.is_visible,
        translations: tabTransByTabId[t.id] ?? {},
      })),
    subscriptions: subscriptions.filter((s) => s.status !== "terminated"),
    translations,
  };
}

/** Fetch all clients (admin list) */
export async function getAllClients(): Promise<ClientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as ClientRow[]) ?? [];
}

/** Fetch all client slugs for routing */
export async function getAllClientSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("slug");
  return (data ?? []).map((r: { slug: string }) => r.slug);
}
