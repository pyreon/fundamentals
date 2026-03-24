# Pyreon Fundamentals

Ecosystem libraries for the [Pyreon](https://github.com/pyreon/pyreon) UI framework. Signal-based reactivity, fine-grained updates, zero virtual DOM overhead.

## Packages (18)

| Package | Description |
| --- | --- |
| [`@pyreon/store`](packages/store) | Global state management — composition stores returning `StoreApi<T>` |
| [`@pyreon/state-tree`](packages/state-tree) | Structured reactive state tree — models, snapshots, patches, middleware |
| [`@pyreon/form`](packages/form) | Signal-based form management — fields, validation, submission, arrays, context |
| [`@pyreon/validation`](packages/validation) | Schema adapters for forms (Zod, Valibot, ArkType) |
| [`@pyreon/query`](packages/query) | TanStack Query adapter with signal-driven results + WebSocket subscriptions |
| [`@pyreon/table`](packages/table) | TanStack Table adapter with reactive options and `flexRender` |
| [`@pyreon/virtual`](packages/virtual) | TanStack Virtual adapter — element and window virtualization |
| [`@pyreon/i18n`](packages/i18n) | Reactive i18n with async namespace loading, plurals, interpolation |
| [`@pyreon/feature`](packages/feature) | Schema-driven CRUD primitives — `defineFeature()` generates queries, forms, tables, store |
| [`@pyreon/charts`](packages/charts) | Reactive ECharts bridge with lazy loading and auto module detection |
| [`@pyreon/storage`](packages/storage) | Reactive client storage — localStorage, sessionStorage, cookies, IndexedDB |
| [`@pyreon/hotkeys`](packages/hotkeys) | Keyboard shortcut management — scope-aware, modifier keys, conflict detection |
| [`@pyreon/permissions`](packages/permissions) | Reactive permissions — type-safe, signal-driven (RBAC, ABAC, feature flags) |
| [`@pyreon/machine`](packages/machine) | Reactive state machines — constrained signals with type-safe transitions |
| [`@pyreon/flow`](packages/flow) | Reactive flow diagrams — signal-native nodes, edges, pan/zoom, auto-layout via elkjs |
| [`@pyreon/code`](packages/code) | Reactive code editor — CodeMirror 6, minimap, diff editor, tabbed editor |
| [`@pyreon/document`](packages/document) | Universal document rendering — one template, 14 output formats |
| [`@pyreon/storybook`](packages/storybook) | Storybook renderer for Pyreon components |

## Quick Start

```bash
bun add @pyreon/query @pyreon/form @pyreon/store
```

All packages peer-depend on `@pyreon/core` and `@pyreon/reactivity` (>=0.7.0 <0.8.0).

## Development

```bash
bun install          # Install dependencies
bun run test         # Run all tests (vitest)
bun run typecheck    # Type check all packages
bun run lint         # Biome lint
bun run format       # Biome format
bun run build        # Build all packages (rolldown)
```

## Documentation

- [pyreon.dev/docs](https://pyreon.dev/docs) — Full documentation
- [CLAUDE.md](CLAUDE.md) — AI agent instructions
- [llms.txt](llms.txt) — AI-discoverable project info

## License

MIT
