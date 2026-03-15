/**
 * @pyreon/state-tree — Basic Counter Model
 *
 * Demonstrates:
 * - model() with state, views, and actions
 * - .create() for independent instances
 * - .asHook() for singleton pattern
 * - Signal-based state access
 */
import { computed } from "@pyreon/reactivity"
import { model, getSnapshot, applySnapshot } from "@pyreon/state-tree"

// ─── Define a counter model ─────────────────────────────────────────────────

const Counter = model({
  state: { count: 0 },

  views: (self) => ({
    doubled: computed(() => self.count() * 2),
    isPositive: computed(() => self.count() > 0),
  }),

  actions: (self) => ({
    increment: () => self.count.update((c) => c + 1),
    decrement: () => self.count.update((c) => c - 1),
    incrementBy: (amount: number) => self.count.update((c) => c + amount),
    reset: () => self.count.set(0),
  }),
})

// ─── Creating instances ──────────────────────────────────────────────────────

// Default values
const counter1 = Counter.create()
console.log(counter1.count()) // 0

// Override initial state
const counter2 = Counter.create({ count: 10 })
console.log(counter2.count()) // 10

// Instances are independent
counter1.increment()
console.log(counter1.count()) // 1
console.log(counter2.count()) // 10

// Views are reactive computeds
console.log(counter2.doubled()) // 20
console.log(counter2.isPositive()) // true

// ─── Snapshots ───────────────────────────────────────────────────────────────

counter1.incrementBy(5)
const snapshot = getSnapshot(counter1)
console.log(snapshot) // { count: 6 }

// Apply snapshot to restore or copy state
applySnapshot(counter2, { count: 99 })
console.log(counter2.count()) // 99

// ─── Singleton hook pattern ──────────────────────────────────────────────────

const useCounter = Counter.asHook("app-counter")

// Every call returns the same instance
const a = useCounter()
const b = useCounter()
console.log(a === b) // true

a.increment()
console.log(b.count()) // 1 — same instance
