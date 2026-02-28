// ---- Tab keys ----
export const TAB_KEYS = [
  // New vision tabs (primary)
  "sales",
  "demand",
  "activity",
  "assets",
  "automations",
  "execution",
  // Legacy tabs (kept during transition, hidden from new clients)
  "brief",
  "marketing_channels",
  "website",
] as const;
export type TabKey = (typeof TAB_KEYS)[number];

// ---- Brief ----
export interface BriefData {
  service_provider: {
    company_name: string;
    short_brief: string;
    services: string[];
    location: string;
  };
  icp: {
    pains: string[];
    search_methods: string[];
    timeframe: string;
    age_group: string;
    habitant_location: string;
  };
  funnel_diagram: {
    nodes?: string[];
    stages?: FunnelStage[];
  };
  kpis: { items: KpiItem[] };
}
export interface FunnelStage {
  name: string;
  description: string;
  user_action: string;
  business_action: string;
  drop_off: string;
}

export interface KpiItem {
  label: string;
  value: string;
  target: string;
  note: string;
}

// ---- Marketing Channels ----
export interface MarketingChannelsData {
  channel_prioritization: {
    items: ChannelItem[];
  };
}
export interface ChannelItem {
  channel: string;
  allocated_budget: string;
  currency: string;
  objective: string;
  funnel_stage: string;
  primary_offer: string;
  audience_segment: string;
  primary_kpi: string;
  status: string;
}

// ---- Demand (PPC research driven) ----
export interface DemandData {
  keyword_research: {
    ppc_sheet_link: string;
    uploaded_at: string;
    currency: string;
    keywords: PPCKeyword[];
  };
}

export interface PPCKeyword {
  campaign: string;
  ad_group: string;
  keyword: string;
  avg_monthly_searches: number;
  top_bid_low: number;
  top_bid_high: number;
  match_type: string;
  landing_page: string;
}

// Derived view types (computed at render, not stored)
export interface DemandByPage {
  landing_page: string;
  total_volume: number;
  keyword_count: number;
  avg_cpc_low: number;
  avg_cpc_high: number;
  campaigns: string[];
  ad_groups: string[];
  keywords: PPCKeyword[];
}

export interface DemandSummary {
  total_keywords: number;
  total_monthly_searches: number;
  avg_cpc_low: number;
  avg_cpc_high: number;
  pages_targeted: number;
  by_page: DemandByPage[];
}

// ---- Website (SEO research driven) ----
export interface WebsiteData {
  website_architecture: {
    seo_sheet_link: string;
    uploaded_at: string;
    multi_location: boolean;
    pages: SEOPage[];
  };
}

export interface SEOPage {
  cluster_name: string;
  primary_keyword: string;
  search_volume: number;
  intent: string;
  page_type: string;
  full_url_path: string;
  priority: string;
  secondary_keywords: string[];
  // Managed by admin (not from CSV)
  status: "planned" | "copy_ready" | "in_design" | "in_dev" | "live";
  notes: string;
}

// Derived tree node (computed at render, not stored)
export interface SiteTreeNode {
  segment: string;
  full_path: string;
  page: SEOPage | null;
  children: SiteTreeNode[];
  // Aggregated from children
  total_volume: number;
  total_pages: number;
  live_pages: number;
}

// ---- Assets (Client Delivery Hub) ----
export interface AssetsData {
  asset_library: {
    brand_kit: {
      logos: AssetFile[];
      colors: BrandColor[];
      fonts: BrandFont[];
      guidelines: AssetFile[];
    };
    content: {
      items: ContentAsset[];
    };
    website: {
      figma_links: WebLink[];
      copy_docs: AssetFile[];
      staging_url: string;
      live_url: string;
      status: "not_started" | "copy_ready" | "design_in_progress" | "design_approved" | "dev_in_progress" | "live";
    };
    briefs: {
      designer: BriefEntry | null;
      photographer: BriefEntry | null;
      developer: BriefEntry | null;
    };
  };
}

