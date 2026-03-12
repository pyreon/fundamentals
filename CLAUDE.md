# Pyreon Fundamentals — Ecosystem Libraries

## Overview

Ecosystem packages for the Pyreon UI framework. Forms, state management, i18n, TanStack integrations.
All packages under `@pyreon/*` scope. Monorepo managed by Bun workspaces.

## Package Overview

| Package | Description |
|---|---|
| `@pyreon/form` | Signal-based form management — fields, validation, submission, arrays, context |
| `@pyreon/validation` | Schema adapters for forms (Zod, Valibot, ArkType) |
| `@pyreon/query` | Pyreon adapter for TanStack Query |
| `@pyreon/table` | Pyreon adapter for TanStack Table |
| `@pyreon/virtual` | Pyreon adapter for TanStack Virtual |
| `@pyreon/store` | Global state management — Pinia-inspired composition stores |
| `@pyreon/state-tree` | Structured reactive state tree — models, snapshots, patches, middleware |
| `@pyreon/i18n` | Reactive i18n with async namespace loading, plurals, interpolation |
| `@pyreon/storybook` | Storybook renderer — mount, render, and interact with Pyreon components |

## Ecosystem Context

This repo depends on the core Pyreon framework at `../pyreon` (linked via `overrides` in root `package.json`):

- `@pyreon/reactivity` — signals, computed, effect, batch
- `@pyreon/core` — h(), VNode, Fragment, lifecycle, context

The meta-framework at `../zero` (Pyreon Zero) consumes packages from both repos.

## Workspace Resolution

Each package exports `"bun": "./src/index.ts"` so no build step needed in dev. Root tsconfig has `customConditions: ["bun"]`.

## Monorepo Conventions

### Package Structure

```
packages/[name]/
  src/
    index.ts          → public API exports
    tests/
      [name].test.ts  → vitest tests
  package.json
  tsconfig.json
  vitest.config.ts
```

### package.json Pattern

```json
{
  "name": "@pyreon/[name]",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": { "bun": "./src/index.ts", "import": "./lib/index.js", "types": "./lib/types/index.d.ts" }
  },
  "scripts": {
    "build": "vl_rolldown_build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

### Dependencies

- Most packages peer on `@pyreon/core` and `@pyreon/reactivity` (>=0.0.1)
- Dev dependencies use `file:` paths to `../../../pyreon/packages/[name]`
- TanStack packages (`query`, `table`, `virtual`) have `@tanstack/*-core` as direct deps

### Testing & Linting

- Vitest 4 with `happy-dom` environment, `createVitestConfig` from `@vitus-labs/tools-vitest`
- Biome with `@vitus-labs/tools-lint/biome` preset, `noNonNullAssertion` disabled

## Key Technical Details

### @pyreon/store

- `defineStore(id, setup)` — Pinia-style composition stores, singleton by ID
- Auto-classifies setup returns: signals → `$state`/`$patch`/`$reset`, functions → wrapped actions
- `$patch(obj|fn)`, `$subscribe(cb, {immediate?})`, `$onAction(cb)` (handles sync + async), `$reset()`, `$dispose()`
- `addStorePlugin(plugin)`, `setStoreRegistryProvider()` for SSR, `resetStore(id)` / `resetAllStores()`

### @pyreon/state-tree

- `model({ state, views, actions })` — structured reactive models with nested composition
- `ModelDefinition.create(initial?)` / `.asHook(id)` — instances or singleton hooks
- `getSnapshot(instance)` / `applySnapshot(instance, snapshot)` — typed recursive serialization
- `onPatch(instance, listener)` / `applyPatch(instance, patch|patches)` — JSON patch record/replay
- `addMiddleware(instance, fn)` — action interception chain

### @pyreon/form

- `useForm({ initialValues, onSubmit, validators?, schema?, validateOn?, debounceMs? })` — reactive form state
- `useField(form, name)` — single-field hook with `hasError`, `showError`, `register()`
- `useFieldArray(initial?)` — dynamic array fields with stable keys, append/remove/move/swap
- `useWatch(form, name?)` — reactive field watcher (single, multiple, or all fields)
- `useFormState(form, selector?)` — computed form state summary (errors, dirty/touched fields)
- `FormProvider` / `useFormContext()` — context pattern for nested components

### @pyreon/i18n

- `createI18n({ locale, messages, loader?, fallbackLocale?, pluralRules?, onMissingKey? })`
- `t(key, values?)` — interpolation with `{{name}}`, pluralization with `_one`/`_other` suffixes
- Namespace lazy loading with deduplication, `addMessages()` for runtime additions
- `I18nProvider` / `useI18n()` context, `<Trans>` component for rich JSX interpolation

### @pyreon/query

- Full TanStack Query adapter: `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueries`
- Suspense: `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `QuerySuspense` boundary
- `useIsFetching`, `useIsMutating`, `QueryErrorResetBoundary`, `useQueryErrorResetBoundary`
- Fine-grained signals per field (data, error, isFetching independent), reactive options via function getter

### @pyreon/table

- `useTable(options)` — reactive TanStack Table with signal-driven options, auto state sync
- `flexRender(component, props)` — renders column def templates (strings, functions, VNodes)

### @pyreon/virtual

- `useVirtualizer(options)` — element-scoped with reactive `virtualItems`, `totalSize`, `isScrolling`
- `useWindowVirtualizer(options)` — window-scoped variant with SSR-safe checks

### @pyreon/validation

- `zodSchema()` / `zodField()` — duck-typed Zod adapter (works with v3 and v4)
- `valibotSchema(schema, safeParseFn)` / `valibotField()` — Valibot standalone-function style
- `arktypeSchema()` / `arktypeField()` — ArkType sync adapter

### @pyreon/storybook

- `renderToCanvas(context, canvasElement)` — core renderer: mounts VNode, cleans up previous, shows errors
- `defaultRender(component, args)` — default `h(component, args)` when no custom render provided
- `Meta<TComponent>` / `StoryObj<TMeta>` — typed story definitions with args inference
- `DecoratorFn<TArgs>` — story decorators wrapping via `(storyFn, context) => VNodeChild`
- Preset: `framework: "@pyreon/storybook"` in `.storybook/main.ts`
- Re-exports `h`, `Fragment`, `signal`, `computed`, `effect`, `mount` for story convenience

## Devtools

Stateful packages expose `./devtools` subpath exports (`@pyreon/[name]/devtools`) with WeakRef-based registries for introspection. Tree-shakeable — zero cost unless imported.

## CI & Release

- Changesets for fixed versioning (all 9 packages share one version)
- CI: lint, typecheck, test+coverage, security audit, dependency review, CodeQL
- Release via `changesets/action` in GitHub Actions

## Scripts

```bash
bun run build       # Build all packages (rolldown)
bun run test        # Test all packages (vitest)
bun run typecheck   # Type check all packages
bun run lint        # Biome lint
bun run format      # Biome format
```
