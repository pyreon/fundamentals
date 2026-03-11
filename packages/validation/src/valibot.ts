import type { SchemaValidateFn, ValidateFn, ValidationError } from '@pyreon/form'
import type { ValidationIssue } from './types'
import { issuesToRecord } from './utils'

/**
 * Minimal Valibot-compatible interfaces so we don't require valibot as a hard dep.
 * These match Valibot v1's public API surface.
 */
interface ValibotPathItem {
  key: string | number
}

interface ValibotIssue {
  path?: ValibotPathItem[]
  message: string
}

interface ValibotSafeParseResult<T> {
  success: boolean
  output?: T
  issues?: ValibotIssue[]
}

/**
 * Generic parse function signature that accepts any schema-like first arg.
 * This matches both valibot's `safeParse` and `safeParseAsync`.
 */
type GenericSafeParseFn = (
  schema: unknown,
  input: unknown,
) => ValibotSafeParseResult<unknown> | Promise<ValibotSafeParseResult<unknown>>

function valibotIssuesToGeneric(issues: ValibotIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path?.map((p) => String(p.key)).join('.') ?? '',
    message: issue.message,
  }))
}

/**
 * Create a form-level schema validator from a Valibot schema.
 *
 * Valibot uses standalone functions rather than methods, so you must pass
 * the `safeParseAsync` (or `safeParse`) function from valibot.
 *
 * @example
 * import * as v from 'valibot'
 * import { valibotSchema } from '@pyreon/validation/valibot'
 *
 * const schema = v.object({
 *   email: v.pipe(v.string(), v.email()),
 *   password: v.pipe(v.string(), v.minLength(8)),
 * })
 *
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   schema: valibotSchema(schema, v.safeParseAsync),
 *   onSubmit: (values) => { ... },
 * })
 */
export function valibotSchema<TValues extends Record<string, unknown>>(
  schema: unknown,
  safeParseFn: GenericSafeParseFn,
): SchemaValidateFn<TValues> {
  return async (values: TValues) => {
    const result = await safeParseFn(schema, values)
    if (result.success) return {} as Partial<Record<keyof TValues, ValidationError>>
    return issuesToRecord<TValues>(valibotIssuesToGeneric(result.issues ?? []))
  }
}

/**
 * Create a single-field validator from a Valibot schema.
 *
 * @example
 * import * as v from 'valibot'
 * import { valibotField } from '@pyreon/validation/valibot'
 *
 * const form = useForm({
 *   initialValues: { email: '' },
 *   validators: {
 *     email: valibotField(v.pipe(v.string(), v.email('Invalid email')), v.safeParseAsync),
 *   },
 *   onSubmit: (values) => { ... },
 * })
 */
export function valibotField<T>(
  schema: unknown,
  safeParseFn: GenericSafeParseFn,
): ValidateFn<T> {
  return async (value: T) => {
    const result = await safeParseFn(schema, value)
    if (result.success) return undefined
    return result.issues?.[0]?.message
  }
}
