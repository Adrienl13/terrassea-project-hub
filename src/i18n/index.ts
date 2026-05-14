// ============================================================================
// i18n bootstrap — lazy-loaded locales.
//
// Origin : Mobile Performance Lot 3 (Dette 98, 2026-05-14).
//
// Previously all 4 locale JSONs (en/fr/es/it) were statically imported at
// startup, bundling ~1067 KB raw / 286 KB gzip into index.js — about 86 % of
// the chunk weight. With dynamic imports, only the active language is fetched
// at first paint ; the other locales are loaded on demand when the user
// switches via the language picker.
//
// Rollup splits each /locales/*.json into its own chunk thanks to the
// dynamic import pattern with a static path inferable from the variable.
// ============================================================================

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

type SupportedLng = "en" | "fr" | "es" | "it";
const SUPPORTED: SupportedLng[] = ["en", "fr", "es", "it"];

function normaliseLng(lng: string | null | undefined): SupportedLng {
  if (!lng) return "en";
  const base = lng.split("-")[0].toLowerCase() as SupportedLng;
  return SUPPORTED.includes(base) ? base : "en";
}

function detectInitial(): SupportedLng {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem("i18nextLng");
    if (stored) return normaliseLng(stored);
  } catch {
    /* localStorage may be blocked */
  }
  return normaliseLng(window.navigator?.language);
}

async function loadLocale(lng: SupportedLng): Promise<Record<string, unknown>> {
  // The static base + variable suffix lets Rollup split each JSON into its own
  // chunk while still allowing runtime selection.
  switch (lng) {
    case "fr":
      return (await import("./locales/fr.json")).default as Record<string, unknown>;
    case "es":
      return (await import("./locales/es.json")).default as Record<string, unknown>;
    case "it":
      return (await import("./locales/it.json")).default as Record<string, unknown>;
    case "en":
    default:
      return (await import("./locales/en.json")).default as Record<string, unknown>;
  }
}

const initial = detectInitial();

// Synchronous init with an empty bundle so React Query, Suspense and useTranslation
// have a stable i18n instance from frame 1. The initial locale bundle is added
// asynchronously below ; useTranslation will re-render once it lands.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { [initial]: { translation: {} } },
    lng: initial,
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });

// Track which locales have been loaded to avoid duplicate fetches on rapid
// language changes.
const loaded = new Set<SupportedLng>();

async function ensureLocale(lng: SupportedLng): Promise<void> {
  if (loaded.has(lng)) return;
  loaded.add(lng);
  const bundle = await loadLocale(lng);
  i18n.addResourceBundle(lng, "translation", bundle, true, true);
  // Force re-render listeners now that the bundle is available.
  if (i18n.language === lng) {
    i18n.changeLanguage(lng);
  }
}

// Kick off initial locale load.
void ensureLocale(initial);

// On user-driven language change, lazy-load the new locale.
i18n.on("languageChanged", (lng) => {
  const norm = normaliseLng(lng);
  void ensureLocale(norm);
});

export default i18n;
