import type { SchemaValidateFn, ValidateFn, ValidationError } from '@pyreon/form'
import type { ValidationIssue } from './types'
import { issuesToRecord } from './utils'

/**
 * Minimal ArkType-compatible interfaces so we don't require arktype as a hard dep.
 * These match ArkType v2's public API surface.
 */
interface ArkError {
  path: (string | number)[]
  message: string
}

interface ArkErrors extends Array<ArkError> {
  summary: string
}

interface ArkTypeSchema<T = unknown> {
  (data: unknown): T | ArkErrors
  allows(data: unknown): data is T
}

function isArkErrors(result: unknown): result is ArkErrors {
  return Array.isArray(result) && 'summary' in (result as object)
}

function arkIssuesToGeneric(errors: ArkErrors): ValidationIssue[] {
  return errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }))
}

/**
 * Create a form-level schema validator from an ArkType schema.
 *
 * @example
 * import { type } from 'arktype'
 * import { arktypeSchema } from '@pyreon/validation/arktype'
 *
 * const schema = type({
 *   email: 'string.email',
 *   password: 'string >= 8',
 * })
 *
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   schema: arktypeSchema(schema),
 *   onSubmit: (values) => { ... },
 * })
 */
export function arktypeSchema<TValues extends Record<string, unknown>>(
  schema: ArkTypeSchema<TValues>,
): SchemaValidateFn<TValues> {
  return (values: TValues) => {
    const result = schema(values)
    if (!isArkErrors(result)) return {} as Partial<Record<keyof TValues, ValidationError>>
    return issuesToRecord<TValues>(arkIssuesToGeneric(result))
  }
}

/**
 * Create a single-field validator from an ArkType schema.
 *
 * @example
 * import { type } from 'arktype'
 * import { arktypeField } from '@pyreon/validation/arktype'
 *
 * const form = useForm({
 *   initialValues: { email: '' },
 *   validators: {
 *     email: arktypeField(type('string.email')),
 *   },
 *   onSubmit: (values) => { ... },
 * })
 */
export function arktypeField<T>(schema: ArkTypeSchema<T>): ValidateFn<T> {
  return (value: T) => {
    const result = schema(value)
    if (!isArkErrors(result)) return undefined
    return result[0]?.message
  }
}
