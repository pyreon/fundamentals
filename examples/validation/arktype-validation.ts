/**
 * @pyreon/validation — ArkType Schema Adapter
 *
 * Demonstrates:
 * - arktypeSchema() for full-form validation
 * - arktypeField() for single-field validation
 * - ArkType's concise type syntax
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { type } from "arktype"
import { useForm } from "@pyreon/form"
import { arktypeSchema, arktypeField } from "@pyreon/validation"

// ─── Define your ArkType schema ──────────────────────────────────────────────

const userSchema = type({
  name: "string > 0",
  email: "string.email",
  age: "number >= 13",
  role: "'admin' | 'user' | 'moderator'",
})

type UserValues = typeof userSchema.infer

// ─── Schema-level validation ─────────────────────────────────────────────────

const UserForm: ComponentFn = () => {
  const form = useForm<UserValues>({
    initialValues: {
      name: "",
      email: "",
      age: 0,
      role: "user",
    },
    // arktypeSchema() converts an ArkType schema to a SchemaValidateFn
    // ArkType validation is synchronous
    schema: arktypeSchema(userSchema),
    onSubmit: async (values) => {
      console.log("User:", values)
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { placeholder: "Name", ...form.register("name") }),
      h("input", { type: "email", placeholder: "Email", ...form.register("email") }),
      h("input", { type: "number", placeholder: "Age", ...form.register("age") }),
      h("select", { ...form.register("role") }, [
        h("option", { value: "user" }, "User"),
        h("option", { value: "admin" }, "Admin"),
        h("option", { value: "moderator" }, "Moderator"),
      ]),
      h("button", { type: "submit" }, "Save"),
    ])
}

// ─── Field-level validation ──────────────────────────────────────────────────

const emailType = type("string.email")
const ageType = type("number >= 0 & number <= 150")

const QuickForm: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "", age: 0 },
    validators: {
      email: arktypeField(emailType),
      age: arktypeField(ageType),
    },
    onSubmit: async (values) => {
      console.log(values)
    },
  })

  return () => h("form", { onSubmit: form.handleSubmit }, [
    h("input", { type: "email", ...form.register("email") }),
    h("input", { type: "number", ...form.register("age") }),
    h("button", { type: "submit" }, "Submit"),
  ])
}