export interface AssetFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  notes: string;
  uploaded_at: string;
}

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  label: string;
  family: string;
  url: string;
}

export interface ContentAsset {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string;
  category: "team" | "product" | "lifestyle" | "location" | "other";
  tags: string[];
  notes: string;
  status: "scheduled" | "in_progress" | "delivered" | "approved";
  uploaded_at: string;
}

export interface WebLink {
  label: string;
  url: string;
  notes: string;
}

export interface BriefEntry {
  content: string;
  generated_at: string;
}

// ---- Execution (project roadmap + one-time payments; recurring billing lives in subscriptions) ----
export interface ExecutionData {
  execution_checklist: {
    items: ExecutionItem[];
  };
}
export interface ExecutionItem {
  action: string;
  action_status: string;     // 'not_started' | 'in_progress' | 'completed'
  deadline: string;
  deadline_status: string;   // 'not_set' | 'on_track' | 'at_risk' | 'overdue'
  priority: string;          // 'normal' | 'high' | 'critical'
  deliverable: string;
  notes: string;
  // One-time payment fields (kept for project items like website builds, ad setup)
  price?: string;
  currency?: string;
  payment_type?: string;     // 'one_time' | 'monthly' -- monthly filtered out (→ subscriptions)
  payment_status?: string;   // 'not_paid' | 'paid' | 'Paid'
  stripe_session_id?: string;
  paid_at?: string;
  invoice_url?: string;
  invoice_pdf?: string;
}

// ---- Sales (Tab 1: "Am I selling enough?") ----
export interface SalesData {
  revenue_goal: number;           // Monthly revenue target in local currency
  currency: string;               // "DKK", "EUR", etc.
  product_categories: ProductCategory[];
}

export interface ProductCategory {
  id: string;
  name: string;                   // "Automatic machines", "Coffee beans"
  sort_order: number;
}

// ---- Activity (Tab 3: "What is my marketing guy doing?") ----
export interface ActivityData {
  placeholder?: boolean;          // Tab data lives in the activity_entries table
}

// ---- Automations (Tab 5: "What's working on autopilot?") ----
export interface AutomationData {
  placeholder?: boolean;          // Tab data lives in the automations table
}

// ---- Client Types ----
export const CLIENT_TYPES = [
  "service_outbound",
  "single_location",
  "multi_location",
  "ecommerce",
] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  service_outbound: "Service (Outbound)",
  single_location: "Single Location",
  multi_location: "Multi-Location",
  ecommerce: "E-commerce",
};

