/**
 * Devtools: @pyreon/form
 *
 * Demonstrates:
 * - registerForm() / unregisterForm() for manual registration
 * - getActiveForms() for listing tracked forms
 * - getFormInstance() for direct instance access
 * - getFormSnapshot() for serialized form state
 * - onFormChange() for reactive devtools UI
 * - Building a form inspector
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import { useForm } from "@pyreon/form"
import {
  registerForm,
  unregisterForm,
  getActiveForms,
  getFormInstance,
  getFormSnapshot,
  onFormChange,
  _resetDevtools,
} from "@pyreon/form/devtools"

// ─── Create and register a form ──────────────────────────────────────────────

const LoginFormWithDevtools: ComponentFn = () => {
  const form = useForm({
    initialValues: { email: "", password: "" },
    onSubmit: async (values) => console.log(values),
  })

  // Register for devtools inspection
  registerForm("login-form", form as any)

  // Unregister on unmount (optional — WeakRef handles GC)
  // onUnmount(() => unregisterForm("login-form"))

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { type: "email", ...form.register("email") }),
      h("input", { type: "password", ...form.register("password") }),
      h("button", { type: "submit" }, "Login"),
    ])
}

// ─── Form Devtools Panel ─────────────────────────────────────────────────────

const FormDevtoolsPanel: ComponentFn = () => {
  const forms = signal<string[]>(getActiveForms())
  const selected = signal<string | null>(null)

  // Update on form registration changes
  const stopListening = onFormChange(() => {
    forms.set(getActiveForms())
  })

  return () =>
    h("div", { class: "devtools-panel" }, [
      h("h3", {}, "Form Devtools"),

      // Active forms list
      h("div", {}, [
        h("h4", {}, `Tracked Forms (${forms().length})`),
        ...forms().map((name) =>
          h("div", {
            key: name,
            class: `item ${selected() === name ? "selected" : ""}`,
            onClick: () => selected.set(name),
          }, name),
        ),
      ]),

      // Form state inspector
      selected()
        ? (() => {
            const snapshot = getFormSnapshot(selected()!)
            if (!snapshot) return h("div", {}, "Form not found")

            return h("div", { class: "inspector" }, [
              h("h4", {}, `Form: ${selected()}`),

              // Show form snapshot (values, errors, touched, dirty, etc.)
              h("pre", { style: "font-size: 12px; max-height: 400px; overflow: auto;" },
                JSON.stringify(snapshot, null, 2),
              ),

              // Quick actions
              h("div", {}, [
                h("button", {
                  onClick: () => {
                    const inst = getFormInstance(selected()!) as any
                    inst?.reset?.()
                  },
                }, "Reset Form"),
                h("button", {
                  onClick: () => {
                    const inst = getFormInstance(selected()!) as any
                    inst?.clearErrors?.()
                  },
                }, "Clear Errors"),
              ]),
            ])
          })()
        : h("div", {}, "Select a form to inspect"),
    ])
}

// ─── Test cleanup ────────────────────────────────────────────────────────────
// In tests, use _resetDevtools() to clear all registrations.

// afterEach(() => _resetDevtools())
