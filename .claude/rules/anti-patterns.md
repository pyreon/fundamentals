# Anti-Patterns to Avoid

## Reactivity Mistakes

- **Stale closures**: Don't capture `signal.peek()` in a closure that outlives the current tick. Use `signal()` (subscribing read) inside effects/computeds.
- **Missing batch**: Setting 3+ signals in sequence without `batch()` causes 3 separate notification flushes. Always batch.
- **Effect in effect**: Never nest `effect()` calls. Use `computed()` for derived values, `effect()` only for side effects.
- **Signal in hot path**: Don't create signals inside render functions or loops. Create them once in setup/hook.

## Architecture Mistakes

- **Circular imports**: `patch.ts` uses a local `snapshotValue()` instead of importing from `snapshot.ts` — this is intentional to avoid circular deps. Respect these boundaries.
- **Bundling peers**: Never add `@pyreon/core` or `@pyreon/reactivity` to `dependencies` — they must be `peerDependencies`.
- **Over-abstracting adapters**: TanStack adapters (query, table, virtual) should be thin wrappers. Don't add features that don't exist in the core library.
- **Hard-typing externals**: Don't import Zod/Valibot/ArkType types. Use duck-typed interfaces so adapters work across versions.

## Testing Mistakes

- **Running `bun test`**: This uses Bun's native test runner, not Vitest. Always use `bunx vitest run`.
- **Missing cleanup**: Forgetting `resetAllStores()`, `resetAllHooks()`, or `_resetDevtools()` in `afterEach` causes test pollution.
- **Fake timers**: Don't use `vi.useFakeTimers()` — the reactivity system doesn't work well with them. Use real `setTimeout` + `await`.
- **Testing internals**: Test the public API, not internal implementation details. Don't import from files other than `index.ts` in tests (except `registry.ts` for meta assertions).

## File Organization Mistakes

- **Giant files**: If a source file exceeds ~300 lines, consider splitting (like store's `registry.ts` extraction).
- **Tests in wrong location**: Tests go in `src/tests/`, not `__tests__/` or root `tests/`.
- **Missing exports**: Every new public function/type must be exported from `src/index.ts`.
