/**
 * @pyreon/store — Lifecycle, onAction, and dispose
 *
 * Demonstrates:
 * - onAction with sync and async action handling
 * - onAction context.after() and context.onError() callbacks
 * - subscribe with { immediate: true }
 * - dispose for teardown
 * - state getter for snapshots
 * - resetStore() / resetAllStores() for cleanup
 */
import { defineStore, signal, computed, batch, resetStore, resetAllStores } from "@pyreon/store"

// ─── Store with async actions ────────────────────────────────────────────────

const useAuth = defineStore("auth", () => {
  const token = signal<string | null>(null)
  const user = signal<{ id: number; name: string } | null>(null)
  const isLoading = signal(false)
  const isAuthenticated = computed(() => token() !== null)

  const login = async (email: string, password: string) => {
    isLoading.set(true)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) throw new Error("Invalid credentials")
      const data = (await response.json()) as { token: string; user: { id: number; name: string } }
      batch(() => {
        token.set(data.token)
        user.set(data.user)
      })
      return data.user
    } finally {
      isLoading.set(false)
    }
  }

  const logout = () => {
    batch(() => {
      token.set(null)
      user.set(null)
    })
  }

  return { token, user, isLoading, isAuthenticated, login, logout }
})

// ─── onAction — intercepting sync and async actions ──────────────────────────

const auth = useAuth()

const stopActionListener = auth.onAction((ctx) => {
  const startTime = Date.now()
  console.log(`[action:start] ${ctx.storeId}.${ctx.name}(${JSON.stringify(ctx.args)})`)

  // after() fires when the action completes (including async resolution)
  ctx.after((result) => {
    const duration = Date.now() - startTime
    console.log(`[action:done] ${ctx.name} completed in ${duration}ms`, result)
  })

  // onError() fires if the action throws (including async rejection)
  ctx.onError((error) => {
    const duration = Date.now() - startTime
    console.error(`[action:error] ${ctx.name} failed after ${duration}ms`, error)
  })
})

// Sync action — after() fires immediately
auth.store.logout()

// Async action — after()/onError() fires when the promise resolves/rejects
await auth.store.login("alice@example.com", "password123").catch(() => {})

// ─── subscribe with { immediate: true } ──────────────────────────────────────

const unsubscribe = auth.subscribe(
  (mutation, state) => {
    console.log(`[subscribe] type=${mutation.type}, events:`, mutation.events)
    console.log(`[subscribe] state snapshot:`, state)
  },
  { immediate: true }, // Fires immediately with current state (empty events)
)

// ─── state getter — read-only snapshot ───────────────────────────────────────

console.log(auth.state)
// { token: "abc123", user: { id: 1, name: "Alice" }, isLoading: false }

// state is always fresh — each access reads current signal values
auth.store.logout()
console.log(auth.state)
// { token: null, user: null, isLoading: false }

// ─── dispose — full teardown ─────────────────────────────────────────────────

auth.dispose()

// Calling useAuth() again creates a fresh instance
const freshAuth = useAuth()
console.log(freshAuth.store.isAuthenticated()) // false (fresh state)

// ─── resetStore / resetAllStores ─────────────────────────────────────────────

resetStore("auth")
resetAllStores()

// Cleanup
stopActionListener()
unsubscribe()
