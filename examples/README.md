# Pyreon Fundamentals — Examples

Comprehensive examples for every `@pyreon/*` ecosystem package, including cross-package integrations and devtools usage.

> **Note:** These are illustrative code examples, not runnable apps. They demonstrate API usage patterns and best practices for each package.

## Package Examples

### [@pyreon/store](./store/)

Global state management with composition stores returning `StoreApi<T>`.

| Example | Description |
|---|---|
| [counter-store.ts](./store/counter-store.ts) | Basic store with signals, computeds, actions, `patch`, `subscribe`, `reset` |
| [todo-store.ts](./store/todo-store.ts) | Complex state with arrays, async actions, `onAction` listeners |
| [plugins.ts](./store/plugins.ts) | Store plugins: logger, localStorage persistence, undo history |
| [ssr.ts](./store/ssr.ts) | SSR-safe isolated registries with `AsyncLocalStorage` |
| [lifecycle-and-actions.ts](./store/lifecycle-and-actions.ts) | `onAction` async/sync, `subscribe({immediate})`, `dispose`, `state`, `resetStore`/`resetAllStores` |

### [@pyreon/state-tree](./state-tree/)

Structured reactive state tree with models, snapshots, patches, and middleware.

| Example | Description |
|---|---|
| [counter-model.ts](./state-tree/counter-model.ts) | Basic model with state, views, actions, `.create()`, `.asHook()` |
| [nested-models.ts](./state-tree/nested-models.ts) | Composing models via nested `ModelDefinition` state fields |
| [patches-and-middleware.ts](./state-tree/patches-and-middleware.ts) | JSON patch recording/replay, action middleware for interception |
| [devtools-and-hooks.ts](./state-tree/devtools-and-hooks.ts) | Devtools registration, `getActiveModels`, `getModelSnapshot`, `resetHook`/`resetAllHooks` |

### [@pyreon/form](./form/)

Signal-based form management with fields, validation, submission, and arrays.

| Example | Description |
|---|---|
| [basic-form.ts](./form/basic-form.ts) | Login form with `useForm`, `register()`, field validators |
| [advanced-form.ts](./form/advanced-form.ts) | `useField`, `useWatch`, `useFormState`, async + cross-field validation |
| [field-arrays.ts](./form/field-arrays.ts) | Dynamic lists with `useFieldArray` — append, remove, move, swap |
| [form-context.ts](./form/form-context.ts) | `FormProvider` / `useFormContext` for nested component composition |
| [register-options-and-validation-modes.ts](./form/register-options-and-validation-modes.ts) | `type: 'checkbox'`/`'number'`, `validateOn` modes, `debounceMs`, `setErrors`/`clearErrors`/`resetField`/`validate` |

### [@pyreon/validation](./validation/)

Schema adapters for forms — Zod, Valibot, and ArkType.

| Example | Description |
|---|---|
| [zod-validation.ts](./validation/zod-validation.ts) | `zodSchema()` and `zodField()` with Zod v3/v4 |
| [valibot-validation.ts](./validation/valibot-validation.ts) | `valibotSchema()` and `valibotField()` with explicit `safeParse` |
| [arktype-validation.ts](./validation/arktype-validation.ts) | `arktypeSchema()` and `arktypeField()` with ArkType syntax |
| [utilities-and-subpaths.ts](./validation/utilities-and-subpaths.ts) | `issuesToRecord()`, subpath imports, custom adapters, mixing libraries |

### [@pyreon/i18n](./i18n/)

Reactive internationalization with async namespace loading and pluralization.

| Example | Description |
|---|---|
| [basic-i18n.ts](./i18n/basic-i18n.ts) | Static messages, `t()` interpolation, locale switching, plurals |
| [namespaces-and-lazy-loading.ts](./i18n/namespaces-and-lazy-loading.ts) | Async `loader`, `loadNamespace()`, `isLoading`, `onMissingKey` |
| [rich-text-and-context.ts](./i18n/rich-text-and-context.ts) | `<Trans>` component, `I18nProvider` / `useI18n`, custom plural rules |
| [utilities-and-devtools.ts](./i18n/utilities-and-devtools.ts) | `interpolate()`, `resolvePluralCategory()`, `parseRichText()`, devtools registration |

### [@pyreon/query](./query/)

Pyreon adapter for TanStack Query — data fetching, caching, and synchronization.

| Example | Description |
|---|---|
| [basic-queries.ts](./query/basic-queries.ts) | `useQuery`, `useMutation`, `QueryClientProvider`, reactive options |
| [infinite-and-suspense.ts](./query/infinite-and-suspense.ts) | `useInfiniteQuery`, `useSuspenseQuery`, `QuerySuspense`, `useQueries` |
| [ssr-and-caching.ts](./query/ssr-and-caching.ts) | `dehydrate`/`hydrate` SSR, `QueryCache`/`MutationCache`, `keepPreviousData`, `hashKey`, `CancelledError` |

### [@pyreon/table](./table/)

Pyreon adapter for TanStack Table — reactive data tables.

| Example | Description |
|---|---|
| [basic-table.ts](./table/basic-table.ts) | `useTable`, `flexRender`, sorting, filtering, pagination |
| [editable-table.ts](./table/editable-table.ts) | Row selection, inline editing, column visibility toggling |
| [advanced-features.ts](./table/advanced-features.ts) | Column grouping, column pinning, expandable sub-rows, aggregation |

### [@pyreon/virtual](./virtual/)

