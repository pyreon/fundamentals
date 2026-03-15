/**
 * @pyreon/state-tree — Patches & Middleware
 *
 * Demonstrates:
 * - onPatch() for recording state changes as JSON patches
 * - applyPatch() for replaying recorded changes
 * - addMiddleware() for intercepting and controlling action execution
 * - Undo/redo via patch recording
 */
import { computed } from "@pyreon/reactivity"
import { model, onPatch, applyPatch, addMiddleware, getSnapshot } from "@pyreon/state-tree"
import type { Patch, ActionCall } from "@pyreon/state-tree"

// ─── Define a model ──────────────────────────────────────────────────────────

const TodoList = model({
  state: {
    title: "My Todos",
    nextId: 1,
  },

  actions: (self) => ({
    setTitle: (title: string) => self.title.set(title),
    addTodo: () => {
      self.nextId.update((n) => n + 1)
    },
  }),
})

// ─── Patch Recording ─────────────────────────────────────────────────────────

const list = TodoList.create({ title: "Shopping List" })
const patches: Patch[] = []

// Record every state change as a JSON patch
const stopRecording = onPatch(list, (patch) => {
  patches.push(patch)
  console.log("Patch:", JSON.stringify(patch))
})

list.setTitle("Grocery List")
// Patch: {"op":"replace","path":"/title","value":"Grocery List"}

list.addTodo()
// Patch: {"op":"replace","path":"/nextId","value":2}

list.addTodo()
// Patch: {"op":"replace","path":"/nextId","value":3}

console.log("Recorded patches:", patches.length) // 3

// ─── Patch Replay ────────────────────────────────────────────────────────────

// Create a fresh instance and replay patches onto it
const replica = TodoList.create({ title: "Shopping List" })
console.log(replica.title()) // "Shopping List"

// Apply all recorded patches to replicate the state
for (const patch of patches) {
  applyPatch(replica, patch)
}

console.log(replica.title()) // "Grocery List"
console.log(replica.nextId()) // 3

// Or apply multiple patches at once (batched for performance)
const replica2 = TodoList.create({ title: "Shopping List" })
applyPatch(replica2, patches) // Pass entire array

// ─── Middleware ───────────────────────────────────────────────────────────────

const Settings = model({
  state: {
    theme: "light" as "light" | "dark",
    locked: false,
  },

  actions: (self) => ({
    setTheme: (theme: "light" | "dark") => self.theme.set(theme),
    lock: () => self.locked.set(true),
    unlock: () => self.locked.set(false),
  }),
})

const settings = Settings.create()

// Middleware that prevents actions when locked (except unlock)
addMiddleware(settings, (call: ActionCall, next) => {
  if (settings.locked.peek() && call.name !== "unlock") {
    console.log(`Blocked action "${call.name}" — settings are locked`)
    return // Don't call next() → action is prevented
  }
  return next(call)
})

// Logging middleware — runs for every action
addMiddleware(settings, (call: ActionCall, next) => {
  console.log(`[middleware] Before: ${call.name}(${call.args.join(", ")})`)
  const result = next(call)
  console.log(`[middleware] After: ${call.name}`)
  return result
})

settings.setTheme("dark") // Works — not locked
console.log(settings.theme()) // "dark"

settings.lock()
settings.setTheme("light") // Blocked by middleware
console.log(settings.theme()) // still "dark"

settings.unlock()
settings.setTheme("light") // Works again
console.log(settings.theme()) // "light"

// Cleanup
stopRecording()
