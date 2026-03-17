# @pyreon/i18n

Reactive internationalization for Pyreon. Async namespace loading, pluralization, interpolation, and rich text.

## Install

```bash
bun add @pyreon/i18n
```

## Quick Start

```ts
import { h } from "@pyreon/core"
import { createI18n, I18nProvider, useI18n } from "@pyreon/i18n"

const i18n = createI18n({
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      greeting: "Hello, {{name}}!",
      items_one: "{{count}} item",
      items_other: "{{count}} items",
    },
    de: {
      greeting: "Hallo, {{name}}!",
    },
  },
})

i18n.t("greeting", { name: "Alice" }) // "Hello, Alice!"
i18n.t("items", { count: 3 })         // "3 items"

i18n.locale.set("de")
i18n.t("greeting", { name: "Alice" }) // "Hallo, Alice!"
```

## API

- `createI18n(options)` — create i18n instance with static messages and/or async loader
- `t(key, values?)` — translate with `{{interpolation}}` and pluralization
- `loadNamespace(ns)` — async namespace loading with deduplication
- `I18nProvider` / `useI18n()` — context pattern
- `Trans` — component for rich JSX interpolation in translations
- `interpolate(text, values?)` — standalone string template function
- `resolvePluralCategory(locale, count)` — CLDR plural form resolution
