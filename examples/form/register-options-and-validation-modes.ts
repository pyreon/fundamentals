/**
 * @pyreon/form — Register Options & Validation Modes
 *
 * Demonstrates:
 * - register() with type: 'checkbox' for boolean fields
 * - register() with type: 'number' for numeric fields
 * - validateOn: 'blur' | 'change' | 'submit' modes
 * - debounceMs for async validators
 * - setErrors() for server-side validation errors
 * - clearErrors() to reset error state
 * - resetField() for individual field reset
 * - Manual validate() call
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { useForm } from "@pyreon/form"

// ─── Register with type: 'checkbox' ─────────────────────────────────────────

const PreferencesForm: ComponentFn = () => {
  const form = useForm({
    initialValues: {
      newsletter: false,
      darkMode: true,
      notifications: false,
    },
    onSubmit: async (values) => {
      console.log("Preferences:", values)
    },
  })

  // register with { type: 'checkbox' } returns a `checked` signal
  // instead of binding to value
  const newsletterProps = form.register("newsletter", { type: "checkbox" })
  const darkModeProps = form.register("darkMode", { type: "checkbox" })
  const notifProps = form.register("notifications", { type: "checkbox" })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("label", {}, [h("input", { type: "checkbox", ...newsletterProps }), " Subscribe to newsletter"]),
      h("label", {}, [h("input", { type: "checkbox", ...darkModeProps }), " Dark mode"]),
      h("label", {}, [h("input", { type: "checkbox", ...notifProps }), " Enable notifications"]),
      h("button", { type: "submit" }, "Save"),
    ])
}

// ─── Register with type: 'number' ───────────────────────────────────────────
// Automatically uses valueAsNumber on input events.

const QuantityForm: ComponentFn = () => {
  const form = useForm({
    initialValues: {
      quantity: 1,
      price: 9.99,
      discount: 0,
    },
    validators: {
      quantity: (v) => (v < 1 ? "Must be at least 1" : v > 100 ? "Max 100" : undefined),
      price: (v) => (v <= 0 ? "Must be positive" : undefined),
      discount: (v) => (v < 0 ? "Cannot be negative" : v > 100 ? "Max 100%" : undefined),
    },
    onSubmit: async (values) => {
      // values.quantity is a number, not a string
      console.log("Total:", values.quantity * values.price * (1 - values.discount / 100))
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("label", {}, "Quantity"),
      h("input", { type: "number", min: 1, max: 100, ...form.register("quantity") }),

      h("label", {}, "Price ($)"),
      h("input", { type: "number", step: "0.01", ...form.register("price") }),

      h("label", {}, "Discount (%)"),
      h("input", { type: "number", min: 0, max: 100, ...form.register("discount") }),

      h("button", { type: "submit" }, "Calculate"),
    ])
}

// ─── validateOn modes ────────────────────────────────────────────────────────

// Mode 1: 'blur' (default) — validates when field loses focus
const BlurValidation: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "" },
    validators: { email: (v) => (!v.includes("@") ? "Invalid email" : undefined) },
    validateOn: "blur",
    onSubmit: async (values) => console.log(values),
  })
  return () => h("input", { ...form.register("email") })
}

// Mode 2: 'change' — validates on every keystroke
const ChangeValidation: ComponentFn = () => {
  const form = useForm({
    initialValues: { username: "" },
    validators: {
      username: (v) => (v.length < 3 ? "Too short" : undefined),
    },
    validateOn: "change",
    onSubmit: async (values) => console.log(values),
  })
  return () =>
    h("div", {}, [
      h("input", { ...form.register("username") }),
      // Error appears as soon as you type (if invalid)
      form.fields.username.error() ? h("span", {}, form.fields.username.error()!) : null,
    ])
}

// Mode 3: 'submit' — validates only when form is submitted
const SubmitValidation: ComponentFn = () => {
  const form = useForm({
    initialValues: { code: "" },
    validators: {
      code: (v) => (v.length !== 6 ? "Code must be 6 characters" : undefined),
    },
    validateOn: "submit",
    onSubmit: async (values) => console.log("Code accepted:", values.code),
  })
  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { placeholder: "Enter 6-digit code", ...form.register("code") }),
      // Errors only appear after submit attempt
      form.fields.code.error() ? h("span", { class: "error" }, form.fields.code.error()!) : null,
      h("button", { type: "submit" }, "Verify"),
    ])
}

// ─── debounceMs for async validators ─────────────────────────────────────────
// Waits N ms after the last keystroke before running validation.

const DebouncedForm: ComponentFn = () => {
  const form = useForm({
    initialValues: { username: "" },
    validators: {
      username: async (value) => {
        if (value.length < 3) return "Too short"
        // This expensive async check is debounced — doesn't fire on every keystroke
        const response = await fetch(`/api/check-username?name=${encodeURIComponent(value)}`)
        const data = (await response.json()) as { available: boolean }
        return data.available ? undefined : "Username taken"
      },
    },
    validateOn: "change",
    debounceMs: 400, // Wait 400ms after last input before validating
    onSubmit: async (values) => console.log("Registering:", values),
  })

  return () =>
    h("div", {}, [
      h("input", { ...form.register("username") }),
      form.isValidating() ? h("span", {}, "Checking...") : null,
      form.fields.username.error() ? h("span", { class: "error" }, form.fields.username.error()!) : null,
    ])
}

// ─── setErrors / clearErrors / resetField / validate ─────────────────────────

const ServerValidatedForm: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "", password: "" },
    onSubmit: async (values) => {
      const response = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = (await response.json()) as { errors: Record<string, string> }
        // Set server-side validation errors on specific fields
        form.setErrors(data.errors as any)
        return
      }

      console.log("Success!")
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { type: "email", ...form.register("email") }),
      form.fields.email.error() ? h("span", { class: "error" }, form.fields.email.error()!) : null,

      h("input", { type: "password", ...form.register("password") }),
      form.fields.password.error() ? h("span", { class: "error" }, form.fields.password.error()!) : null,

      h("div", { class: "actions" }, [
        h("button", { type: "submit" }, "Register"),

        // Clear all errors (e.g., when user starts correcting)
        h("button", { type: "button", onClick: () => form.clearErrors() }, "Clear Errors"),

        // Reset just the email field to initial value
        h("button", { type: "button", onClick: () => form.resetField("email") }, "Reset Email"),

        // Reset entire form
        h("button", { type: "button", onClick: () => form.reset() }, "Reset All"),

        // Manually trigger validation without submitting
        h(
          "button",
          {
            type: "button",
            onClick: async () => {
              const isValid = await form.validate()
              console.log("Form valid?", isValid)
            },
          },
          "Validate",
        ),
      ]),
    ])
}
