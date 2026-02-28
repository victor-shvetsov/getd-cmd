import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const filePath = "/vercel/share/v0-project/lib/i18n-labels.json";

const raw = readFileSync(filePath, "utf-8");
const data = JSON.parse(raw);

const NEW_KEYS = {
  da: {
    common: {
      today: "I dag",
      yesterday: "I går",
      days_ago: "dage siden",
      last_week: "Sidste uge",
      weeks_ago: "uger siden",
    },
    activity: {
      total_actions: "ting vi har gjort for dig",
      nothing_yet: "Intet at vise endnu",
      nothing_yet_sub: "Opdateringer dukker op her, når vi laver noget",
      category_seo: "SEO",
      category_ads: "Annoncer",
      category_website: "Hjemmeside",
      category_automation: "Automation",
      category_general: "Generelt",
    },
    automations: {
      x_of_y_active: "aktive",
      automated_actions: "automatiske handlinger denne måned",
      this_month: "denne måned",
      running: "Kører",
      paused: "Sat på pause",
      no_automations: "Ingen automationer endnu",
      no_automations_sub: "Dine automatiske arbejdsgange vises her",
    },
    demand: {
      people_searching: "Så mange søger på det du tilbyder hver måned",
      your_products: "Dine ydelser",
      search_terms: "Søgeord",
      per_month_short: "/md.",
    },
    assets: {
      your_files: "Dine filer",
      file_singular: "fil",
      files_plural: "filer",
    },
    website: {
      pages_count: "sider",
      more_keywords: "flere",
    },
    execution: {
      at_risk: "i fare",
      overdue: "forsinket",
    },
  },
  ru: {
    common: {
      today: "Сегодня",
      yesterday: "Вчера",
      days_ago: "дн. назад",
      last_week: "На прошлой неделе",
      weeks_ago: "нед. назад",
    },
    activity: {
      total_actions: "сделано для вас",
      nothing_yet: "Пока ничего нет",
      nothing_yet_sub: "Здесь будут появляться обновления",
      category_seo: "SEO",
      category_ads: "Реклама",
      category_website: "Сайт",
      category_automation: "Автоматизация",
      category_general: "Общее",
    },
    automations: {
      x_of_y_active: "активно",
      automated_actions: "действий за этот месяц",
      this_month: "за этот месяц",
      running: "Работает",
      paused: "На паузе",
      no_automations: "Автоматизации пока нет",
      no_automations_sub: "Ваши автоматические процессы появятся здесь",
    },
    demand: {
      people_searching: "Столько людей ищут ваши услуги каждый месяц",
      your_products: "Ваши услуги",
      search_terms: "Запросы",
      per_month_short: "/мес.",
    },
    assets: {
      your_files: "Ваши файлы",
      file_singular: "файл",
      files_plural: "файлов",
    },
    website: {
      pages_count: "страниц",
      more_keywords: "ещё",
    },
    execution: {
      at_risk: "под угрозой",
      overdue: "просрочено",
    },
  },
  ro: {
    common: {
      today: "Azi",
      yesterday: "Ieri",
      days_ago: "zile în urmă",
      last_week: "Săptămâna trecută",
      weeks_ago: "săptămâni în urmă",
    },
    activity: {
      total_actions: "lucruri făcute pentru tine",
      nothing_yet: "Nimic de arătat încă",
      nothing_yet_sub: "Actualizările vor apărea aici",
      category_seo: "SEO",
      category_ads: "Reclame",
      category_website: "Website",
      category_automation: "Automatizare",
      category_general: "General",
    },
    automations: {
      x_of_y_active: "active",
      automated_actions: "acțiuni automate luna aceasta",
      this_month: "luna aceasta",
      running: "Activ",
      paused: "Pauză",
      no_automations: "Nicio automatizare încă",
      no_automations_sub: "Fluxurile automate vor apărea aici",
    },
    demand: {
      people_searching: "Atâția caută produsele tale în fiecare lună",
      your_products: "Produsele tale",
      search_terms: "Termeni de căutare",
      per_month_short: "/lună",
    },
    assets: {
      your_files: "Fișierele tale",
      file_singular: "fișier",
      files_plural: "fișiere",
    },
    website: {
      pages_count: "pagini",
      more_keywords: "mai multe",
    },
    execution: {
      at_risk: "risc",
      overdue: "întârziat",
    },
  },
  de: {
    common: {
      today: "Heute",
      yesterday: "Gestern",
      days_ago: "Tagen",
      last_week: "Letzte Woche",
      weeks_ago: "Wochen",
    },
    activity: {
      total_actions: "Dinge, die wir für Sie gemacht haben",
      nothing_yet: "Noch nichts zu zeigen",
      nothing_yet_sub: "Updates erscheinen hier",
      category_seo: "SEO",
      category_ads: "Werbung",
      category_website: "Website",
      category_automation: "Automatisierung",
      category_general: "Allgemein",
    },
    automations: {
      x_of_y_active: "aktiv",
      automated_actions: "automatische Aktionen diesen Monat",
      this_month: "diesen Monat",
      running: "Läuft",
      paused: "Pausiert",
      no_automations: "Noch keine Automatisierungen",
      no_automations_sub: "Ihre automatischen Abläufe erscheinen hier",
    },
    demand: {
      people_searching: "So viele suchen jeden Monat nach Ihren Produkten",
      your_products: "Ihre Produkte",
      search_terms: "Suchbegriffe",
      per_month_short: "/Mt.",
    },
    assets: {
      your_files: "Ihre Dateien",
      file_singular: "Datei",
      files_plural: "Dateien",
    },
    website: {
      pages_count: "Seiten",
      more_keywords: "weitere",
    },
    execution: {
      at_risk: "gefährdet",
      overdue: "überfällig",
    },
  },
  fr: {
    common: {
      today: "Aujourd'hui",
      yesterday: "Hier",
      days_ago: "jours",
      last_week: "La semaine dernière",
      weeks_ago: "semaines",
    },
    activity: {
      total_actions: "actions réalisées pour vous",
      nothing_yet: "Rien à afficher",
      nothing_yet_sub: "Les mises à jour apparaîtront ici",
      category_seo: "SEO",
      category_ads: "Publicités",
      category_website: "Site web",
      category_automation: "Automatisation",
      category_general: "Général",
    },
    automations: {
      x_of_y_active: "actives",
      automated_actions: "actions automatiques ce mois-ci",
      this_month: "ce mois-ci",
      running: "En cours",
      paused: "En pause",
      no_automations: "Pas encore d'automatisations",
      no_automations_sub: "Vos workflows automatiques apparaîtront ici",
    },
    demand: {
      people_searching: "Nombre de recherches mensuelles pour vos produits",
      your_products: "Vos produits",
      search_terms: "Termes de recherche",
      per_month_short: "/mois",
    },
    assets: {
      your_files: "Vos fichiers",
      file_singular: "fichier",
      files_plural: "fichiers",
    },
    website: {
      pages_count: "pages",
      more_keywords: "de plus",
    },
    execution: {
      at_risk: "à risque",
      overdue: "en retard",
    },
  },
  es: {
    common: {
      today: "Hoy",
      yesterday: "Ayer",
      days_ago: "días",
      last_week: "La semana pasada",
      weeks_ago: "semanas",
    },
    activity: {
      total_actions: "cosas que hicimos por ti",
      nothing_yet: "Nada que mostrar aún",
      nothing_yet_sub: "Las actualizaciones aparecerán aquí",
      category_seo: "SEO",
      category_ads: "Anuncios",
      category_website: "Web",
      category_automation: "Automatización",
      category_general: "General",
    },
    automations: {
      x_of_y_active: "activas",
      automated_actions: "acciones automáticas este mes",
      this_month: "este mes",
      running: "Activa",
      paused: "Pausada",
      no_automations: "Aún no hay automatizaciones",
      no_automations_sub: "Tus flujos automáticos aparecerán aquí",
    },
    demand: {
      people_searching: "Personas que buscan tus productos cada mes",
      your_products: "Tus productos",
      search_terms: "Términos de búsqueda",
      per_month_short: "/mes",
    },
    assets: {
      your_files: "Tus archivos",
      file_singular: "archivo",
      files_plural: "archivos",
    },
    website: {
      pages_count: "páginas",
      more_keywords: "más",
    },
    execution: {
      at_risk: "en riesgo",
      overdue: "atrasado",
    },
  },
};

