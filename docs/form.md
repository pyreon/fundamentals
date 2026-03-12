# Form

`@pyreon/form` provides reactive form state management with field-level validation, debouncing, schema integration, and dynamic field arrays.

## Installation

```bash
bun add @pyreon/form
```

## Quick Start

```tsx
import { useForm } from "@pyreon/form"

function LoginForm() {
  const form = useForm({
    initialValues: { email: "", password: "" },
    validators: {
      email: (value) => (!value.includes("@") ? "Invalid email" : undefined),
      password: (value) => (value.length < 8 ? "Too short" : undefined),
    },
    onSubmit: async (values) => {
      await api.login(values)
    },
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <input {...form.register("email")} />
      <span>{form.fields.email.error()}</span>

      <input {...form.register("password")} type="password" />
      <span>{form.fields.password.error()}</span>

      <button type="submit">Submit</button>
    </form>
  )
}
```

## API

### `useForm(options)`

Create a reactive form instance.

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `initialValues` | `TValues` | required | Initial field values |
| `onSubmit` | `(values: TValues) => void \| Promise<void>` | required | Submit handler |
| `validators` | `Partial<Record<keyof TValues, ValidateFn>>` | — | Per-field validators |
| `schema` | `SchemaValidateFn<TValues>` | — | Schema-level validator (e.g. from `@pyreon/validation`) |
| `validateOn` | `"blur" \| "change" \| "submit"` | `"blur"` | When to trigger validation |
| `debounceMs` | `number` | — | Debounce delay for async validators |

**Returns:** `FormState<TValues>`

### Form State

| Property | Type | Description |
| --- | --- | --- |
| `fields` | `Record<keyof TValues, FieldState>` | Per-field reactive state |
| `isSubmitting` | `Signal<boolean>` | Submission in progress |
| `isValidating` | `Signal<boolean>` | Async validation in progress |
| `isValid` | `Signal<boolean>` | No field errors |
| `isDirty` | `Signal<boolean>` | Any field changed from initial |
| `submitCount` | `Signal<number>` | Number of submit attempts |
| `submitError` | `Signal<unknown>` | Last error thrown by `onSubmit` |

### Form Methods

```ts
form.values()                        // Get all current values
form.errors()                        // Get all current errors
form.setFieldValue("email", "a@b.c") // Set a field value
form.setFieldError("email", "Taken") // Set a field error
form.setErrors({ email: "Taken" })   // Set multiple errors
form.clearErrors()                   // Clear all errors
form.resetField("email")             // Reset one field to initial
form.reset()                         // Reset entire form
form.validate()                      // Validate all fields, returns Promise<boolean>
form.handleSubmit(event?)            // Validate + submit
```

### `register(field, options?)`

Returns props for binding to an input element:

```ts
const props = form.register("email")
// { value: Signal<string>, onInput: (e) => void, onBlur: () => void }

// Checkbox:
const checkProps = form.register("agree", { type: "checkbox" })
// Also includes: checked: Signal<boolean>
```

### Field State

Each field in `form.fields` provides:

| Property | Type | Description |
| --- | --- | --- |
| `value` | `Signal<T>` | Current value |
| `error` | `Signal<string \| undefined>` | Validation error |
| `touched` | `Signal<boolean>` | Has been blurred |
| `dirty` | `Signal<boolean>` | Changed from initial value |
| `setValue(value)` | `(T) => void` | Set value programmatically |
| `setTouched()` | `() => void` | Mark as touched |
| `reset()` | `() => void` | Reset to initial value |

### Validation

**Per-field validators** receive the field value and all form values:

```ts
type ValidateFn<T, TValues> = (
  value: T,
  values: TValues,
) => ValidationError | Promise<ValidationError>

// ValidationError = string | undefined
```

**Schema validators** validate the entire form at once:

```ts
type SchemaValidateFn<TValues> = (
  values: TValues,
) => Promise<Partial<Record<keyof TValues, ValidationError>>>
```

Use `@pyreon/validation` for Zod, Valibot, or ArkType integration.

### Validation Modes

```ts
// Validate on blur (default)
useForm({ validateOn: "blur", ... })

// Validate on every keystroke
useForm({ validateOn: "change", ... })

// Validate only on submit
useForm({ validateOn: "submit", ... })
```

### Debouncing

```ts
useForm({
  debounceMs: 300, // Wait 300ms after last change before validating
  validators: {
    username: async (value) => {
      const taken = await api.checkUsername(value)
      return taken ? "Username taken" : undefined
    },
  },
  ...
})
```

## useFieldArray

Manage dynamic arrays of form fields with stable keys for efficient rendering.

```ts
import { useFieldArray } from "@pyreon/form"

const tags = useFieldArray<string>(["typescript"])

tags.append("pyreon")
tags.prepend("reactive")
tags.items() // [{ key: 0, value: Signal }, { key: 1, value: Signal }, ...]
```

**Methods:**

| Method | Description |
| --- | --- |
| `items` | `Signal<FieldArrayItem<T>[]>` — array with stable keys |
| `length` | `Signal<number>` — array length |
| `append(value)` | Add item to end |
| `prepend(value)` | Add item to start |
| `insert(index, value)` | Insert at index |
| `remove(index)` | Remove at index |
| `update(index, value)` | Update item value |
| `move(from, to)` | Move item between indices |
| `swap(a, b)` | Swap two items |
| `replace(values)` | Replace all items |
| `values()` | Get plain array of current values |

Each item has a stable `key` (number) for keyed rendering and a reactive `value` signal.

## Types

| Type | Description |
| --- | --- |
| `UseFormOptions<TValues>` | Form configuration options |
| `FormState<TValues>` | Return type of `useForm` |
| `FieldState<T>` | Per-field reactive state |
| `FieldRegisterProps<T>` | Props returned by `register()` |
| `ValidateFn<T, TValues>` | Per-field validator function |
| `SchemaValidateFn<TValues>` | Schema-level validator function |
| `ValidationError` | `string \| undefined` |
| `FieldArrayItem<T>` | `{ key: number, value: Signal<T> }` |
| `UseFieldArrayResult<T>` | Return type of `useFieldArray` |

## Devtools

Import from `@pyreon/form/devtools` for runtime inspection:

```ts
import {
  registerForm,
  getActiveForms,
  getFormInstance,
  getFormSnapshot,
  onFormChange,
} from "@pyreon/form/devtools"

registerForm("login", form)            // Register a form instance for inspection
getActiveForms()                        // Map of all registered form instances
getFormInstance("login")                // Get a specific form instance
getFormSnapshot("login")               // { values, errors, isDirty, isValid, ... }
onFormChange("login", (snapshot) => {
  console.log("Form changed:", snapshot)
}) // Returns unsubscribe function
```

## Gotchas

**All state properties are signals.** Read them with `()`: `form.isValid()`, `field.value()`.

**Dirty detection uses shallow structural equality.** Objects and arrays are compared by value, not reference.

**Debounce timers are cleaned up on unmount.** No stale validation after component removal.
