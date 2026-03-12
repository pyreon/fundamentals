# Pyreon Fundamentals — Ecosystem Libraries

## Overview
Ecosystem packages for the Pyreon UI framework. Forms, state management, i18n, TanStack integrations.
All packages under `@pyreon/*` scope. Monorepo managed by Bun workspaces.

## Package Overview
| Package | Description |
|---|---|
| `@pyreon/form` | Signal-based form management — fields, validation, submission, arrays |
| `@pyreon/validation` | Schema adapters for forms (Zod, Valibot, ArkType) |
| `@pyreon/query` | Pyreon adapter for TanStack Query |
| `@pyreon/table` | Pyreon adapter for TanStack Table |
| `@pyreon/virtual` | Pyreon adapter for TanStack Virtual |
| `@pyreon/store` | Global state management — Pinia-inspired composition stores |
| `@pyreon/state-tree` | Structured reactive state tree — models, snapshots, patches, middleware |
| `@pyreon/i18n` | Reactive i18n with async namespace loading, plurals, interpolation |

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
  "main": "./lib/index.js",
  "module": "./lib/index.js",
  "types": "./lib/types/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./lib/index.js",
      "types": "./lib/types/index.d.ts"
    }
  },
  "scripts": {
    "build": "vl_rolldown_build",
    "dev": "vl_rolldown_build-watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

### Peer Dependencies
- Most packages peer on `@pyreon/core` and `@pyreon/reactivity` (>=0.0.1)
- Dev dependencies use `file:` paths to `../../../pyreon/packages/[name]`
- TanStack packages (`query`, `table`, `virtual`) have `@tanstack/*-core` as direct deps

### Testing
- Vitest 4 with `happy-dom` environment
- Test files at `packages/[name]/src/tests/[name].test.ts`
- Each package has its own `vitest.config.ts` using `createVitestConfig` from `@vitus-labs/tools-vitest`

### Linting
- Biome with `@vitus-labs/tools-lint/biome` preset
- `noNonNullAssertion` disabled
- Ignores: `node_modules`, `lib`, `dist`, `*.d.ts`

## Key Technical Details

### @pyreon/store
- `createStore(id, setup)` — Pinia-style composition stores
- Setup function receives reactive primitives, returns public API
- Singleton by ID with `setStoreRegistryProvider()` for SSR isolation
- `resetStore(id)` / `resetAllStores()` for testing

### @pyreon/state-tree
- `model({ state, actions, views })` — structured reactive models
- `getSnapshot(model)` → typed deep snapshot (recursive `Snapshot<T>` type)
- `applyPatch(model, patch)` / `onPatch(model, listener)` — JSON patches
- `addMiddleware(model, fn)` — intercept actions
- `resetHook(id)` / `resetAllHooks()` for testing singleton hooks

### @pyreon/form
- `createForm({ initialValues, onSubmit, validate? })` — returns reactive form state
- Field-level and form-level validation
- Array fields with `push`, `remove`, `move`
- Integration with `@pyreon/validation` for schema-based validation

### @pyreon/i18n
- `createI18n({ locale, messages, loadNamespace? })` — reactive i18n instance
- `t(key, params?)` — interpolation with `{name}` syntax
- Pluralization, namespace lazy loading, locale switching
- `I18nProvider` + `useI18n()` context pattern

### @pyreon/validation
- Multi-export: `@pyreon/validation/zod`, `@pyreon/validation/valibot`, `@pyreon/validation/arktype`
- Each adapter wraps schema library into `@pyreon/form`-compatible validator

## Scripts
```bash
bun run build       # Build all packages (rolldown)
bun run test        # Test all packages (vitest)
bun run typecheck   # Type check all packages
bun run lint        # Biome lint
bun run format      # Biome format
```

## Documentation
Comprehensive docs in `/docs/` covering all 8 packages with installation, quick start, API reference, and patterns.