// Merge new keys into each language
const ui = data.ui_labels;
for (const [lang, sections] of Object.entries(NEW_KEYS)) {
  if (!ui[lang]) continue;
  for (const [section, keys] of Object.entries(sections)) {
    if (!ui[lang][section]) ui[lang][section] = {};
    for (const [key, val] of Object.entries(keys)) {
      if (!ui[lang][section][key]) {
        ui[lang][section][key] = val;
      }
    }
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
console.log("Done! Added missing keys to all languages.");

// Verify
const verify = JSON.parse(readFileSync(filePath, "utf-8"));
const enKeys = {};
for (const [sec, keys] of Object.entries(verify.ui_labels.en)) {
  for (const k of Object.keys(keys)) {
    enKeys[`${sec}.${k}`] = true;
  }
}

for (const lang of Object.keys(verify.ui_labels)) {
  if (lang === "en") continue;
  const missing = [];
  for (const fullKey of Object.keys(enKeys)) {
    const [sec, k] = fullKey.split(".");
    if (!verify.ui_labels[lang]?.[sec]?.[k]) missing.push(fullKey);
  }
  if (missing.length > 0) {
    console.log(`${lang}: missing ${missing.length} keys: ${missing.join(", ")}`);
  } else {
    console.log(`${lang}: all keys present`);
  }
}
