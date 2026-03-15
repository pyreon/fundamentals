/**
 * @pyreon/i18n — Basic Internationalization
 *
 * Demonstrates:
 * - createI18n() with static messages
 * - t() for translation with interpolation
 * - Locale switching (reactive signal)
 * - Nested keys with dot notation
 * - Fallback locale
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { effect } from "@pyreon/reactivity"
import { createI18n } from "@pyreon/i18n"

// ─── Create i18n instance with static messages ──────────────────────────────

const i18n = createI18n({
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      greeting: "Hello, {{name}}!",
      nav: {
        home: "Home",
        about: "About",
        contact: "Contact Us",
      },
      auth: {
        login: "Log In",
        logout: "Log Out",
        welcome: "Welcome back, {{name}}",
      },
      items: {
        count_one: "{{count}} item",
        count_other: "{{count}} items",
      },
    },
    de: {
      greeting: "Hallo, {{name}}!",
      nav: {
        home: "Startseite",
        about: "Über uns",
        contact: "Kontakt",
      },
      auth: {
        login: "Anmelden",
        logout: "Abmelden",
        welcome: "Willkommen zurück, {{name}}",
      },
      items: {
        count_one: "{{count}} Artikel",
        count_other: "{{count}} Artikel",
      },
    },
    ja: {
      greeting: "こんにちは、{{name}}さん！",
      nav: {
        home: "ホーム",
        about: "概要",
        contact: "お問い合わせ",
      },
    },
  },
})

// ─── Basic translation ───────────────────────────────────────────────────────

console.log(i18n.t("greeting", { name: "Alice" })) // "Hello, Alice!"

// Nested keys with dot notation
console.log(i18n.t("nav.home")) // "Home"
console.log(i18n.t("auth.welcome", { name: "Bob" })) // "Welcome back, Bob"

// Pluralization — uses _one/_other suffixes
console.log(i18n.t("items.count", { count: 1 })) // "1 item"
console.log(i18n.t("items.count", { count: 5 })) // "5 items"

// ─── Locale switching ────────────────────────────────────────────────────────

// locale is a reactive signal
i18n.locale.set("de")
console.log(i18n.t("greeting", { name: "Alice" })) // "Hallo, Alice!"
console.log(i18n.t("nav.home")) // "Startseite"

// Fallback: Japanese doesn't have auth keys → falls back to English
i18n.locale.set("ja")
console.log(i18n.t("nav.home")) // "ホーム"
console.log(i18n.t("auth.login")) // "Log In" (fallback to English)

// ─── Reactive translation in effects ─────────────────────────────────────────

effect(() => {
  // This re-runs whenever locale changes
  console.log("Current greeting:", i18n.t("greeting", { name: "World" }))
})

i18n.locale.set("en") // Effect fires: "Hello, World!"
i18n.locale.set("de") // Effect fires: "Hallo, World!"

// ─── Utility methods ─────────────────────────────────────────────────────────

console.log(i18n.exists("nav.home")) // true
console.log(i18n.exists("nonexistent.key")) // false
console.log(i18n.availableLocales()) // ["en", "de", "ja"]

// Add messages at runtime
i18n.addMessages("fr", {
  greeting: "Bonjour, {{name}} !",
  nav: { home: "Accueil" },
})
console.log(i18n.availableLocales()) // ["en", "de", "ja", "fr"]
