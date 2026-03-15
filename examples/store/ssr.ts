/**
 * @pyreon/store — SSR with Isolated Registries
 *
 * Demonstrates:
 * - setStoreRegistryProvider() for per-request isolation
 * - AsyncLocalStorage-based provider for Node.js
 * - Prevents state leaking between concurrent requests
 */
import { AsyncLocalStorage } from "node:async_hooks"
import { defineStore, setStoreRegistryProvider, signal, computed, resetAllStores } from "@pyreon/store"

// ─── SSR Setup ───────────────────────────────────────────────────────────────

const asyncStorage = new AsyncLocalStorage<Map<string, unknown>>()

// Each request gets its own store registry via AsyncLocalStorage
setStoreRegistryProvider(() => {
  const store = asyncStorage.getStore()
  if (!store) throw new Error("No async context — wrap in asyncStorage.run()")
  return store
})

// ─── Define stores as usual ──────────────────────────────────────────────────

const useUser = defineStore("user", () => {
  const name = signal("")
  const email = signal("")
  const isLoggedIn = computed(() => name() !== "")

  const login = (n: string, e: string) => {
    name.set(n)
    email.set(e)
  }

  const logout = () => {
    name.set("")
    email.set("")
  }

  return { name, email, isLoggedIn, login, logout }
})

// ─── Simulated request handler ───────────────────────────────────────────────

async function handleRequest(requestId: number) {
  // Each request runs in its own async context with a fresh registry
  await asyncStorage.run(new Map(), async () => {
    const { store: user } = useUser()

    // This state is isolated to this request
    user.login(`User ${requestId}`, `user${requestId}@example.com`)

    console.log(`Request ${requestId}: ${user.name()} (${user.email()})`)

    // Cleanup
    resetAllStores()
  })
}

// Concurrent requests — each has isolated state
await Promise.all([handleRequest(1), handleRequest(2), handleRequest(3)])
