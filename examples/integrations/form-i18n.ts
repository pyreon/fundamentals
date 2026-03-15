/**
 * Cross-Package Integration: Form + i18n
 *
 * Demonstrates:
 * - Translated form labels, placeholders, and error messages
 * - i18n-powered validation messages
 * - Locale-aware form that re-validates on language switch
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { useForm, useField, FormProvider, useFormContext } from "@pyreon/form"
import { createI18n, I18nProvider, useI18n } from "@pyreon/i18n"

// ─── i18n setup with form translations ───────────────────────────────────────

const i18n = createI18n({
  locale: "en",
  messages: {
    en: {
      form: {
        name: { label: "Full Name", placeholder: "Enter your name" },
        email: { label: "Email", placeholder: "you@example.com" },
        message: { label: "Message", placeholder: "Write your message..." },
        submit: "Send Message",
        success: "Message sent successfully!",
      },
      errors: {
        required: "This field is required",
        email: "Please enter a valid email address",
        minLength: "Must be at least {{min}} characters",
        maxLength: "Must be at most {{max}} characters",
      },
    },
    de: {
      form: {
        name: { label: "Vollständiger Name", placeholder: "Geben Sie Ihren Namen ein" },
        email: { label: "E-Mail", placeholder: "du@beispiel.de" },
        message: { label: "Nachricht", placeholder: "Schreiben Sie Ihre Nachricht..." },
        submit: "Nachricht senden",
        success: "Nachricht erfolgreich gesendet!",
      },
      errors: {
        required: "Dieses Feld ist erforderlich",
        email: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
        minLength: "Muss mindestens {{min}} Zeichen lang sein",
        maxLength: "Darf höchstens {{max}} Zeichen lang sein",
      },
    },
  },
})

// ─── i18n-aware validators ───────────────────────────────────────────────────
// Validators reference i18n.t() so error messages update with locale.

function createValidators() {
  return {
    name: (value: string) => {
      if (!value) return i18n.t("errors.required")
      if (value.length < 2) return i18n.t("errors.minLength", { min: 2 })
      return undefined
    },
    email: (value: string) => {
      if (!value) return i18n.t("errors.required")
      if (!value.includes("@")) return i18n.t("errors.email")
      return undefined
    },
    message: (value: string) => {
      if (!value) return i18n.t("errors.required")
      if (value.length < 10) return i18n.t("errors.minLength", { min: 10 })
      if (value.length > 500) return i18n.t("errors.maxLength", { max: 500 })
      return undefined
    },
  }
}

// ─── Translated form fields ──────────────────────────────────────────────────

const TranslatedField: ComponentFn<{
  name: string
  type?: string
  multiline?: boolean
}> = (props) => {
  const { t } = useI18n()
  const form = useFormContext()
  const field = useField(form, props.name as any)

  return () =>
    h("div", { class: "field" }, [
      h("label", {}, t(`form.${props.name}.label`)),
      props.multiline
        ? h("textarea", {
            placeholder: t(`form.${props.name}.placeholder`),
            ...field.register(),
          })
        : h("input", {
            type: props.type ?? "text",
            placeholder: t(`form.${props.name}.placeholder`),
            ...field.register(),
          }),
      field.showError() ? h("span", { class: "error" }, field.error()!) : null,
    ])
}

// ─── Language Switcher ───────────────────────────────────────────────────────

const LanguageSwitcher: ComponentFn = () => {
  const { locale } = useI18n()

  return () =>
    h("div", { class: "language-switcher" }, [
      h("button", {
        onClick: () => locale.set("en"),
        class: locale() === "en" ? "active" : "",
      }, "English"),
      h("button", {
        onClick: () => locale.set("de"),
        class: locale() === "de" ? "active" : "",
      }, "Deutsch"),
    ])
}

// ─── Contact Form ────────────────────────────────────────────────────────────

const ContactForm: ComponentFn = () => {
  const { t } = useI18n()

  const form = useForm({
    initialValues: { name: "", email: "", message: "" },
    validators: createValidators(),
    validateOn: "blur",
    onSubmit: async (values) => {
      await fetch("/api/contact", { method: "POST", body: JSON.stringify(values) })
      alert(t("form.success"))
      form.reset()
    },
  })

  return () =>
    h(FormProvider, { form }, [
      h("form", { onSubmit: form.handleSubmit }, [
        h(TranslatedField, { name: "name" }),
        h(TranslatedField, { name: "email", type: "email" }),
        h(TranslatedField, { name: "message", multiline: true }),
        h("button", { type: "submit", disabled: form.isSubmitting() }, t("form.submit")),
      ]),
    ])
}

// ─── App ─────────────────────────────────────────────────────────────────────

const App: ComponentFn = () => {
  return () =>
    h(I18nProvider, { instance: i18n }, [
      h(LanguageSwitcher, {}),
      h(ContactForm, {}),
    ])
}
