/**
 * @pyreon/validation — Zod Schema Adapter
 *
 * Demonstrates:
 * - zodSchema() for full-form validation
 * - zodField() for single-field validation
 * - Integration with useForm via schema and validators options
 * - Works with both Zod v3 and v4 (duck-typed)
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { z } from "zod"
import { useForm } from "@pyreon/form"
import { zodSchema, zodField } from "@pyreon/validation"

// ─── Define your Zod schema ─────────────────────────────────────────────────

const registrationSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Must contain uppercase"),
  age: z.number().min(13, "Must be at least 13 years old").max(150, "Invalid age"),
})

type RegistrationValues = z.infer<typeof registrationSchema>

// ─── Schema-level validation ─────────────────────────────────────────────────
// Validates all fields at once using zodSchema()

const RegistrationForm: ComponentFn = () => {
  const form = useForm<RegistrationValues>({
    initialValues: {
      username: "",
      email: "",
      password: "",
      age: 0,
    },
    // zodSchema() converts the Zod schema into a SchemaValidateFn
    schema: zodSchema(registrationSchema),
    onSubmit: async (values) => {
      console.log("Valid data:", values)
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { placeholder: "Username", ...form.register("username") }),
      h("input", { type: "email", placeholder: "Email", ...form.register("email") }),
      h("input", { type: "password", placeholder: "Password", ...form.register("password") }),
      h("input", { type: "number", placeholder: "Age", ...form.register("age") }),
      h("button", { type: "submit" }, "Register"),
    ])
}

// ─── Field-level validation ──────────────────────────────────────────────────
// Use zodField() when you want per-field Zod schemas

const emailSchema = z.string().email("Please enter a valid email")
const passwordSchema = z.string().min(8).regex(/[0-9]/, "Must contain a number")

const LoginForm: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "", password: "" },
    validators: {
      // zodField() wraps a Zod schema into a ValidateFn
      email: zodField(emailSchema),
      password: zodField(passwordSchema),
    },
    validateOn: "blur",
    onSubmit: async (values) => {
      console.log("Login:", values)
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { type: "email", ...form.register("email") }),
      h("input", { type: "password", ...form.register("password") }),
      h("button", { type: "submit" }, "Login"),
    ])
}

// ─── Combining schema + field validators ─────────────────────────────────────
// Field-level errors take priority over schema-level errors

const CombinedForm: ComponentFn = () => {
  const form = useForm<RegistrationValues>({
    initialValues: { username: "", email: "", password: "", age: 0 },
    // Schema validates the whole form
    schema: zodSchema(registrationSchema),
    // Field validators run first and take priority
    validators: {
      username: async (value) => {
        // Custom async check on top of Zod validation
        if (value.length >= 3) {
          const resp = await fetch(`/api/check-username?name=${value}`)
          const data = (await resp.json()) as { available: boolean }
          if (!data.available) return "Username already taken"
        }
        return undefined
      },
    },
    onSubmit: async (values) => {
      console.log("Submitted:", values)
    },
  })

  return () => h("form", { onSubmit: form.handleSubmit }, [
    // ... form fields ...
  ])
}
