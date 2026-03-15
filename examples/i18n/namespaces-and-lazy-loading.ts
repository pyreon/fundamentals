/**
 * @pyreon/i18n — Namespace Lazy Loading
 *
 * Demonstrates:
 * - Async namespace loading with loader function
 * - loadNamespace() for on-demand translation fetching
 * - isLoading / loadedNamespaces computed signals
 * - Namespace-prefixed keys ("namespace:key")
 * - onMissingKey handler for logging
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { effect } from "@pyreon/reactivity"
import { createI18n } from "@pyreon/i18n"
import type { TranslationDictionary } from "@pyreon/i18n"

// ─── Simulated translation files ─────────────────────────────────────────────

const translationFiles: Record<string, Record<string, TranslationDictionary>> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome to your dashboard, {{name}}",
      stats: {
        users: "Total Users",
        revenue: "Revenue",
      },
    },
    settings: {
      title: "Settings",
      theme: "Theme",
      language: "Language",
      notifications: "Notifications",
    },
  },
  de: {
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      loading: "Laden...",
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Willkommen auf deinem Dashboard, {{name}}",
      stats: {
        users: "Benutzer gesamt",
        revenue: "Umsatz",
      },
    },
  },
}

// ─── Create i18n with async loader ───────────────────────────────────────────

const i18n = createI18n({
  locale: "en",
  fallbackLocale: "en",

  // Loader simulates fetching translations from an API or file system
  loader: async (locale, namespace) => {
    console.log(`Loading translations: ${locale}/${namespace}`)

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 100))

    return translationFiles[locale]?.[namespace]
  },

  // Called when a key is not found in any locale
  onMissingKey: (locale, key, namespace) => {
    console.warn(`[i18n] Missing key: ${namespace ? `${namespace}:` : ""}${key} (locale: ${locale})`)
  },
})

// ─── Loading namespaces on demand ────────────────────────────────────────────

// Load the "common" namespace
await i18n.loadNamespace("common")
console.log(i18n.t("common:save")) // "Save"
console.log(i18n.t("common:cancel")) // "Cancel"

// Check loading state
effect(() => {
  if (i18n.isLoading()) {
    console.log("Translations are loading...")
  }
})

// Load dashboard namespace
await i18n.loadNamespace("dashboard")
console.log(i18n.t("dashboard:title")) // "Dashboard"
console.log(i18n.t("dashboard:welcome", { name: "Alice" })) // "Welcome to your dashboard, Alice"
console.log(i18n.t("dashboard:stats.users")) // "Total Users"

// Check what's loaded
console.log(i18n.loadedNamespaces()) // Set { "common", "dashboard" }

// ─── Namespace-prefixed keys ─────────────────────────────────────────────────

// "namespace:key" syntax
console.log(i18n.t("common:save")) // "Save"
console.log(i18n.t("dashboard:stats.revenue")) // "Revenue"

// Without prefix → uses default namespace (defaults to "common")
// This works if defaultNamespace is configured

// ─── Switching locale triggers re-loading ────────────────────────────────────

i18n.locale.set("de")

// Namespaces need to be re-loaded for the new locale
await i18n.loadNamespace("common")
await i18n.loadNamespace("dashboard")

console.log(i18n.t("common:save")) // "Speichern"
console.log(i18n.t("dashboard:welcome", { name: "Alice" })) // "Willkommen auf deinem Dashboard, Alice"

// ─── Component that loads translations ───────────────────────────────────────

const SettingsPage: ComponentFn = () => {
  // Load the settings namespace when component mounts
  i18n.loadNamespace("settings")

  return () => {
    if (i18n.isLoading()) {
      return h("div", {}, i18n.t("common:loading"))
    }

    return h("div", {}, [
      h("h1", {}, i18n.t("settings:title")),
      h("label", {}, i18n.t("settings:theme")),
      h("label", {}, i18n.t("settings:language")),
      h("label", {}, i18n.t("settings:notifications")),
    ])
  }
}
