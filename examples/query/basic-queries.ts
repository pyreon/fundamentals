/**
 * @pyreon/query — Basic Queries & Mutations
 *
 * Demonstrates:
 * - QueryClientProvider setup
 * - useQuery() for fetching data
 * - useMutation() for creating/updating data
 * - Fine-grained reactive signals (data, error, isFetching are independent)
 * - Reactive options via function getter
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from "@pyreon/query"

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: number
  name: string
  email: string
}

interface CreateUserInput {
  name: string
  email: string
}

// ─── Setup QueryClient ───────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
})

// ─── User List Component ─────────────────────────────────────────────────────

const UserList: ComponentFn = () => {
  // useQuery takes a function getter for reactive options
  const { data, error, isPending, isFetching, isError, refetch } = useQuery(() => ({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch users")
      return response.json()
    },
  }))

  return () => {
    // Each signal is independent — only re-renders what changed
    if (isPending()) return h("div", {}, "Loading users...")
    if (isError()) return h("div", { class: "error" }, `Error: ${error()?.message}`)

    const users = data()!
    return h("div", {}, [
      h("h2", {}, [
        "Users",
        isFetching() ? h("span", { class: "spinner" }, " (refreshing...)") : null,
      ]),

      ...users.map((user) =>
        h("div", { key: user.id }, [h("strong", {}, user.name), h("span", {}, ` (${user.email})`)]),
      ),

      h("button", { onClick: () => refetch() }, "Refresh"),
    ])
  }
}

// ─── Single User Component with Reactive Query Key ───────────────────────────

const UserDetail: ComponentFn<{ userId: number }> = (props) => {
  // Query key is reactive — changes when props.userId changes
  const { data, isPending, isError, error } = useQuery(() => ({
    queryKey: ["user", props.userId],
    queryFn: async (): Promise<User> => {
      const response = await fetch(`/api/users/${props.userId}`)
      if (!response.ok) throw new Error("User not found")
      return response.json()
    },
    enabled: props.userId > 0, // Only fetch when userId is valid
  }))

  return () => {
    if (isPending()) return h("div", {}, "Loading user...")
    if (isError()) return h("div", {}, error()?.message)

    const user = data()!
    return h("div", {}, [h("h3", {}, user.name), h("p", {}, user.email)])
  }
}

// ─── Create User with Mutation ───────────────────────────────────────────────

const CreateUserForm: ComponentFn = () => {
  const client = useQueryClient()
  const name = signal("")
  const email = signal("")

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: async (input: CreateUserInput): Promise<User> => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error("Failed to create user")
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch the users list
      client.invalidateQueries({ queryKey: ["users"] })
      // Reset form
      name.set("")
      email.set("")
    },
  })

  return () =>
    h("form", {
      onSubmit: (e: Event) => {
        e.preventDefault()
        mutate({ name: name(), email: email() })
      },
    }, [
      h("input", {
        placeholder: "Name",
        value: name(),
        onInput: (e: Event) => name.set((e.target as HTMLInputElement).value),
      }),
      h("input", {
        type: "email",
        placeholder: "Email",
        value: email(),
        onInput: (e: Event) => email.set((e.target as HTMLInputElement).value),
      }),
      h("button", { type: "submit", disabled: isPending() }, isPending() ? "Creating..." : "Create User"),
      isError() ? h("div", { class: "error" }, error()?.message) : null,
    ])
}

// ─── App with Provider ───────────────────────────────────────────────────────

const App: ComponentFn = () => {
  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h(UserList, {}),
      h(CreateUserForm, {}),
    ])
}
