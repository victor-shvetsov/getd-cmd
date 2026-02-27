import type { ClientConfig } from "./types";

const clients: Record<string, ClientConfig> = {
  demo: {
    slug: "demo",
    pin: "123456",
    theme: {
      "--brand": "210 90% 50%",
      "--brand-foreground": "0 0% 100%",
      "--background": "210 20% 98%",
      "--foreground": "210 20% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "210 20% 10%",
      "--muted": "210 15% 94%",
      "--muted-foreground": "210 10% 46%",
      "--border": "210 15% 89%",
      "--input": "210 15% 89%",
      "--ring": "210 90% 50%",
      "--primary": "210 90% 50%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 15% 94%",
      "--secondary-foreground": "210 20% 10%",
      "--accent": "210 15% 94%",
      "--accent-foreground": "210 20% 10%",
      "--nav-bg": "210 30% 14%",
      "--nav-foreground": "210 15% 70%",
      "--nav-active": "210 90% 50%",
      "--nav-active-foreground": "0 0% 100%",
      "--radius": "0.5rem",
      "--font-family": "'Inter', sans-serif",
    },
    languages: ["en", "ro", "ru"],
    data: {
      en: {
        brief: {
          service_provider: {
            company_name: "Dental Smile Clinic",
            short_brief:
              "Premium dental tourism clinic in Bucharest offering full-service dental care to international patients.",
            services: [
              "Dental Implants",
              "Veneers",
              "Teeth Whitening",
              "Full Mouth Restoration",
              "Orthodontics",
            ],
            location: "Bucharest, Romania",
          },
          icp: {
            pains: [
              "High dental costs in home country",
              "Long waiting times for NHS",
              "Fear of low quality abroad",
              "Language barriers",
            ],
            search_methods: [
              "Google Search",
              "Reddit forums",
              "Facebook groups",
              "YouTube reviews",
            ],
            timeframe: "2-6 months before travel",
            age_group: "35-65",
            habitant_location: "UK, Ireland, Germany",
          },
          funnel_diagram: {
            nodes: [
              "Awareness",
              "Interest",
              "Consideration",
              "Booking",
              "Treatment",
              "Referral",
            ],
          },
          kpis: {
            items: [
              {
                label: "Monthly Leads",
                value: "120",
                target: "200",
                note: "Via all channels combined",
              },
              {
                label: "Conversion Rate",
                value: "8%",
                target: "12%",
                note: "Lead to booked patient",
              },
              {
                label: "Avg. Ticket",
                value: "\u20AC3,200",
                target: "\u20AC4,000",
                note: "Per patient treatment value",
              },
              {
                label: "CAC",
                value: "\u20AC85",
                target: "\u20AC60",
                note: "Cost per acquired patient",
              },
            ],
          },
        },
        marketing_channels: {
          channel_prioritization: {
            items: [
              {
                channel: "Google Ads",
                allocated_budget: "3,000",
                currency: "EUR",
                objective: "Lead generation",
                funnel_stage: "Bottom",
                primary_offer: "Free consultation",
                audience_segment: "UK dental tourists",
                primary_kpi: "Cost per lead",
                status: "Active",
              },
              {
                channel: "Meta Ads",
                allocated_budget: "1,500",
                currency: "EUR",
                objective: "Awareness + Retargeting",
                funnel_stage: "Top + Middle",
                primary_offer: "Patient testimonials",
                audience_segment: "UK 35-65, dental interest",
                primary_kpi: "CPM / Engagement",
                status: "Active",
              },
              {
                channel: "SEO",
                allocated_budget: "1,200",
                currency: "EUR",
                objective: "Organic traffic",
                funnel_stage: "Top + Bottom",
                primary_offer: "Informational content",
                audience_segment: "All markets",
                primary_kpi: "Organic sessions",
                status: "In Progress",
              },
              {
                channel: "Email Marketing",
                allocated_budget: "300",
                currency: "EUR",
                objective: "Nurturing",
                funnel_stage: "Middle",
                primary_offer: "Drip sequences",
                audience_segment: "Existing leads",
                primary_kpi: "Open rate / CTR",
                status: "Planned",
              },
            ],
          },
        },
        demand: {
          keyword_research: {
            sheet_link: "https://docs.google.com/spreadsheets/d/example",
            countries: [
              {
                country: "United Kingdom",
                locations: [
                  {
                    location: "London",
                    services: [
                      {
                        service: "Dental Implants",
                        ready_to_book_volume: 2400,
                        total_market_volume: 8100,
                        ppc_low_bid: 1.8,
                        ppc_high_bid: 6.5,
                        currency: "GBP",
                        notes: "High commercial intent",
                      },
                      {
                        service: "Veneers",
                        ready_to_book_volume: 1200,
                        total_market_volume: 4800,
                        ppc_low_bid: 1.2,
                        ppc_high_bid: 4.8,
                        currency: "GBP",
                        notes: "Growing trend",
                      },
                    ],
                  },
                  {
                    location: "Manchester",
                    services: [
                      {
                        service: "Dental Implants",
                        ready_to_book_volume: 880,
                        total_market_volume: 3200,
                        ppc_low_bid: 1.4,
                        ppc_high_bid: 5.2,
                        currency: "GBP",
                        notes: "",
                      },
                    ],
                  },
                ],
              },
              {
                country: "Germany",
                locations: [
                  {
                    location: "Berlin",
                    services: [
                      {
                        service: "Full Mouth Restoration",
                        ready_to_book_volume: 600,
                        total_market_volume: 2200,
                        ppc_low_bid: 2.1,
                        ppc_high_bid: 7.8,
                        currency: "EUR",
                        notes: "Premium segment",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        website: {
          website_architecture: {
            locations: [
              {
                location: "UK Market",
                clusters: [
                  {
                    name: "Service Pages",
                    pages: [
                      {
                        url: "/dental-implants-romania",
                        focus_kw: "dental implants romania",
                        search_volume: 1900,
                        intent: "Commercial",
                        funnel_stage: "Bottom",
                        page_type: "Service",
                        status: "Live",
                        notes: "Top performer",
                      },
                      {
                        url: "/veneers-bucharest",
                        focus_kw: "veneers bucharest",
                        search_volume: 720,
                        intent: "Commercial",
                        funnel_stage: "Bottom",
                        page_type: "Service",
                        status: "Draft",
                        notes: "",
                      },
                    ],
                  },
                  {
                    name: "Blog Content",
                    pages: [
                      {
                        url: "/blog/dental-tourism-guide",
                        focus_kw: "dental tourism guide",
                        search_volume: 3200,
                        intent: "Informational",
                        funnel_stage: "Top",
                        page_type: "Blog",
                        status: "Live",
                        notes: "Link magnet",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        assets: {
          asset_library: {
            categories: [
              {
                title: "Brand Identity",
                link: "https://drive.google.com/brand",
                notes: "Full brand kit",
                items: [
                  {
                    name: "Logo Pack",
                    link: "https://drive.google.com/logo",
                    notes: "SVG + PNG formats",
                  },
                  {
                    name: "Brand Guidelines",
                    link: "https://drive.google.com/guidelines",
                    notes: "Colors, typography, usage",
                  },
                ],
              },
              {
                title: "Ad Creatives",
                link: "https://drive.google.com/ads",
                notes: "Google + Meta ad creatives",
                items: [
                  {
                    name: "Google Ads Banners",
                    link: "https://drive.google.com/google-ads",
                    notes: "All sizes",
                  },
                  {
                    name: "Facebook Ad Set 1",
                    link: "https://drive.google.com/fb-ads",
                    notes: "Testimonial-based",
                  },
                ],
              },
            ],
          },
        },
        execution: {
          execution_checklist: {
            items: [
              {
                action: "Set up Google Ads campaigns",
                price: "500",
                currency: "EUR",
                payment_type: "One-time",
                payment_status: "Paid",
                action_status: "Completed",
                deadline: "2025-02-01",
                deadline_status: "On Time",
                priority: "High",
                deliverable: "3 campaigns live",
                notes: "Search + Display + Retargeting",
              },
              {
                action: "Build landing pages",
                price: "800",
                currency: "EUR",
                payment_type: "One-time",
                payment_status: "Pending",
                action_status: "In Progress",
                deadline: "2025-02-15",
                deadline_status: "At Risk",
                priority: "High",
                deliverable: "4 landing pages",
                notes: "EN + RO versions",
              },
              {
                action: "SEO audit & strategy",
                price: "600",
                currency: "EUR",
                payment_type: "One-time",
                payment_status: "Paid",
                action_status: "Completed",
                deadline: "2025-01-20",
                deadline_status: "On Time",
                priority: "Medium",
                deliverable: "SEO report",
                notes: "Technical + content audit",
              },
              {
                action: "Monthly content creation",
                price: "400",
                currency: "EUR",
                payment_type: "Monthly",
                payment_status: "Active",
                action_status: "Ongoing",
                deadline: "Recurring",
                deadline_status: "On Track",
                priority: "Medium",
                deliverable: "4 blog posts/month",
                notes: "SEO-optimized content",
              },
            ],
          },
        },
      },
      ro: {
        brief: {
          service_provider: {
            company_name: "Dental Smile Clinic",
            short_brief:
              "Clinica premium de turism dentar din Bucuresti, oferind servicii complete de ingrijire dentara pacientilor internationali.",
            services: [
              "Implanturi dentare",
              "Fatete dentare",
              "Albirea dintilor",
              "Restaurare completa",
              "Ortodontie",
            ],
            location: "Bucuresti, Romania",
          },
          icp: {
            pains: [
              "Costuri dentare ridicate in tara de origine",
              "Timpi lungi de asteptare",
              "Frica de calitate scazuta",
              "Bariere lingvistice",
            ],
            search_methods: [
              "Cautare Google",
              "Forumuri Reddit",
              "Grupuri Facebook",
              "Recenzii YouTube",
            ],
            timeframe: "2-6 luni inainte de calatorie",
            age_group: "35-65",
            habitant_location: "UK, Irlanda, Germania",
          },
          funnel_diagram: {
            nodes: [
              "Constientizare",
              "Interes",
              "Considerare",
              "Rezervare",
              "Tratament",
              "Recomandare",
            ],
          },
          kpis: {
            items: [
              {
                label: "Lead-uri lunare",
                value: "120",
                target: "200",
                note: "Prin toate canalele",
              },
              {
                label: "Rata de conversie",
                value: "8%",
                target: "12%",
                note: "Lead la pacient rezervat",
              },
              {
                label: "Tichet mediu",
                value: "\u20AC3.200",
                target: "\u20AC4.000",
                note: "Valoare tratament per pacient",
              },
              {
                label: "CAC",
                value: "\u20AC85",
                target: "\u20AC60",
                note: "Cost per pacient achizitionat",
              },
            ],
          },
        },
      },
      ru: {
        brief: {
          service_provider: {
            company_name: "Dental Smile Clinic",
            short_brief:
              "\u041F\u0440\u0435\u043C\u0438\u0443\u043C \u043A\u043B\u0438\u043D\u0438\u043A\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0442\u0443\u0440\u0438\u0437\u043C\u0430 \u0432 \u0411\u0443\u0445\u0430\u0440\u0435\u0441\u0442\u0435.",
            services: [
              "\u0418\u043C\u043F\u043B\u0430\u043D\u0442\u044B",
              "\u0412\u0438\u043D\u0438\u0440\u044B",
              "\u041E\u0442\u0431\u0435\u043B\u0438\u0432\u0430\u043D\u0438\u0435",
              "\u041F\u043E\u043B\u043D\u0430\u044F \u0440\u0435\u0441\u0442\u0430\u0432\u0440\u0430\u0446\u0438\u044F",
              "\u041E\u0440\u0442\u043E\u0434\u043E\u043D\u0442\u0438\u044F",
            ],
            location:
              "\u0411\u0443\u0445\u0430\u0440\u0435\u0441\u0442, \u0420\u0443\u043C\u044B\u043D\u0438\u044F",
          },
          icp: {
            pains: [
              "\u0412\u044B\u0441\u043E\u043A\u0438\u0435 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B",
              "\u0414\u043E\u043B\u0433\u0438\u0435 \u043E\u0447\u0435\u0440\u0435\u0434\u0438",
              "\u0421\u0442\u0440\u0430\u0445 \u043D\u0438\u0437\u043A\u043E\u0433\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430",
              "\u042F\u0437\u044B\u043A\u043E\u0432\u044B\u0435 \u0431\u0430\u0440\u044C\u0435\u0440\u044B",
            ],
            search_methods: [
              "Google",
              "Reddit",
              "Facebook",
              "YouTube",
            ],
            timeframe:
              "2-6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u0434\u043E \u043F\u043E\u0435\u0437\u0434\u043A\u0438",
            age_group: "35-65",
            habitant_location:
              "\u0412\u0435\u043B\u0438\u043A\u043E\u0431\u0440\u0438\u0442\u0430\u043D\u0438\u044F, \u0418\u0440\u043B\u0430\u043D\u0434\u0438\u044F, \u0413\u0435\u0440\u043C\u0430\u043D\u0438\u044F",
          },
          funnel_diagram: {
            nodes: [
              "\u041E\u0441\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u043E\u0441\u0442\u044C",
              "\u0418\u043D\u0442\u0435\u0440\u0435\u0441",
              "\u0420\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0435",
              "\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
              "\u041B\u0435\u0447\u0435\u043D\u0438\u0435",
              "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F",
            ],
          },
          kpis: {
            items: [
              {
                label:
                  "\u041B\u0438\u0434\u044B \u0432 \u043C\u0435\u0441\u044F\u0446",
                value: "120",
                target: "200",
                note: "\u0412\u0441\u0435 \u043A\u0430\u043D\u0430\u043B\u044B",
              },
              {
                label:
                  "\u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F",
                value: "8%",
                target: "12%",
                note: "\u041B\u0438\u0434 \u0432 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430",
              },
              {
                label:
                  "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0447\u0435\u043A",
                value: "\u20AC3.200",
                target: "\u20AC4.000",
                note: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043B\u0435\u0447\u0435\u043D\u0438\u044F",
              },
              {
                label: "CAC",
                value: "\u20AC85",
                target: "\u20AC60",
                note: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F",
              },
            ],
          },
        },
      },
    },
  },
  acme: {
    slug: "acme",
    pin: "999888",
    theme: {
      "--brand": "152 60% 40%",
      "--brand-foreground": "0 0% 100%",
      "--background": "150 10% 97%",
      "--foreground": "150 15% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "150 15% 10%",
      "--muted": "150 10% 93%",
      "--muted-foreground": "150 5% 46%",
      "--border": "150 10% 88%",
      "--input": "150 10% 88%",
      "--ring": "152 60% 40%",
      "--primary": "152 60% 40%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "150 10% 93%",
      "--secondary-foreground": "150 15% 10%",
      "--accent": "150 10% 93%",
      "--accent-foreground": "150 15% 10%",
      "--nav-bg": "152 30% 12%",
      "--nav-foreground": "150 10% 65%",
      "--nav-active": "152 60% 40%",
      "--nav-active-foreground": "0 0% 100%",
      "--radius": "0.75rem",
      "--font-family": "'Inter', sans-serif",
    },
    languages: ["en"],
    data: {
      en: {},
    },
  },
};

export function getClientConfig(slug: string): ClientConfig | null {
  return clients[slug] ?? null;
}

export function getAllClientSlugs(): string[] {
  return Object.keys(clients);
}
