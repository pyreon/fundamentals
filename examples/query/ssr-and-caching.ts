/**
 * @pyreon/query — SSR Hydration & Cache Configuration
 *
 * Demonstrates:
 * - dehydrate() / hydrate() for SSR state transfer
 * - QueryCache / MutationCache with global callbacks
 * - keepPreviousData for smooth pagination transitions
 * - hashKey for custom key serialization
 * - CancelledError handling
 * - QueryClient configuration for SSR
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import {
  QueryClient,
  QueryCache,
  MutationCache,
  QueryClientProvider,
  dehydrate,
  hydrate,
  hashKey,
  keepPreviousData,
  isCancelledError,
  CancelledError,
  useQuery,
} from "@pyreon/query"
import type { DehydratedState, QueryClientConfig } from "@pyreon/query"

// ─── QueryCache with global callbacks ────────────────────────────────────────
// Global error/success handlers for all queries.

const queryCache = new QueryCache({
  onError: (error, query) => {
    // Global error handler — log to monitoring service
    console.error(`[QueryCache] Query failed:`, query.queryKey, error)

    if (isCancelledError(error)) {
      console.log("Query was cancelled, ignoring error")
      return
    }

    // Show toast notification for user-facing errors
    showToast(`Error loading data: ${error.message}`)
  },
  onSuccess: (data, query) => {
    console.log(`[QueryCache] Query succeeded:`, query.queryKey)
  },
})

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    console.error(`[MutationCache] Mutation failed:`, error)
  },
  onSuccess: (_data, _variables, _context, mutation) => {
    console.log(`[MutationCache] Mutation succeeded`)
  },
})

function showToast(msg: string) {
  console.log(`[Toast] ${msg}`)
}

// ─── QueryClient with caches ────────────────────────────────────────────────

const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes("404")) return false
        return failureCount < 3
      },
    },
  },
})

// ─── SSR: Server-Side Prefetching ────────────────────────────────────────────
// On the server, prefetch data and dehydrate to pass to the client.

async function serverSideRender() {
  const serverClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // On server, don't retry — fail fast
        retry: false,
      },
    },
  })

  // Prefetch queries on the server
  await serverClient.prefetchQuery({
    queryKey: ["users"],
    queryFn: () => fetch("https://api.example.com/users").then((r) => r.json()),
  })

  await serverClient.prefetchQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("https://api.example.com/settings").then((r) => r.json()),
  })

  // Dehydrate the cache state into a serializable object
  const dehydratedState = dehydrate(serverClient)

  // Embed in the HTML response
  const html = `
    <script>
      window.__QUERY_STATE__ = ${JSON.stringify(dehydratedState)};
    </script>
    <div id="app">...</div>
  `

  // Cleanup server client
  serverClient.clear()

  return html
}

// ─── SSR: Client-Side Hydration ──────────────────────────────────────────────
// On the client, hydrate the server state into the client's QueryClient.

function clientSideHydrate() {
  const dehydratedState = (window as any).__QUERY_STATE__ as DehydratedState

  if (dehydratedState) {
    // Hydrate the client cache with server-prefetched data
    hydrate(queryClient, dehydratedState)
  }
}

// ─── keepPreviousData for smooth pagination ──────────────────────────────────
// Shows the previous page's data while the next page loads.

interface PaginatedResult {
  items: { id: number; name: string }[]
  totalPages: number
}

const PaginatedList: ComponentFn = () => {
  const page = signal(1)

  const { data, isPending, isFetching } = useQuery(() => ({
    queryKey: ["items", page()],
    queryFn: async (): Promise<PaginatedResult> => {
      const response = await fetch(`/api/items?page=${page()}`)
      return response.json()
    },
    // Keep showing the previous page while the new one loads
    placeholderData: keepPreviousData,
  }))

  return () => {
    // On first load, isPending is true and data is undefined
    if (isPending()) return h("div", {}, "Loading...")

    const result = data()!
    return h("div", {}, [
      // isFetching is true while loading new page, but data still shows previous
      isFetching() ? h("div", { class: "loading-overlay" }, "Updating...") : null,

      ...result.items.map((item) =>
        h("div", { key: item.id }, item.name),
      ),

      h("div", { class: "pagination" }, [
        h("button", { onClick: () => page.update((p) => Math.max(1, p - 1)), disabled: page() === 1 }, "Prev"),
        h("span", {}, `Page ${page()} of ${result.totalPages}`),
        h(
          "button",
          { onClick: () => page.update((p) => Math.min(result.totalPages, p + 1)), disabled: page() === result.totalPages },
          "Next",
        ),
      ]),
    ])
  }
}

// ─── hashKey — custom key serialization ──────────────────────────────────────

const key1 = ["users", { role: "admin", page: 1 }]
const key2 = ["users", { page: 1, role: "admin" }]

// hashKey normalizes object key order — these produce the same hash
console.log(hashKey(key1)) // '["users",{"page":1,"role":"admin"}]'
console.log(hashKey(key2)) // '["users",{"page":1,"role":"admin"}]'
console.log(hashKey(key1) === hashKey(key2)) // true

// ─── CancelledError handling ─────────────────────────────────────────────────

try {
  throw new CancelledError()
} catch (error) {
  if (isCancelledError(error)) {
    console.log("Query was cancelled — this is expected, not a real error")
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

const App: ComponentFn = () => {
  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h(PaginatedList, {}),
    ])
}
