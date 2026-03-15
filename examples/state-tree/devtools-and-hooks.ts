/**
 * @pyreon/state-tree — Devtools & Hook Management
 *
 * Demonstrates:
 * - Devtools registration via @pyreon/state-tree/devtools
 * - WeakRef-based instance tracking
 * - onModelChange() for reactive devtools UIs
 * - getModelSnapshot() for inspection
 * - resetHook() / resetAllHooks() for singleton lifecycle
 * - .asHook() singleton patterns in components
 */
import { computed } from "@pyreon/reactivity"
import { model, resetHook, resetAllHooks, getSnapshot } from "@pyreon/state-tree"
import {
  registerInstance,
  unregisterInstance,
  getActiveModels,
  getModelInstance,
  getModelSnapshot,
  onModelChange,
  _resetDevtools,
} from "@pyreon/state-tree/devtools"

// ─── Define models ───────────────────────────────────────────────────────────

const Counter = model({
  state: { count: 0 },
  views: (self) => ({
    doubled: computed(() => self.count() * 2),
  }),
  actions: (self) => ({
    increment: () => self.count.update((c) => c + 1),
    reset: () => self.count.set(0),
  }),
})

const Timer = model({
  state: { seconds: 0, running: false },
  actions: (self) => ({
    tick: () => self.seconds.update((s) => s + 1),
    start: () => self.running.set(true),
    stop: () => self.running.set(false),
  }),
})

// ─── Devtools registration ───────────────────────────────────────────────────
// Uses WeakRef internally — devtools never prevent garbage collection.

const counter = Counter.create({ count: 5 })
const timer = Timer.create()

// Register instances with descriptive names
registerInstance("app-counter", counter)
registerInstance("main-timer", timer)

// ─── Querying registered models ──────────────────────────────────────────────

console.log(getActiveModels()) // ["app-counter", "main-timer"]

// Get a registered instance
const inst = getModelInstance("app-counter")
console.log(inst) // The counter model instance

// Get a snapshot for inspection (without needing the instance reference)
console.log(getModelSnapshot("app-counter")) // { count: 5 }
console.log(getModelSnapshot("main-timer")) // { seconds: 0, running: false }

// ─── Listening for changes (reactive devtools UI) ────────────────────────────

const stopListening = onModelChange(() => {
  console.log("Models changed! Active:", getActiveModels())
  // Refresh devtools panel...
  for (const name of getActiveModels()) {
    console.log(`  ${name}:`, getModelSnapshot(name))
  }
})

// Mutate — triggers devtools listener
counter.increment()
// Models changed! Active: ["app-counter", "main-timer"]
//   app-counter: { count: 6 }
//   main-timer: { seconds: 0, running: false }

// Unregister — also triggers listener
unregisterInstance("main-timer")
// Models changed! Active: ["app-counter"]

// ─── Singleton hooks with resetHook / resetAllHooks ──────────────────────────

const useCounter = Counter.asHook("global-counter")

// First call creates the instance
const c1 = useCounter()
c1.increment()
c1.increment()

// Subsequent calls return the same instance
const c2 = useCounter()
console.log(c1 === c2) // true
console.log(c2.count()) // 2

// Reset a specific hook — next call creates a fresh instance
resetHook("global-counter")
const c3 = useCounter()
console.log(c3 === c1) // false (new instance)
console.log(c3.count()) // 0 (fresh state)

// Reset all hooks — useful in tests
const useTimer = Timer.asHook("global-timer")
useTimer().start()

resetAllHooks() // Clears all singleton instances
const freshTimer = useTimer()
console.log(freshTimer.running()) // false (fresh)

// ─── Cleanup ─────────────────────────────────────────────────────────────────

stopListening()
_resetDevtools() // For tests — clears all devtools state
resetAllHooks()
