/**
 * @pyreon/store — Basic Counter Store
 *
 * Demonstrates:
 * - defineStore() with signal state, computed views, and actions
 * - Singleton pattern — same store instance everywhere
 * - patch, subscribe, reset, dispose
 */
import { defineStore, signal, computed, batch } from "@pyreon/store"

// ─── Define a counter store ──────────────────────────────────────────────────

const useCounter = defineStore("counter", () => {
  const count = signal(0)
  const doubled = computed(() => count() * 2)
  const isPositive = computed(() => count() > 0)

  const increment = () => count.update((n) => n + 1)
  const decrement = () => count.update((n) => n - 1)
  const incrementBy = (amount: number) => count.update((n) => n + amount)
  const reset = () => count.set(0)

  return { count, doubled, isPositive, increment, decrement, incrementBy, reset }
})

// ─── Usage ───────────────────────────────────────────────────────────────────

const { store: counter, patch, subscribe, reset, dispose } = useCounter()

// Reading state (subscribing)
console.log(counter.count()) // 0
console.log(counter.doubled()) // 0

// Calling actions
counter.increment()
console.log(counter.count()) // 1
console.log(counter.doubled()) // 2

counter.incrementBy(5)
console.log(counter.count()) // 6

// Using patch (object form) — sets multiple signals in a single batch
patch({ count: 100 })
console.log(counter.count()) // 100

// Using patch (function form) — direct access to signal references
patch((state) => {
  state.count.set(42)
})
console.log(counter.count()) // 42

// Reading state snapshot
const api = useCounter()
console.log(api.state) // { count: 42 }

// Subscribing to changes
const unsubscribe = subscribe((mutation, state) => {
  console.log(`[${mutation.type}] ${mutation.storeId}:`, mutation.events)
  console.log("New state:", state)
})

counter.increment() // triggers subscriber

// Resetting to initial values
reset()
console.log(counter.count()) // 0

// Cleanup
unsubscribe()
dispose()
