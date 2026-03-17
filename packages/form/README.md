# @pyreon/form

Signal-based form management for Pyreon. Fields, validation, submission, arrays, and context.

## Install

```bash
bun add @pyreon/form
```

## Quick Start

```ts
import { h } from "@pyreon/core"
import { useForm } from "@pyreon/form"

function LoginForm() {
  const form = useForm({
    initialValues: { email: "", password: "" },
    validators: {
      email: (v) => (!v.includes("@") ? "Invalid email" : undefined),
      password: (v) => (v.length < 8 ? "Too short" : undefined),
    },
    validateOn: "blur",
    onSubmit: async (values) => {
      await fetch("/api/login", { method: "POST", body: JSON.stringify(values) })
    },
  })

  return () =>
    h("form", { onSubmit: form.handleSubmit }, [
      h("input", { type: "email", ...form.register("email") }),
      h("input", { type: "password", ...form.register("password") }),
      h("button", { type: "submit" }, "Login"),
    ])
}
```

## API

- `useForm(options)` — reactive form state with validation, submission, reset
- `useField(form, name)` — single field with `hasError`, `showError`, `register()`
- `useFieldArray(initial?)` — dynamic array fields with append/remove/move/swap
- `useWatch(form, name?)` — reactive field watcher
- `useFormState(form, selector?)` — computed form summary
- `FormProvider` / `useFormContext()` — context for nested components
