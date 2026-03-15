/**
 * @pyreon/query — Infinite Queries & Suspense
 *
 * Demonstrates:
 * - useInfiniteQuery() for paginated/infinite scroll data
 * - useSuspenseQuery() for suspense-enabled queries
 * - QuerySuspense boundary component
 * - QueryErrorResetBoundary for error recovery
 * - useIsFetching / useIsMutating global status
 * - useQueries for parallel queries
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useSuspenseQuery,
  QuerySuspense,
  QueryErrorResetBoundary,
  useQueryErrorResetBoundary,
  useIsFetching,
  useIsMutating,
  useQueries,
} from "@pyreon/query"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Post {
  id: number
  title: string
  body: string
}

interface PaginatedResponse {
  data: Post[]
  nextCursor: number | null
}

// ─── Infinite Query — Paginated Posts ────────────────────────────────────────

const InfinitePostList: ComponentFn = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    () => ({
      queryKey: ["posts", "infinite"],
      queryFn: async ({ pageParam }): Promise<PaginatedResponse> => {
        const response = await fetch(`/api/posts?cursor=${pageParam}&limit=10`)
        return response.json()
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage: PaginatedResponse) => lastPage.nextCursor,
    }),
  )

  return () => {
    if (isPending()) return h("div", {}, "Loading posts...")

    // data().pages is an array of all fetched pages
    const allPosts = data()!.pages.flatMap((page) => page.data)

    return h("div", {}, [
      ...allPosts.map((post) =>
        h("article", { key: post.id }, [h("h3", {}, post.title), h("p", {}, post.body)]),
      ),

      h(
        "button",
        {
          onClick: () => fetchNextPage(),
          disabled: !hasNextPage() || isFetchingNextPage(),
        },
        isFetchingNextPage() ? "Loading more..." : hasNextPage() ? "Load More" : "No more posts",
      ),
    ])
  }
}

// ─── Suspense Query — Simpler loading states ─────────────────────────────────

const UserProfile: ComponentFn<{ userId: number }> = (props) => {
  // useSuspenseQuery suspends the component — no need for isPending checks
  const { data } = useSuspenseQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${props.userId}`)
      if (!response.ok) throw new Error("User not found")
      return response.json() as Promise<{ name: string; email: string }>
    },
  }))

  // data() is always defined — suspense handles the loading state
  return () => {
    const user = data()!
    return h("div", {}, [h("h2", {}, user.name), h("p", {}, user.email)])
  }
}

// ─── QuerySuspense boundary ──────────────────────────────────────────────────

const ProfilePage: ComponentFn = () => {
  return () =>
    h(QuerySuspense, {
      fallback: h("div", {}, "Loading profile..."),
      children: [h(UserProfile, { userId: 1 })],
    })
}

// ─── Error Reset Boundary — Retry on Error ───────────────────────────────────

const ErrorableContent: ComponentFn = () => {
  const { reset } = useQueryErrorResetBoundary()

  const { data } = useSuspenseQuery(() => ({
    queryKey: ["risky-data"],
    queryFn: async () => {
      const response = await fetch("/api/risky-endpoint")
      if (!response.ok) throw new Error("Something went wrong")
      return response.json()
    },
  }))

  return () => h("div", {}, JSON.stringify(data()))
}

const SafePage: ComponentFn = () => {
  return () =>
    h(QueryErrorResetBoundary, {}, [
      h(QuerySuspense, {
        fallback: h("div", {}, "Loading..."),
        children: [h(ErrorableContent, {})],
      }),
    ])
}

// ─── Global Fetching Status ──────────────────────────────────────────────────

const GlobalLoadingIndicator: ComponentFn = () => {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()

  return () => {
    const fetching = isFetching()
    const mutating = isMutating()

    if (fetching === 0 && mutating === 0) return null

    return h("div", { class: "global-loading" }, [
      fetching > 0 ? h("span", {}, `${fetching} queries loading`) : null,
      mutating > 0 ? h("span", {}, `${mutating} mutations in progress`) : null,
    ])
  }
}

// ─── Parallel Queries with useQueries ────────────────────────────────────────

const Dashboard: ComponentFn = () => {
  const results = useQueries(() => ({
    queries: [
      {
        queryKey: ["stats", "users"],
        queryFn: () => fetch("/api/stats/users").then((r) => r.json()),
      },
      {
        queryKey: ["stats", "revenue"],
        queryFn: () => fetch("/api/stats/revenue").then((r) => r.json()),
      },
      {
        queryKey: ["stats", "orders"],
        queryFn: () => fetch("/api/stats/orders").then((r) => r.json()),
      },
    ],
  }))

  return () => {
    const allLoaded = results().every((r) => r.isSuccess)
    if (!allLoaded) return h("div", {}, "Loading dashboard...")

    return h("div", { class: "dashboard" }, [
      h("div", {}, `Users: ${JSON.stringify(results()[0].data)}`),
      h("div", {}, `Revenue: ${JSON.stringify(results()[1].data)}`),
      h("div", {}, `Orders: ${JSON.stringify(results()[2].data)}`),
    ])
  }
}

// ─── Full App ────────────────────────────────────────────────────────────────

const queryClient = new QueryClient()

const App: ComponentFn = () => {
  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h(GlobalLoadingIndicator, {}),
      h(InfinitePostList, {}),
      h(ProfilePage, {}),
      h(Dashboard, {}),
    ])
}
