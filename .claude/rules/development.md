# Development Rules

## Signal Reactivity

- Every public reactive value MUST be a `Signal<T>` or `Computed<T>` — never a raw value that could go stale.
- Use `batch()` when setting multiple signals in a single operation to coalesce notifications.
- Use `signal.peek()` when reading without subscribing (e.g., inside event handlers, snapshot code).
- Use `effect()` for reactive option tracking in TanStack adapters — it auto-disposes with the component's EffectScope.
- Never read signals inside constructors or module-level code — only inside effects, computeds, or component render functions.

## Package Boundaries

- Each package is independent. Never import from another `@pyreon/*` fundamentals package's `src/` directly — use the package name.
- Peer dependencies (`@pyreon/core`, `@pyreon/reactivity`) are resolved at the consumer's level — never bundle them.
- TanStack `*-core` packages are direct dependencies (not peers) since consumers shouldn't need to install them separately.
- Duck-type external library interfaces (like Zod, Valibot) instead of importing their types — avoids hard version coupling.

## Context Pattern

All context-based APIs follow the same structure:

```typescript
const XContext = createContext<T | null>(null)

function XProvider(props) {
  const frame = new Map([[XContext.id, props.instance]])
  pushContext(frame)
  onUnmount(() => popContext())
  // render children
}

function useX(): T {
  const instance = useContext(XContext)
  if (!instance) throw new Error("useX() must be used within <XProvider>")
  return instance
}
```

Packages using this: `query`, `form`, `i18n`.

## Devtools Pattern

Devtools use WeakRef registries via `./devtools` subpath exports:

- Registration is opt-in (consumer calls `registerX()`)
- `WeakRef` prevents devtools from keeping instances alive
- `getActiveX()` cleans up dead refs on access
- Listeners via `onXChange()` for reactive devtools UIs
- `_resetDevtools()` internal export for test cleanup

## Error Messages

Prefix all thrown errors with the package name: `[@pyreon/package-name] description`.

## Testing

- Run tests from the package directory: `cd packages/[name] && bunx vitest run`
- Running from root requires `--config` or workspace filtering
- Use `mountWith()` helper to test hooks that require component lifecycle
- Always `unmount()` and `el.remove()` in tests to prevent DOM leaks
- Use `afterEach(() => resetX())` for singleton registries (stores, hooks, devtools)
