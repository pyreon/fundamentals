/**
 * @pyreon/i18n — Rich Text (Trans) & Context Pattern
 *
 * Demonstrates:
 * - <Trans> component for JSX interpolation in translations
 * - I18nProvider / useI18n context pattern
 * - Custom plural rules
 * - Rich text with embedded components
 */
import { h } from "@pyreon/core"
import type { ComponentFn, VNodeChild } from "@pyreon/core"
import { createI18n, I18nProvider, useI18n, Trans } from "@pyreon/i18n"

// ─── Create i18n with custom plural rules ────────────────────────────────────

const i18n = createI18n({
  locale: "en",
  messages: {
    en: {
      welcome: "Welcome to <bold>Pyreon</bold>!",
      terms: "By signing up, you agree to our <link>Terms of Service</link>.",
      notification: "You have <badge>{{count}}</badge> new messages.",
      items_one: "{{count}} item in your cart",
      items_other: "{{count}} items in your cart",
      items_zero: "Your cart is empty",
    },
    ar: {
      items_zero: "سلة التسوق فارغة",
      items_one: "عنصر واحد في سلة التسوق",
      items_two: "عنصران في سلة التسوق",
      items_few: "{{count}} عناصر في سلة التسوق",
      items_many: "{{count}} عنصرًا في سلة التسوق",
      items_other: "{{count}} عنصر في سلة التسوق",
    },
  },
  // Custom plural rules for Arabic (6 plural forms)
  pluralRules: {
    ar: (count: number) => {
      if (count === 0) return "zero"
      if (count === 1) return "one"
      if (count === 2) return "two"
      if (count >= 3 && count <= 10) return "few"
      if (count >= 11 && count <= 99) return "many"
      return "other"
    },
  },
})

// ─── Rich Text with <Trans> ─────────────────────────────────────────────────

const WelcomeBanner: ComponentFn = () => {
  return () =>
    h("div", { class: "banner" }, [
      // Trans replaces tagged parts with actual components
      h(Trans, {
        t: i18n.t,
        i18nKey: "welcome",
        components: {
          // <bold> in translation → rendered as <strong>
          bold: (children: VNodeChild) => h("strong", {}, children),
        },
      }),
    ])
  // Renders: Welcome to <strong>Pyreon</strong>!
}

const TermsNotice: ComponentFn = () => {
  return () =>
    h(Trans, {
      t: i18n.t,
      i18nKey: "terms",
      components: {
        // <link> in translation → rendered as <a>
        link: (children: VNodeChild) => h("a", { href: "/terms", target: "_blank" }, children),
      },
    })
  // Renders: By signing up, you agree to our <a href="/terms">Terms of Service</a>.
}

const NotificationBadge: ComponentFn<{ count: number }> = (props) => {
  return () =>
    h(Trans, {
      t: i18n.t,
      i18nKey: "notification",
      values: { count: props.count },
      components: {
        badge: (children: VNodeChild) => h("span", { class: "badge" }, children),
      },
    })
  // Renders: You have <span class="badge">5</span> new messages.
}

// ─── I18nProvider / useI18n Context ──────────────────────────────────────────

// Child component that consumes i18n from context
const CartSummary: ComponentFn = () => {
  const { t } = useI18n()

  return () =>
    h("div", {}, [
      h("p", {}, t("items", { count: 0 })), // "Your cart is empty"
      h("p", {}, t("items", { count: 1 })), // "1 item in your cart"
      h("p", {}, t("items", { count: 5 })), // "5 items in your cart"
    ])
}

// Language switcher using context
const LanguageSwitcher: ComponentFn = () => {
  const { locale } = useI18n()

  return () =>
    h("div", {}, [
      h("button", { onClick: () => locale.set("en"), class: locale() === "en" ? "active" : "" }, "English"),
      h("button", { onClick: () => locale.set("ar"), class: locale() === "ar" ? "active" : "" }, "العربية"),
    ])
}

// Root app wraps children with I18nProvider
const App: ComponentFn = () => {
  return () =>
    h(I18nProvider, { instance: i18n }, [
      h(LanguageSwitcher, {}),
      h(WelcomeBanner, {}),
      h(TermsNotice, {}),
      h(NotificationBadge, { count: 3 }),
      h(CartSummary, {}),
    ])
}