Pyreon adapter for TanStack Virtual — efficient rendering of large lists.

| Example | Description |
|---|---|
| [basic-virtualizer.ts](./virtual/basic-virtualizer.ts) | Element/window virtualizer, fixed/variable heights, virtual grid |
| [advanced-virtualizer.ts](./virtual/advanced-virtualizer.ts) | Dynamic measurement, `scrollToIndex`, horizontal list, reactive count |

### [@pyreon/storybook](./storybook/)

Storybook renderer for Pyreon components.

| Example | Description |
|---|---|
| [button-stories.ts](./storybook/button-stories.ts) | `Meta`, `StoryObj`, variants, decorators, play functions, reactive state |
| [storybook-config.ts](./storybook/storybook-config.ts) | Storybook configuration setup and quick reference |
| [advanced-stories.ts](./storybook/advanced-stories.ts) | `defaultRender`, `Fragment` stories, composed decorators, `InferProps`, `mount` |

---

## Cross-Package Integrations

Real-world patterns combining multiple packages together.

| Example | Packages | Description |
|---|---|---|
| [form-validation-query.ts](./integrations/form-validation-query.ts) | form + validation + query | Registration form with Zod schema, mutation submission, cache invalidation, server error mapping |
| [table-virtual-query.ts](./integrations/table-virtual-query.ts) | table + virtual + query | 50K-row log viewer with query fetching, table sorting/filtering, virtualized rendering |
| [store-query-i18n.ts](./integrations/store-query-i18n.ts) | store + query + i18n | Auth store with token-based queries, locale sync from user preferences, provider composition |
| [form-i18n.ts](./integrations/form-i18n.ts) | form + i18n | Translated form labels/placeholders/errors, locale-aware validators, language switcher |

---

## Devtools

Using the `./devtools` subpath exports for runtime inspection.

| Example | Package | Description |
|---|---|---|
| [store-devtools.ts](./devtools/store-devtools.ts) | store | `getRegisteredStores`, `getStoreById`, `onStoreChange`, devtools panel component |
| [form-devtools.ts](./devtools/form-devtools.ts) | form | `registerForm`, `getFormSnapshot`, `onFormChange`, form inspector component |
| [devtools-and-hooks.ts](./state-tree/devtools-and-hooks.ts) | state-tree | `registerInstance`, `getModelSnapshot`, `onModelChange`, hook lifecycle |
| [utilities-and-devtools.ts](./i18n/utilities-and-devtools.ts) | i18n | `registerI18n`, `getI18nSnapshot`, `onI18nChange` |

---

## API Coverage Matrix

Which APIs are demonstrated in which examples:

| API | Examples |
|---|---|
| `defineStore`, `StoreApi`, `patch`, `subscribe`, `reset` | counter-store, todo-store |
| `onAction` (sync + async), `dispose`, `state` | lifecycle-and-actions |
| `addStorePlugin`, `setStoreRegistryProvider` | plugins, ssr |
| `model`, `.create()`, `.asHook()` | counter-model |
| `getSnapshot`, `applySnapshot` | counter-model, nested-models |
| `onPatch`, `applyPatch`, `addMiddleware` | patches-and-middleware |
| `resetHook`, `resetAllHooks`, devtools | devtools-and-hooks |
| `useForm`, `register()`, `handleSubmit` | basic-form, advanced-form |
| `useField`, `useWatch`, `useFormState` | advanced-form |
| `useFieldArray` | field-arrays |
| `FormProvider`, `useFormContext` | form-context, form-i18n |
| `register({type: 'checkbox' \| 'number'})` | register-options |
| `validateOn`, `debounceMs` | register-options |
| `setErrors`, `clearErrors`, `resetField`, `validate` | register-options |
| `zodSchema`, `zodField` | zod-validation |
| `valibotSchema`, `valibotField` | valibot-validation |
| `arktypeSchema`, `arktypeField` | arktype-validation |
| `issuesToRecord`, subpath imports | utilities-and-subpaths |
| `createI18n`, `t()`, `locale` signal | basic-i18n |
| `loadNamespace`, `isLoading`, `onMissingKey` | namespaces-and-lazy-loading |
| `Trans`, `I18nProvider`, `useI18n` | rich-text-and-context |
| `interpolate`, `resolvePluralCategory`, `parseRichText` | utilities-and-devtools |
| `useQuery`, `useMutation`, `QueryClientProvider` | basic-queries |
| `useInfiniteQuery`, `useSuspenseQuery`, `QuerySuspense` | infinite-and-suspense |
| `useQueries`, `useIsFetching`, `useIsMutating` | infinite-and-suspense |
| `dehydrate`, `hydrate`, `keepPreviousData` | ssr-and-caching |
| `QueryCache`, `MutationCache`, `hashKey`, `CancelledError` | ssr-and-caching |
| `useTable`, `flexRender`, sorting, filtering, pagination | basic-table |
| Row selection, inline editing, column visibility | editable-table |
| Column grouping, pinning, expanding, aggregation | advanced-features |
| `useVirtualizer`, fixed/variable heights, grid | basic-virtualizer |
| `useWindowVirtualizer` | basic-virtualizer |
| `measureElement`, `scrollToIndex`, horizontal | advanced-virtualizer |
| `Meta`, `StoryObj`, `DecoratorFn`, play functions | button-stories |
| `defaultRender`, `Fragment`, `InferProps`, `mount` | advanced-stories |
