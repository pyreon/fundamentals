import { useForm as _useForm } from '@pyreon/form'
import { zodSchema } from '@pyreon/validation'
import {
  useQuery as _useQuery,
  useMutation as _useMutation,
  useQueryClient,
} from '@pyreon/query'
import type { QueryKey } from '@tanstack/query-core'
import type {
  Feature,
  FeatureConfig,
  FeatureFormOptions,
  ListOptions,
} from './types'

/**
 * Build the default fetch wrapper for a feature's API.
 */
function createFetcher(baseFetcher: typeof fetch = fetch) {
  return {
    async list<T>(
      url: string,
      params?: Record<string, string | number | boolean>,
    ): Promise<T[]> {
      const query = params
        ? `?${new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : ''
      const res = await baseFetcher(`${url}${query}`)
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
      return res.json()
    },

    async getById<T>(url: string, id: string | number): Promise<T> {
      const res = await baseFetcher(`${url}/${id}`)
      if (!res.ok) throw new Error(`GET ${url}/${id} failed: ${res.status}`)
      return res.json()
    },

    async create<T>(url: string, data: unknown): Promise<T> {
      const res = await baseFetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
      return res.json()
    },

    async update<T>(
      url: string,
      id: string | number,
      data: unknown,
    ): Promise<T> {
      const res = await baseFetcher(`${url}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`PUT ${url}/${id} failed: ${res.status}`)
      return res.json()
    },

    async delete(url: string, id: string | number): Promise<void> {
      const res = await baseFetcher(`${url}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`DELETE ${url}/${id} failed: ${res.status}`)
    },
  }
}

/**
 * Define a schema-driven feature with auto-generated CRUD hooks.
 *
 * Given a name, schema, and API base path, returns typed hooks for:
 * - `useList()` — paginated list query
 * - `useById(id)` — single-item query
 * - `useCreate()` — create mutation with cache invalidation
 * - `useUpdate()` — update mutation with cache invalidation
 * - `useDelete()` — delete mutation with cache invalidation
 * - `useForm()` — validated form with submit wired to create/update
 *
 * @example
 * ```ts
 * import { defineFeature } from '@pyreon/feature'
 * import { z } from 'zod'
 *
 * const users = defineFeature({
 *   name: 'users',
 *   schema: z.object({
 *     name: z.string().min(2),
 *     email: z.string().email(),
 *   }),
 *   api: '/api/users',
 * })
 *
 * // In components:
 * const { data, isPending } = users.useList()
 * const { mutate } = users.useCreate()
 * const form = users.useForm()
 * ```
 */
export function defineFeature<TValues extends Record<string, unknown>>(
  config: FeatureConfig<TValues>,
): Feature<TValues> {
  const { name, schema, api, initialValues, fetcher: customFetcher } = config
  const http = createFetcher(customFetcher)

  const queryKeyBase = [name] as const
  const queryKey = (suffix?: string | number): QueryKey =>
    suffix !== undefined ? [name, suffix] : [name]

  const validate = config.validate ?? (zodSchema(schema as any) as any)

  return {
    name,
    api,
    schema,
    queryKey,

    useList(options?: ListOptions) {
      return _useQuery(() => ({
        queryKey: [...queryKeyBase, 'list', options?.params ?? {}],
        queryFn: () => http.list<TValues>(api, options?.params),
        staleTime: options?.staleTime,
        enabled: options?.enabled,
      }))
    },

    useById(id: string | number) {
      return _useQuery(() => ({
        queryKey: [name, id],
        queryFn: () => http.getById<TValues>(api, id),
        enabled: id !== undefined && id !== null,
      }))
    },

    useCreate() {
      const client = useQueryClient()
      return _useMutation({
        mutationFn: (data: Partial<TValues>) => http.create<TValues>(api, data),
        onSuccess: () => {
          client.invalidateQueries({ queryKey: queryKeyBase as any })
        },
      })
    },

    useUpdate() {
      const client = useQueryClient()
      return _useMutation({
        mutationFn: ({
          id,
          data,
        }: {
          id: string | number
          data: Partial<TValues>
        }) => http.update<TValues>(api, id, data),
        onSuccess: (_data, variables) => {
          client.invalidateQueries({ queryKey: queryKeyBase as any })
          client.invalidateQueries({
            queryKey: [name, variables.id],
          })
        },
      })
    },

    useDelete() {
      const client = useQueryClient()
      return _useMutation({
        mutationFn: (id: string | number) => http.delete(api, id),
        onSuccess: () => {
          client.invalidateQueries({ queryKey: queryKeyBase as any })
        },
      })
    },

    useForm(options?: FeatureFormOptions<TValues>) {
      const mergedInitial = {
        ...(initialValues ?? ({} as TValues)),
        ...(options?.initialValues ?? {}),
      } as TValues

      return _useForm<TValues>({
        initialValues: mergedInitial,
        schema: validate,
        validateOn: options?.validateOn ?? 'blur',
        onSubmit: async (values) => {
          try {
            const result = await http.create<TValues>(api, values)
            options?.onSuccess?.(result)
          } catch (err) {
            options?.onError?.(err)
            throw err
          }
        },
      })
    },
  }
}