// ---- Database Row Types ----
export interface ClientRow {
  id: string;
  slug: string;
  name: string;
  pin: string;
  client_type: ClientType;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  header_color: string;
  text_color: string;
  nav_color: string | null;
  nav_text_color: string | null;
  font_heading: string;
  font_body: string;
  border_radius: string;
  project_objective: string;
  default_language: string;
  available_languages: string[];
  currency: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientTabRow {
  id: string;
  client_id: string;
  tab_key: TabKey;
  data: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranslationRow {
  id: string;
  client_id: string;
  language_code: string;
  translations: Record<string, Record<string, string>>;
  created_at: string;
  updated_at: string;
}

export interface ClientTabTranslationRow {
  id: string;
  client_tab_id: string;
  language_code: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---- Subscriptions (recurring Stripe services) ----
export interface SubscriptionInvoice {
  date: string;
  amount: number;
  currency: string;
  status: string;
  invoice_url: string | null;
  invoice_pdf: string | null;
  stripe_invoice_id: string;
}

export interface SubscriptionRow {
  id: string;
  client_id: string;
  service_key: string;
  service_label: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  amount: number;
  currency: string;
  interval: "month" | "year";
  termination_months: number;
  terms_text: string | null;
  terms_accepted_at: string | null;
  status: "pending" | "active" | "past_due" | "canceled" | "terminated";
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  invoices: SubscriptionInvoice[];
  // Sales copy (admin-editable, client-visible)
  value_proposition: string | null;  // "Get 5,000+ organic visitors/month"
  includes: string[];                // ["Technical SEO audits", "4 content pages/month", ...]
  created_at: string;
  updated_at: string;
}

// ---- Channels (per-client marketing channels with progress tracking) ----
export const CHANNEL_KEYS = [
  "seo",
  "ppc",
  "social_media",
  "email",
  "content",
  "web_dev",
] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  seo: "SEO",
  ppc: "Google Ads",
  social_media: "Social Media",
  email: "Email Marketing",
  content: "Content",
  web_dev: "Web Development",
};

export interface ChannelProgress {
  current_value: number;
  target_value: number;
  unit: string;
  months_elapsed: number;
  total_months: number;
  budget_spent: number;
  budget_total: number;
  milestones: { label: string; target: number; reached_at: string | null }[];
}

export interface ChannelRow {
  id: string;
  client_id: string;
  channel_key: ChannelKey;
  channel_label: string;
  config: Record<string, unknown>;
  progress: ChannelProgress;
  subscription_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---- Deliverables (activity log for channels, humans, and AI agents) ----
export const DELIVERABLE_TYPES = [
  "backlink",
  "content",
  "tech_fix",
  "ad_copy",
  "ad_campaign",
  "social_post",
  "report",
  "keyword_research",
  "landing_page",
  "other",
] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export interface DeliverableAttachment {
  name: string;
  url: string;
  type: "pdf" | "image" | "doc" | "link";
}

export interface DeliverableRow {
  id: string;
  client_id: string;
  channel_id: string | null;
  channel_key: string;
  type: DeliverableType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  attachments: DeliverableAttachment[];
  created_by: string;
  created_by_name: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Branding Config (shared by client portal, admin branding editor, bottom-nav) ----
export interface BrandingConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  header_color: string;
  text_color: string;
  nav_color: string;
  nav_text_color: string;
  font_heading: string;
  font_body: string;
  border_radius: string;
}

// ---- Assembled Client Config (for front-end use) ----
export interface ClientConfig {
  id: string;
  slug: string;
  name: string;
  pin: string;
  client_type: ClientType;
  project_objective: string;
  logo_url: string | null;
  currency: string;
  branding: BrandingConfig;
  default_language: string;
  available_languages: string[];
  tabs: {
    tab_key: TabKey;
    data: Record<string, unknown>;
    sort_order: number;
    is_visible: boolean;
    translations: Record<string, Record<string, unknown>>;
  }[];
  subscriptions: SubscriptionRow[];
  translations: Record<string, Record<string, Record<string, string>>>;
}

// ---- Sales Entries (offline + online sales tracking) ----
export interface SalesEntryRow {
  id: string;
  client_id: string;
  category_id: string | null;     // links to ProductCategory.id or null for uncategorized
  category_name: string;          // denormalized: "Automatic machines"
  amount: number;                 // revenue amount in local currency
  currency: string;
  source: "online" | "offline" | "manual"; // where the sale came from
  note: string | null;            // optional note ("Trade show sale")
  sold_at: string;                // when the sale happened
  created_at: string;
  updated_at: string;
}

// ---- Activity Entries (what-we-did log) ----
export interface ActivityEntryRow {
  id: string;
  client_id: string;
  title: string;                  // "Updated product pages"
  description: string | null;     // optional longer description
  category: string | null;        // "seo" | "ads" | "website" | "automation" | "general"
  is_visible: boolean;            // admin can hide entries
  created_at: string;
  updated_at: string;
}

// ---- Automations (AI-powered, Claude API, toggles + counters) ----
export interface AutomationRow {
  id: string;
  client_id: string;
  name: string;                   // "Auto-reply to new leads"
  description: string;            // "Sends a personal reply to every new enquiry within 2 minutes"
  automation_key: string;         // "lead_reply" | "social_poster" | "review_collector"
  is_enabled: boolean;            // on/off toggle state
  counter_label: string;          // "leads replied" | "jobs posted" | "reviews collected"
  counter_value: number;          // current month's count
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type Lang = string;
