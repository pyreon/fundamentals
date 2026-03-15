/**
 * @pyreon/form — Basic Login Form
 *
 * Demonstrates:
 * - useForm() with initialValues, validators, and onSubmit
 * - register() for binding inputs
 * - Field-level validation
 * - handleSubmit with event prevention
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { useForm } from "@pyreon/form"

// ─── Login Form Component ────────────────────────────────────────────────────

const LoginForm: ComponentFn = () => {
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validators: {
      email: (value) => {
        if (!value) return "Email is required"
        if (!value.includes("@")) return "Invalid email address"
        return undefined
      },
      password: (value) => {
        if (!value) return "Password is required"
        if (value.length < 8) return "Password must be at least 8 characters"
        return undefined
      },
    },
    validateOn: "blur", // Validate when the field loses focus
    onSubmit: async (values) => {
      console.log("Submitting:", values)
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1000))
      console.log("Login successful!")
    },
  })

  // register() returns { value, onInput, onBlur } for binding to inputs
  const emailProps = form.register("email")
  const passwordProps = form.register("password")

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("div", {}, [
        h("label", {}, "Email"),
        h("input", { type: "email", ...emailProps }),
        // Show error only after the field has been touched
        form.fields.email.touched() && form.fields.email.error()
          ? h("span", { class: "error" }, form.fields.email.error()!)
          : null,
      ]),

      h("div", {}, [
        h("label", {}, "Password"),
        h("input", { type: "password", ...passwordProps }),
        form.fields.password.touched() && form.fields.password.error()
          ? h("span", { class: "error" }, form.fields.password.error()!)
          : null,
      ]),

      h(
        "button",
        {
          type: "submit",
          disabled: form.isSubmitting(),
        },
        form.isSubmitting() ? "Logging in..." : "Login",
      ),
    ])
}
