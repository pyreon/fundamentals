# Workflow Rules

## Before Writing Code

- Read the existing source files before modifying. Understand the patterns already in use.
- Check CLAUDE.md for the package's API surface — don't duplicate existing functionality.
- For new features, check if the pattern exists in another package (e.g., context pattern in query/i18n/form).

## Code Changes

- Keep changes minimal. One feature per file change. Don't refactor adjacent code.
- Follow existing naming: `useX` for hooks, `XProvider`/`useXContext` for context, `createX` for factories.
- Export types separately from runtime code in `index.ts`.
- New public APIs need JSDoc with `@example` blocks.
- No unused imports, no dead code, no `// TODO` comments in committed code.

## Testing Changes

- Every new public API needs tests. Aim for >90% branch coverage.
- Test error cases (throws, invalid inputs, edge cases) not just happy paths.
- For async code, use `await new Promise(r => setTimeout(r, N))` — not fake timers.
- Test files live at `packages/[name]/src/tests/[name].test.ts`.
- Run the package's tests after changes: `cd packages/[name] && bunx vitest run`.

## Validation Checklist

Before considering work complete:

1. Tests pass: `bunx vitest run` in the package directory
2. Exports updated: new APIs added to `src/index.ts` with type exports
3. CLAUDE.md updated if the package's API surface changed
4. No breaking changes to existing public APIs without discussion

## Git Practices

- Don't commit unless explicitly asked.
- Never force push, never amend published commits.
- Use descriptive commit messages focused on "why" not "what".
- Stage specific files, not `git add .`.

## Context Management

- Use `/compact` at ~50% context usage for long sessions.
- Start complex multi-package tasks in plan mode.
- Break work into steps that can complete within a single context window.
- Use subagents for parallel independent research (e.g., reading multiple packages).
