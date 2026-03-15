/**
 * @pyreon/form — Advanced Registration Form
 *
 * Demonstrates:
 * - useField() for individual field control
 * - useWatch() for reactive field watching
 * - useFormState() for computed form summary
 * - Schema-level validation
 * - Async validation (e.g., checking username availability)
 * - Cross-field validation
 * - Server-side error handling
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { effect } from "@pyreon/reactivity"
import { useForm, useField, useWatch, useFormState } from "@pyreon/form"

// ─── Registration Form with Advanced Features ───────────────────────────────

const RegistrationForm: ComponentFn = () => {
  const form = useForm({
    initialValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
    validators: {
      username: async (value) => {
        if (!value) return "Username is required"
        if (value.length < 3) return "Username must be at least 3 characters"
        // Async validation — check username availability
        const response = await fetch(`/api/check-username?name=${encodeURIComponent(value)}`)
        const data = (await response.json()) as { available: boolean }
        if (!data.available) return "Username is already taken"
        return undefined
      },
      email: (value) => {
        if (!value) return "Email is required"
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email"
        return undefined
      },
      password: (value) => {
        if (!value) return "Password is required"
        if (value.length < 8) return "At least 8 characters"
        if (!/[A-Z]/.test(value)) return "Must contain an uppercase letter"
        if (!/[0-9]/.test(value)) return "Must contain a number"
        return undefined
      },
      // Cross-field validation: compare to password
      confirmPassword: (value, allValues) => {
        if (value !== allValues.password) return "Passwords do not match"
        return undefined
      },
    },
    validateOn: "change",
    debounceMs: 300, // Debounce async validators
    onSubmit: async (values) => {
      const response = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(values),
      })
      if (!response.ok) {
        const data = (await response.json()) as { errors: Record<string, string> }
        // Set server-side errors on specific fields
        form.setErrors(data.errors as any)
        throw new Error("Registration failed")
      }
    },
  })

  // ─── useField for granular control ───────────────────────────────────
  const username = useField(form, "username")
  const email = useField(form, "email")
  const password = useField(form, "password")
  const confirmPassword = useField(form, "confirmPassword")

  // useField provides:
  // - value, error, touched, dirty (signals)
  // - hasError: computed (error exists)
  // - showError: computed (error exists AND touched)
  // - setValue, setTouched, reset (methods)
  // - register() (same as form.register but scoped)

  // ─── useWatch for reactive field observation ─────────────────────────

  // Watch a single field
  const passwordValue = useWatch(form, "password")

  // Watch multiple fields
  const [emailValue, usernameValue] = useWatch(form, ["email", "username"])

  // Watch all fields
  const allValues = useWatch(form)

  // React to field changes
  effect(() => {
    const pw = passwordValue()
    if (pw && pw.length > 0) {
      console.log("Password strength:", pw.length >= 12 ? "strong" : pw.length >= 8 ? "medium" : "weak")
    }
  })

  // ─── useFormState for form-wide summary ──────────────────────────────

  const formState = useFormState(form)

  // Or with a selector for specific data
  const errorCount = useFormState(form, (state) => Object.keys(state.errors).length)

  // formState() returns FormStateSummary:
  // { isSubmitting, isValidating, isValid, isDirty, submitCount,
  //   submitError, touchedFields, dirtyFields, errors }

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      // Username with inline error
      h("div", {}, [
        h("input", { placeholder: "Username", ...username.register() }),
        username.showError() ? h("span", { class: "error" }, username.error()!) : null,
        form.isValidating() ? h("span", {}, "Checking...") : null,
      ]),

      // Email
      h("div", {}, [
        h("input", { type: "email", placeholder: "Email", ...email.register() }),
        email.showError() ? h("span", { class: "error" }, email.error()!) : null,
      ]),

      // Password with strength indicator
      h("div", {}, [
        h("input", { type: "password", placeholder: "Password", ...password.register() }),
        password.showError() ? h("span", { class: "error" }, password.error()!) : null,
      ]),

      // Confirm password
      h("div", {}, [
        h("input", { type: "password", placeholder: "Confirm", ...confirmPassword.register() }),
        confirmPassword.showError() ? h("span", { class: "error" }, confirmPassword.error()!) : null,
      ]),

      // Checkbox with register({ type: 'checkbox' })
      h("label", {}, [h("input", { ...form.register("agreeToTerms", { type: "checkbox" }) }), "I agree to terms"]),

      // Form state summary
      h("div", { class: "status" }, [
        h("span", {}, `Errors: ${errorCount()}`),
        formState().isDirty ? h("span", {}, " (modified)") : null,
      ]),

      // Submit with error display
      h("button", { type: "submit", disabled: !form.isValid() || form.isSubmitting() }, "Register"),

      form.submitError() ? h("div", { class: "error" }, String(form.submitError())) : null,
    ])
}
