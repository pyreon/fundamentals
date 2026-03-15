/**
 * Cross-Package Integration: Form + Validation + Query
 *
 * Demonstrates:
 * - @pyreon/form for reactive form state
 * - @pyreon/validation (Zod) for schema validation
 * - @pyreon/query for submitting data and invalidating caches
 * - Complete registration flow with server-side error handling
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { z } from "zod"
import { useForm, useField, useFormState, FormProvider, useFormContext } from "@pyreon/form"
import { zodSchema } from "@pyreon/validation"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  useQuery,
  useMutation,
} from "@pyreon/query"

// ─── Shared types and schema ─────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "editor", "viewer"]),
})

type UserFormValues = z.infer<typeof userSchema>

interface User extends UserFormValues {
  id: number
  createdAt: string
}

// ─── User List (Query) ───────────────────────────────────────────────────────

const UserList: ComponentFn = () => {
  const { data, isPending } = useQuery(() => ({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch("/api/users")
      return res.json()
    },
  }))

  return () => {
    if (isPending()) return h("div", {}, "Loading users...")
    return h("ul", {}, data()!.map((user) =>
      h("li", { key: user.id }, `${user.name} (${user.email}) — ${user.role}`),
    ))
  }
}

// ─── Create User Form (Form + Validation + Mutation) ─────────────────────────

const CreateUserForm: ComponentFn = () => {
  const client = useQueryClient()

  // Mutation for creating users
  const { mutateAsync, isPending: isMutating } = useMutation({
    mutationFn: async (values: UserFormValues): Promise<User> => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = (await res.json()) as { errors?: Record<string, string>; message?: string }
        if (data.errors) {
          // Server returned field-level errors — set them on the form
          throw Object.assign(new Error(data.message ?? "Validation failed"), { fieldErrors: data.errors })
        }
        throw new Error(data.message ?? "Failed to create user")
      }
      return res.json()
    },
    onSuccess: () => {
      // Refetch the user list after successful creation
      client.invalidateQueries({ queryKey: ["users"] })
    },
  })

  // Form with Zod schema validation
  const form = useForm<UserFormValues>({
    initialValues: { name: "", email: "", role: "viewer" },
    schema: zodSchema(userSchema),
    validateOn: "blur",
    onSubmit: async (values) => {
      try {
        await mutateAsync(values)
        form.reset() // Clear form on success
      } catch (err: any) {
        if (err.fieldErrors) {
          // Map server errors to form fields
          form.setErrors(err.fieldErrors)
        }
        throw err // Re-throw so submitError captures it
      }
    },
  })

  const name = useField(form, "name")
  const email = useField(form, "email")
  const state = useFormState(form)

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("h3", {}, "Add User"),

      h("div", {}, [
        h("input", { placeholder: "Name", ...name.register() }),
        name.showError() ? h("span", { class: "error" }, name.error()!) : null,
      ]),

      h("div", {}, [
        h("input", { type: "email", placeholder: "Email", ...email.register() }),
        email.showError() ? h("span", { class: "error" }, email.error()!) : null,
      ]),

      h("div", {}, [
        h("select", { ...form.register("role") }, [
          h("option", { value: "viewer" }, "Viewer"),
          h("option", { value: "editor" }, "Editor"),
          h("option", { value: "admin" }, "Admin"),
        ]),
      ]),

      h("button", {
        type: "submit",
        disabled: form.isSubmitting() || isMutating() || !state().isValid,
      }, form.isSubmitting() ? "Creating..." : "Create User"),

      form.submitError()
        ? h("div", { class: "error" }, String(form.submitError()))
        : null,
    ])
}

// ─── App — ties it all together ──────────────────────────────────────────────

const queryClient = new QueryClient()

const App: ComponentFn = () => {
  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h("h1", {}, "User Management"),
      h(CreateUserForm, {}),
      h("hr", {}),
      h(UserList, {}),
    ])
}
