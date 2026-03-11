# Query

`@pyreon/query` is a Pyreon adapter for [TanStack Query](https://tanstack.com/query). It wraps TanStack Query's core with reactive signal-based hooks, Suspense integration, and SSR dehydration/hydration.

## Installation

```bash
bun add @pyreon/query @tanstack/query-core
```

## Quick Start

```tsx
import { QueryClient, QueryClientProvider, useQuery } from "@pyreon/query"

const queryClient = new QueryClient()

function UserProfile({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetch(`/api/users/${id}`).then(r => r.json()),
  })

  return (
    <div>
      {() => query.isLoading() ? <Spinner /> : null}
      {() => query.isError() ? <p>Error: {query.error()?.message}</p> : null}
      {() => query.data() ? <h1>{query.data().name}</h1> : null}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfile id="1" />
    </QueryClientProvider>
  )
}
```

## QueryClientProvider

Provides a `QueryClient` instance to the component tree via context:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

## useQuery

Returns a reactive query result with signal-based properties:

```tsx
const query = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
})

query.data()        // T | undefined
query.isLoading()   // boolean
query.isError()     // boolean
query.error()       // Error | null
query.isFetching()  // boolean
query.status()      // "pending" | "error" | "success"
```

### Reactive Query Keys

```tsx
function UserPosts({ userId }: { userId: () => string }) {
  const query = useQuery({
    queryKey: () => ["posts", userId()],
    queryFn: () => fetchPosts(userId()),
    enabled: () => !!userId(),
  })
}
```

## useMutation

```tsx
const mutation = useMutation({
  mutationFn: (text: string) =>
    fetch("/api/todos", {
      method: "POST",
      body: JSON.stringify({ text }),
    }).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] })
  },
})

mutation.mutate("New todo")
mutation.isPending()  // boolean signal
```

## useInfiniteQuery

```tsx
const query = useInfiniteQuery({
  queryKey: ["posts"],
  queryFn: ({ pageParam }) => fetchPosts({ page: pageParam }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.nextPage,
})

query.data().pages       // all fetched pages
query.fetchNextPage()    // load next
query.hasNextPage()      // boolean signal
```

## Suspense

### useSuspenseQuery

```tsx
function UserList() {
  const query = useSuspenseQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  return (
    <ul>
      {query.data().map(u => <li>{u.name}</li>)}
    </ul>
  )
}

<Suspense fallback={<Spinner />}>
  <UserList />
</Suspense>
```

### QuerySuspense

Convenience wrapper combining `Suspense` and `ErrorBoundary`:

```tsx
<QuerySuspense fallback={<Spinner />}>
  <UserList />
</QuerySuspense>
```

## SSR Dehydration

### Server

```ts
const queryClient = new QueryClient()
await queryClient.prefetchQuery({ queryKey: ["users"], queryFn: fetchUsers })
const dehydratedState = dehydrate(queryClient)
```

### Client

```ts
const queryClient = new QueryClient()
hydrate(queryClient, dehydratedState)
```

## Additional Hooks

| Hook | Description |
| --- | --- |
| `useQueryClient()` | Access the current `QueryClient` |
| `useQueries(options)` | Run multiple queries in parallel |
| `useIsFetching(filters?)` | Signal of active query count |
| `useIsMutating(filters?)` | Signal of active mutation count |
| `useQueryErrorResetBoundary()` | Reset error state for retry |
| `useSuspenseInfiniteQuery(options)` | Infinite query with Suspense |

## Gotchas

**All result properties are signals.** Call them with `()`: `query.data()`, not `query.data`.

**`QueryClientProvider` is required.** Without it, hooks throw at runtime.

**Mutation errors are logged in dev mode** to aid debugging while preventing unhandled promise rejections.
