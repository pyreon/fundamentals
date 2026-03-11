import { onUnmount } from '@pyreon/core'
import { signal, computed, effect } from '@pyreon/reactivity'
import type { Signal } from '@pyreon/reactivity'
import type {
  FieldRegisterProps,
  FieldState,
  FormState,
  UseFormOptions,
  ValidationError,
} from './types'

/**
 * Create a signal-based form. Returns reactive field states, form-level
 * signals, and handlers for submit/reset/validate.
 *
 * @example
 * const form = useForm({
 *   initialValues: { email: '', password: '', remember: false },
 *   validators: {
 *     email: (v) => (!v ? 'Required' : undefined),
 *     password: (v, all) => (v.length < 8 ? 'Too short' : undefined),
 *   },
 *   onSubmit: async (values) => { await login(values) },
 * })
 *
 * // Bind with register():
 * // h('input', form.register('email'))
 * // h('input', { type: 'checkbox', ...form.register('remember', { type: 'checkbox' }) })
 */
export function useForm<TValues extends Record<string, unknown>>(
  options: UseFormOptions<TValues>,
): FormState<TValues> {
  const { initialValues, onSubmit, validators, schema, validateOn = 'blur', debounceMs } = options

  // Build field states
  const fieldEntries = Object.entries(initialValues) as [
    keyof TValues & string,
    TValues[keyof TValues],
  ][]

  const fields = {} as { [K in keyof TValues]: FieldState<TValues[K]> }

  // Debounce timers per field (only allocated when debounceMs is set)
  const debounceTimers: Partial<Record<keyof TValues, ReturnType<typeof setTimeout>>> = {}

  // Validation version per field — used to discard stale async results
  const validationVersions: Partial<Record<keyof TValues, number>> = {}

  // Helper to get all current values (used by cross-field validators)
  const getValues = (): TValues => {
    const values = {} as TValues
    for (const [name] of fieldEntries) {
      ;(values as Record<string, unknown>)[name] = fields[name]?.value.peek() ?? (initialValues as Record<string, unknown>)[name]
    }
    return values
  }

  // Clear all pending debounce timers
  const clearAllTimers = () => {
    for (const key of Object.keys(debounceTimers)) {
      clearTimeout(debounceTimers[key as keyof TValues])
      delete debounceTimers[key as keyof TValues]
    }
  }

  const isValidating = signal(false)
  const submitError = signal<unknown>(undefined)

  for (const [name, initial] of fieldEntries) {
    const valueSig = signal(initial) as Signal<TValues[typeof name]>
    const errorSig = signal<ValidationError>(undefined)
    const touchedSig = signal(false)
    const dirtySig = signal(false)

    // Initialize validation version
    validationVersions[name] = 0

    const runValidation = async (value: TValues[typeof name]) => {
      const fieldValidator = validators?.[name]
      if (fieldValidator) {
        // Bump version to track this validation run
        const currentVersion = (validationVersions[name] = (validationVersions[name] ?? 0) + 1)
        const result = await fieldValidator(value, getValues())
        // Only apply result if this is still the latest validation for this field
        if (validationVersions[name] === currentVersion) {
          errorSig.set(result)
        }
        return result
      }
      errorSig.set(undefined)
      return undefined
    }

    const validateField = debounceMs
      ? (value: TValues[typeof name]) => {
          clearTimeout(debounceTimers[name])
          return new Promise<ValidationError>((resolve) => {
            debounceTimers[name] = setTimeout(async () => {
              resolve(await runValidation(value))
            }, debounceMs)
          })
        }
      : runValidation

    // Auto-validate on change if configured
    if (validateOn === 'change') {
      effect(() => {
        const v = valueSig()
        validateField(v)
      })
    }

    fields[name] = {
      value: valueSig,
      error: errorSig,
      touched: touchedSig,
      dirty: dirtySig,
      setValue: (value: TValues[typeof name]) => {
        valueSig.set(value)
        // Deep comparison for objects/arrays, reference for primitives
        dirtySig.set(!structuredEqual(value, initial))
      },
      setTouched: () => {
        touchedSig.set(true)
        if (validateOn === 'blur') {
          validateField(valueSig.peek())
        }
      },
      reset: () => {
        valueSig.set(initial)
        errorSig.set(undefined)
        touchedSig.set(false)
        dirtySig.set(false)
        clearTimeout(debounceTimers[name])
      },
    } as FieldState<TValues[typeof name]>
  }

  // Clean up debounce timers on unmount
  onUnmount(clearAllTimers)

  const isSubmitting = signal(false)
  const submitCount = signal(0)

  // Form-level computed signals
  const isValid = computed(() => {
    for (const name of fieldEntries.map(([n]) => n)) {
      if (fields[name].error() !== undefined) return false
    }
    return true
  })

  const isDirty = computed(() => {
    for (const name of fieldEntries.map(([n]) => n)) {
      if (fields[name].dirty()) return true
    }
    return false
  })

  const getErrors = (): Partial<Record<keyof TValues, ValidationError>> => {
    const errors = {} as Partial<Record<keyof TValues, ValidationError>>
    for (const [name] of fieldEntries) {
      const err = fields[name].error.peek()
      if (err !== undefined) errors[name] = err
    }
    return errors
  }

  const validate = async (): Promise<boolean> => {
    // Cancel any pending debounced validations
    clearAllTimers()

    isValidating.set(true)

    try {
      const allValues = getValues()

      // Run field-level validators with all values for cross-field support
      const results = await Promise.all(
        fieldEntries.map(async ([name]) => {
          const fieldValidator = validators?.[name]
          if (fieldValidator) {
            // Bump version so any in-flight debounced validation is discarded
            const currentVersion = (validationVersions[name] = (validationVersions[name] ?? 0) + 1)
            const error = await fieldValidator(fields[name].value.peek(), allValues)
            if (validationVersions[name] === currentVersion) {
              fields[name].error.set(error)
            }
            return error
          }
          return undefined
        }),
      )

      // Run schema-level validator
      if (schema) {
        const schemaErrors = await schema(allValues)
        for (const [name] of fieldEntries) {
          const schemaError = schemaErrors[name]
          if (schemaError !== undefined) {
            fields[name].error.set(schemaError)
          }
        }
        // Check if schema added any errors
        for (const key of Object.keys(schemaErrors)) {
          if (schemaErrors[key as keyof TValues] !== undefined) return false
        }
      }

      return results.every((r) => r === undefined)
    } finally {
      isValidating.set(false)
    }
  }

  const handleSubmit = async (e?: Event) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }

    submitError.set(undefined)
    submitCount.update((n) => n + 1)

    // Mark all fields as touched
    for (const [name] of fieldEntries) {
      fields[name].touched.set(true)
    }

    const valid = await validate()
    if (!valid) return

    isSubmitting.set(true)
    try {
      await onSubmit(getValues())
    } catch (err) {
      submitError.set(err)
      throw err
    } finally {
      isSubmitting.set(false)
    }
  }

  const reset = () => {
    clearAllTimers()
    for (const [name] of fieldEntries) {
      fields[name].reset()
    }
    submitCount.set(0)
    submitError.set(undefined)
  }

  const setFieldValue = <K extends keyof TValues>(field: K, value: TValues[K]) => {
    if (fields[field]) {
      fields[field].setValue(value)
    }
  }

  const setFieldError = (field: keyof TValues, error: ValidationError) => {
    if (fields[field]) {
      fields[field].error.set(error)
    }
  }

  const setErrors = (errors: Partial<Record<keyof TValues, ValidationError>>) => {
    for (const [name, error] of Object.entries(errors)) {
      setFieldError(name as keyof TValues, error as ValidationError)
    }
  }

  const clearErrors = () => {
    for (const [name] of fieldEntries) {
      fields[name].error.set(undefined)
    }
  }

  const resetField = (field: keyof TValues) => {
    if (fields[field]) {
      fields[field].reset()
    }
  }

  // Memoized register props per field+type combo
  const registerCache = new Map<string, FieldRegisterProps<unknown>>()

  const register = <K extends keyof TValues & string>(
    field: K,
    opts?: { type?: 'checkbox' },
  ): FieldRegisterProps<TValues[K]> => {
    const cacheKey = `${field}:${opts?.type ?? 'text'}`
    const cached = registerCache.get(cacheKey)
    if (cached) return cached as FieldRegisterProps<TValues[K]>

    const fieldState = fields[field]
    const props: FieldRegisterProps<TValues[K]> = {
      value: fieldState.value,
      onInput: (e: Event) => {
        const target = e.target as HTMLInputElement
        if (opts?.type === 'checkbox') {
          fieldState.setValue(target.checked as TValues[K])
        } else {
          fieldState.setValue(target.value as TValues[K])
        }
      },
      onBlur: () => {
        fieldState.setTouched()
      },
    }

    if (opts?.type === 'checkbox') {
      props.checked = computed(() => Boolean(fieldState.value())) as Signal<boolean>
    }

    registerCache.set(cacheKey, props as FieldRegisterProps<unknown>)
    return props
  }

  return {
    fields,
    isSubmitting,
    isValidating,
    isValid,
    isDirty,
    submitCount,
    submitError,
    values: getValues,
    errors: getErrors,
    setFieldValue,
    setFieldError,
    setErrors,
    clearErrors,
    resetField,
    register,
    handleSubmit,
    reset,
    validate,
  }
}

/** Shallow structural equality — handles primitives, plain objects, and arrays. */
function structuredEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) return false
    for (const key of aKeys) {
      if (!Object.is(aObj[key], bObj[key])) return false
    }
    return true
  }

  return false
}
