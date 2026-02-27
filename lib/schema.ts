import type { TabKey } from "@/lib/types";

export const LANGUAGES = ['en', 'ro', 'ru']

export const ROADMAP_STATUSES = [
  'planned',
  'paid',
  'in_progress',
  'completed',
]

export const BLOCK_TYPES = {
  TEXT: 'text',
  LIST: 'list',
  TABLE: 'table',
  KPI_CARDS: 'kpi_cards',
  CARD_GRID: 'card_grid',
  FLOW: 'flow',
  TIMELINE: 'timeline',
  QUALIFICATION: 'qualification',
  HIGHLIGHT: 'highlight',
  PHASES: 'phases',
  BRIEF: 'brief',
  CHANNELS: 'channels',
  DEMAND: 'demand',
  WEBSITE: 'website',
  ASSETS: 'assets',
  EXECUTION: 'execution',
}

export const SECTION_SCHEMAS = {
  'executive-snapshot': {
    label: 'Brief',
    blocks: [
      {
        key: 'service_provider',
        type: BLOCK_TYPES.BRIEF,
        title: 'Service Provider',
        fields: ['company_name', 'short_brief', 'services', 'location'],
      },
      {
        key: 'icp',
        type: BLOCK_TYPES.BRIEF,
        title: 'ICP',
        fields: [
          'pains',
          'search_methods',
          'timeframe',
          'age_group',
          'habitant_location',
        ],
      },
      {
        key: 'funnel_diagram',
        type: BLOCK_TYPES.FLOW,
        title: 'Customer Journey Funnel',
        fields: ['stages'],
        layout: 'vertical',
      },
      {
        key: 'kpis',
        type: BLOCK_TYPES.KPI_CARDS,
        title: 'KPI',
        fields: ['items'],
      },
    ],
  },
  'who-this-is-for': {
    label: 'Marketing Channels',
    blocks: [
      {
        key: 'channel_prioritization',
        type: BLOCK_TYPES.CHANNELS,
        title: 'Marketing Channel Prioritization',
        fields: ['items'],
      },
    ],
  },
  'market-demand-overview': {
    label: 'Demand',
    blocks: [
      {
        key: 'keyword_research',
        type: BLOCK_TYPES.DEMAND,
        title: 'Market Demand Assessment',
        fields: ['ppc_sheet_link', 'uploaded_at', 'currency', 'keywords'],
      },
    ],
  },
  'execution-phases': {
    label: 'Execution',
    blocks: [
      {
        key: 'execution_checklist',
        type: BLOCK_TYPES.EXECUTION,
        title: 'Execution Checklist',
        fields: ['items'],
      },
    ],
  },
  'asset-structure': {
    label: 'Website',
    blocks: [
      {
        key: 'website_architecture',
        type: BLOCK_TYPES.WEBSITE,
        title: 'Website Architecture & SEO Strategy',
        fields: ['seo_sheet_link', 'uploaded_at', 'multi_location', 'pages'],
      },
    ],
  },
  assets: {
    label: 'Assets',
    blocks: [
      {
        key: 'asset_library',
        type: BLOCK_TYPES.ASSETS,
        title: 'Client Delivery Hub',
        fields: ['brand_kit', 'content', 'website', 'briefs'],
      },
    ],
  },
}

export const CONTENT_BLOCK_SHAPES = {
  [BLOCK_TYPES.TEXT]: {
    text: '',
  },
  [BLOCK_TYPES.LIST]: {
    items: [''],
  },
  [BLOCK_TYPES.TABLE]: {
    columns: [''],
    rows: [['']],
  },
  [BLOCK_TYPES.KPI_CARDS]: {
    items: [
      { label: '', value: '', target: '', note: '' },
    ],
  },
  [BLOCK_TYPES.CARD_GRID]: {
    items: [
      { title: '', description: '', meta: [] },
    ],
  },
  [BLOCK_TYPES.FLOW]: {
    nodes: [''],
  },
  [BLOCK_TYPES.TIMELINE]: {
    steps: [''],
  },
  [BLOCK_TYPES.QUALIFICATION]: {
    items: [''],
  },
  [BLOCK_TYPES.HIGHLIGHT]: {
    target: [''],
    excluded: [''],
  },
  [BLOCK_TYPES.PHASES]: {
    items: [
      {
        title: '',
        deliverables: [''],
        success_conditions: [''],
        status: 'planned',
      },
    ],
  },
  [BLOCK_TYPES.BRIEF]: {
    company_name: '',
    short_brief: '',
    services: [''],
    location: '',
    pains: [''],
    search_methods: [''],
    timeframe: '',
    age_group: '',
    habitant_location: '',
  },
  [BLOCK_TYPES.CHANNELS]: {
    items: [
      {
        channel: '',
        allocated_budget: '',
        currency: 'DKK',
        objective: '',
        funnel_stage: '',
        primary_offer: '',
        audience_segment: '',
        primary_kpi: '',
        status: 'planned',
      },
    ],
  },
  [BLOCK_TYPES.DEMAND]: {
    ppc_sheet_link: '',
    uploaded_at: '',
    currency: 'USD',
    keywords: [],
  },
  [BLOCK_TYPES.WEBSITE]: {
    seo_sheet_link: '',
    uploaded_at: '',
    multi_location: false,
    pages: [],
  },
  [BLOCK_TYPES.ASSETS]: {
    brand_kit: {
      logos: [],
      colors: [{ label: 'Primary', hex: '#000000' }],
      fonts: [{ label: 'Heading', family: '', url: '' }],
      guidelines: [],
    },
    content: {
      items: [],
    },
    website: {
      figma_links: [{ label: '', url: '', notes: '' }],
      copy_docs: [],
      staging_url: '',
      live_url: '',
      status: 'not_started',
    },
    briefs: {
      designer: null,
      photographer: null,
      developer: null,
    },
  },
  [BLOCK_TYPES.EXECUTION]: {
    items: [
      {
        action: '',
        action_status: 'not_started',
        deadline: '',
        deadline_status: 'not_set',
        priority: 'normal',
        deliverable: '',
        notes: '',
        estimated_cost: '',
        currency: 'DKK',
      },
    ],
  },
}

// Maps our TabKey to SECTION_SCHEMAS keys
export const TAB_KEY_TO_SECTION: Record<TabKey, keyof typeof SECTION_SCHEMAS> = {
  brief: 'executive-snapshot',
  marketing_channels: 'who-this-is-for',
  demand: 'market-demand-overview',
  website: 'asset-structure',
  assets: 'assets',
  execution: 'execution-phases',
};

// Get the schema for a given tab key
export function getSectionSchema(tabKey: TabKey) {
  const sectionKey = TAB_KEY_TO_SECTION[tabKey];
  return SECTION_SCHEMAS[sectionKey];
}

// Get the default empty data shape for a given tab key
export function getDefaultTabData(tabKey: TabKey): Record<string, unknown> {
  const schema = getSectionSchema(tabKey);
  if (!schema) return {};
  const data: Record<string, unknown> = {};
  for (const block of schema.blocks) {
    const shape = CONTENT_BLOCK_SHAPES[block.type as keyof typeof CONTENT_BLOCK_SHAPES];
    if (shape) {
      data[block.key] = JSON.parse(JSON.stringify(shape));
    }
  }
  return data;
}
