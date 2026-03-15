/**
 * @pyreon/validation — Valibot Schema Adapter
 *
 * Demonstrates:
 * - valibotSchema() for full-form validation
 * - valibotField() for single-field validation
 * - Requires passing the safeParse function explicitly (Valibot uses standalone functions)
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import * as v from "valibot"
import { useForm } from "@pyreon/form"
import { valibotSchema, valibotField } from "@pyreon/validation"

// ─── Define your Valibot schema ──────────────────────────────────────────────

const contactSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2, "Name too short")),
  email: v.pipe(v.string(), v.email("Invalid email")),
  message: v.pipe(v.string(), v.minLength(10, "Message must be at least 10 characters")),
  priority: v.picklist(["low", "medium", "high"]),
})

type ContactValues = v.InferOutput<typeof contactSchema>

// ─── Schema-level validation ─────────────────────────────────────────────────

const ContactForm: ComponentFn = () => {
  const form = useForm<ContactValues>({
    initialValues: {
      name: "",
      email: "",
      message: "",
      priority: "medium",
    },
    // Valibot requires passing safeParse explicitly (standalone function style)
    schema: valibotSchema(contactSchema, v.safeParse),
    onSubmit: async (values) => {
      await fetch("/api/contact", { method: "POST", body: JSON.stringify(values) })
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { placeholder: "Name", ...form.register("name") }),
      h("input", { type: "email", placeholder: "Email", ...form.register("email") }),
      h("textarea", { placeholder: "Message", ...form.register("message") }),
      h("select", { ...form.register("priority") }, [
        h("option", { value: "low" }, "Low"),
        h("option", { value: "medium" }, "Medium"),
        h("option", { value: "high" }, "High"),
      ]),
      h("button", { type: "submit" }, "Send"),
    ])
}

// ─── Field-level validation ──────────────────────────────────────────────────

const emailValidator = v.pipe(v.string(), v.email("Enter a valid email"))

const SimpleForm: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "" },
    validators: {
      // valibotField() also requires the safeParse function
      email: valibotField(emailValidator, v.safeParse),
    },
    validateOn: "change",
    onSubmit: async (values) => {
      console.log(values)
    },
  })

  return () => h("form", { onSubmit: form.handleSubmit }, [
    h("input", { type: "email", ...form.register("email") }),
    h("button", { type: "submit" }, "Submit"),
  ])
}
