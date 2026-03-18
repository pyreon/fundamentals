
import type { FormState } from '@pyreon/form'
import type { UseQueryResult, UseMutationResult } from '@pyreon/query'
import type { QueryKey } from '@tanstack/query-core'

/**
 * Schema interface — duck-typed to work with Zod, Valibot, ArkType, or any
 * object that can parse/validate and infer a TypeScript type.
 *
 * For now we accept `unknown` and rely on the generic `TValues` for typing.
 * The schema is passed through to @pyreon/validation adapters.
 */
export type FeatureSchema = unknown

/**
 * Configuration for defining a feature.
 */
export interface FeatureConfig<TValues extends Record<string, unknown>> {
  /** Unique feature name — used for store ID and query key namespace. */
  name: string
  /** Validation schema (Zod, Valibot, or ArkType). Passed to zodSchema/valibotSchema/arktypeSchema. */
  schema: FeatureSchema
  /** Schema-level validation function for forms. If not provided, schema is used with zodSchema(). */
  validate?: (
    values: TValues,
  ) =>
    | Partial<Record<keyof TValues, string | undefined>>
    | Promise<Partial<Record<keyof TValues, string | undefined>>>
  /** API base path (e.g., '/api/users'). */
  api: string
  /** Default initial values for create forms. If not provided, uses empty strings/zeros. */
  initialValues?: TValues
  /** Custom fetch function. Defaults to global fetch. */
  fetcher?: typeof fetch
}

/**
 * A single item with an ID.
 */
export interface FeatureItem<_TValues> {
  id: string | number
  [key: string]: unknown
}

/**
 * Query options that can be overridden per-call.
 */
export interface ListOptions {
  /** Additional query parameters. */
  params?: Record<string, string | number | boolean>
  /** Override stale time. */
  staleTime?: number
  /** Enable/disable the query. */
  enabled?: boolean
}

/**
 * Form options that can be overridden per-call.
 */
export interface FeatureFormOptions<TValues extends Record<string, unknown>> {
  /** Override initial values. */
  initialValues?: Partial<TValues>
  /** Override validation mode. */
  validateOn?: 'blur' | 'change' | 'submit'
  /** Callback after successful submit. */
  onSuccess?: (result: unknown) => void
  /** Callback on submit error. */
  onError?: (error: unknown) => void
}

/**
 * The feature object returned by defineFeature().
 * Provides typed hooks for queries, mutations, forms, and tables.
 */
export interface Feature<TValues extends Record<string, unknown>> {
  /** Feature name. */
  name: string
  /** API base path. */
  api: string
  /** The schema passed to defineFeature. */
  schema: FeatureSchema

  /** Fetch a paginated/filtered list. */
  useList: (options?: ListOptions) => UseQueryResult<TValues[], unknown>

  /** Fetch a single item by ID. */
  useById: (id: string | number) => UseQueryResult<TValues, unknown>

  /** Create mutation — POST to api. Invalidates list query on success. */
  useCreate: () => UseMutationResult<TValues, unknown, Partial<TValues>>

  /** Update mutation — PUT to api/:id. Invalidates list + item queries on success. */
  useUpdate: () => UseMutationResult<
    TValues,
    unknown,
    { id: string | number; data: Partial<TValues> }
  >

  /** Delete mutation — DELETE to api/:id. Invalidates list query on success. */
  useDelete: () => UseMutationResult<void, unknown, string | number>

  /** Create a form pre-wired with schema validation and submit handler. */
  useForm: (options?: FeatureFormOptions<TValues>) => FormState<TValues>

  /** Query key namespace for manual cache operations. */
  queryKey: (suffix?: string | number) => QueryKey
}
