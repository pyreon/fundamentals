/**
 * @pyreon/i18n — Standalone Utilities & Devtools
 *
 * Demonstrates:
 * - interpolate() as a standalone string template function
 * - resolvePluralCategory() for plural form resolution
 * - parseRichText() for parsing tagged translation strings
 * - Devtools registration via @pyreon/i18n/devtools
 * - onI18nChange() for reactive devtools UIs
 */
import { createI18n, interpolate, resolvePluralCategory, parseRichText } from "@pyreon/i18n"
import type { PluralRules } from "@pyreon/i18n"
import {
  registerI18n,
  unregisterI18n,
  getActiveI18nInstances,
  getI18nInstance,
  getI18nSnapshot,
  onI18nChange,
  _resetDevtools,
} from "@pyreon/i18n/devtools"

// ─── interpolate() — standalone string templates ─────────────────────────────
// Works independently of any i18n instance.

console.log(interpolate("Hello, {{name}}!", { name: "Alice" }))
// "Hello, Alice!"

console.log(interpolate("{{count}} items at ${{price}} each", { count: 3, price: 9.99 }))
// "3 items at $9.99 each"

// Missing values leave the placeholder intact
console.log(interpolate("Hello, {{name}}!"))
// "Hello, {{name}}!"

// Whitespace in placeholders is trimmed
console.log(interpolate("Hello, {{ name }}!", { name: "Bob" }))
// "Hello, Bob!"

// Objects are JSON-stringified
console.log(interpolate("Data: {{obj}}", { obj: { a: 1 } } as any))
// 'Data: {"a":1}'

// ─── resolvePluralCategory() — plural form resolution ────────────────────────
// Returns the CLDR plural category for a count in a given locale.

console.log(resolvePluralCategory("en", 0)) // "other"
console.log(resolvePluralCategory("en", 1)) // "one"
console.log(resolvePluralCategory("en", 2)) // "other"
console.log(resolvePluralCategory("en", 100)) // "other"

// Different languages have different plural rules
console.log(resolvePluralCategory("ar", 0)) // "zero"
console.log(resolvePluralCategory("ar", 1)) // "one"
console.log(resolvePluralCategory("ar", 2)) // "two"
console.log(resolvePluralCategory("ar", 5)) // "few"
console.log(resolvePluralCategory("ar", 11)) // "many"

// Custom plural rules override Intl.PluralRules
const customRules: PluralRules = {
  ja: () => "other", // Japanese has no plural distinctions
  custom: (count) => (count === 0 ? "zero" : count === 1 ? "one" : "other"),
}

console.log(resolvePluralCategory("ja", 1, customRules)) // "other"
console.log(resolvePluralCategory("custom", 0, customRules)) // "zero"
console.log(resolvePluralCategory("custom", 1, customRules)) // "one"
console.log(resolvePluralCategory("custom", 5, customRules)) // "other"

// ─── parseRichText() — parse tagged translation strings ──────────────────────
// Splits a translation string into plain text and tagged parts.
// Used internally by <Trans>, but available standalone.

const parts = parseRichText("Welcome to <bold>Pyreon</bold> framework!")
console.log(parts)
// [
//   "Welcome to ",
//   { tag: "bold", children: "Pyreon" },
//   " framework!"
// ]

const parts2 = parseRichText("Click <link>here</link> to read our <link2>docs</link2>.")
console.log(parts2)
// [
//   "Click ",
//   { tag: "link", children: "here" },
//   " to read our ",
//   { tag: "link2", children: "docs" },
//   "."
// ]

// No tags — returns a single-element array
const parts3 = parseRichText("Just plain text")
console.log(parts3)
// ["Just plain text"]

// ─── i18n Devtools ───────────────────────────────────────────────────────────

const i18n = createI18n({
  locale: "en",
  messages: {
    en: { hello: "Hello", goodbye: "Goodbye" },
    de: { hello: "Hallo", goodbye: "Auf Wiedersehen" },
  },
})

const i18nAdmin = createI18n({
  locale: "en",
  messages: { en: { dashboard: "Dashboard" } },
})

// Register instances for devtools inspection
registerI18n("app", i18n as any)
registerI18n("admin", i18nAdmin as any)

// Query registered instances
console.log(getActiveI18nInstances()) // ["app", "admin"]

// Get instance reference
const inst = getI18nInstance("app")
console.log(inst) // The i18n instance

// Get a snapshot for display in devtools panel
console.log(getI18nSnapshot("app"))
// { locale: "en", ... }

// Listen for registration/unregistration changes
const stopListening = onI18nChange(() => {
  console.log("i18n instances changed:", getActiveI18nInstances())
})

// Unregister when done
unregisterI18n("admin")
// Listener fires: "i18n instances changed: ['app']"

// Cleanup
stopListening()
_resetDevtools()
