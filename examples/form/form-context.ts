/**
 * @pyreon/form — Form Context Pattern
 *
 * Demonstrates:
 * - FormProvider for passing form state through component tree
 * - useFormContext() for accessing form from nested components
 * - Composing form sections as independent components
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { useForm, useField, FormProvider, useFormContext, useFormState } from "@pyreon/form"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  bio: string
  website: string
}

// ─── Child component: Personal Info Section ──────────────────────────────────
// Accesses the form via context — no prop drilling needed.

const PersonalInfoSection: ComponentFn = () => {
  const form = useFormContext<ProfileForm>()
  const firstName = useField(form, "firstName")
  const lastName = useField(form, "lastName")
  const email = useField(form, "email")

  return () =>
    h("fieldset", {}, [
      h("legend", {}, "Personal Information"),

      h("div", {}, [
        h("label", {}, "First Name"),
        h("input", { ...firstName.register() }),
        firstName.showError() ? h("span", { class: "error" }, firstName.error()!) : null,
      ]),

      h("div", {}, [
        h("label", {}, "Last Name"),
        h("input", { ...lastName.register() }),
        lastName.showError() ? h("span", { class: "error" }, lastName.error()!) : null,
      ]),

      h("div", {}, [
        h("label", {}, "Email"),
        h("input", { type: "email", ...email.register() }),
        email.showError() ? h("span", { class: "error" }, email.error()!) : null,
      ]),
    ])
}

// ─── Child component: Profile Details Section ────────────────────────────────

const ProfileDetailsSection: ComponentFn = () => {
  const form = useFormContext<ProfileForm>()
  const bio = useField(form, "bio")
  const website = useField(form, "website")

  return () =>
    h("fieldset", {}, [
      h("legend", {}, "Profile Details"),

      h("div", {}, [
        h("label", {}, "Bio"),
        h("textarea", { ...bio.register() }),
      ]),

      h("div", {}, [
        h("label", {}, "Website"),
        h("input", { type: "url", ...website.register() }),
        website.showError() ? h("span", { class: "error" }, website.error()!) : null,
      ]),
    ])
}

// ─── Child component: Form Status Bar ────────────────────────────────────────

const FormStatusBar: ComponentFn = () => {
  const form = useFormContext<ProfileForm>()
  const state = useFormState(form)

  return () => {
    const s = state()
    return h("div", { class: "status-bar" }, [
      s.isDirty ? h("span", {}, "Unsaved changes") : h("span", {}, "No changes"),
      s.isSubmitting ? h("span", {}, "Saving...") : null,
      !s.isValid ? h("span", { class: "error" }, `${Object.keys(s.errors).length} error(s)`) : null,
    ])
  }
}

// ─── Parent component: Profile Page ──────────────────────────────────────────

const ProfilePage: ComponentFn = () => {
  const form = useForm<ProfileForm>({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      bio: "",
      website: "",
    },
    validators: {
      firstName: (v) => (!v ? "Required" : undefined),
      lastName: (v) => (!v ? "Required" : undefined),
      email: (v) => (!v ? "Required" : !v.includes("@") ? "Invalid email" : undefined),
      website: (v) => (v && !v.startsWith("http") ? "Must start with http" : undefined),
    },
    onSubmit: async (values) => {
      await fetch("/api/profile", { method: "PUT", body: JSON.stringify(values) })
    },
  })

  // FormProvider makes the form available to all children via context
  return () =>
    h(FormProvider, { form }, [
      h("form", { onSubmit: form.handleSubmit }, [
        h(FormStatusBar, {}),
        h(PersonalInfoSection, {}),
        h(ProfileDetailsSection, {}),

        h("div", { class: "actions" }, [
          h("button", { type: "submit", disabled: form.isSubmitting() }, "Save Profile"),
          h("button", { type: "button", onClick: () => form.reset() }, "Reset"),
        ]),
      ]),
    ])
}
