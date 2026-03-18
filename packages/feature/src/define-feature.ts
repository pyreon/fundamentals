import { signal } from '@pyreon/reactivity'
import { useForm as _useForm } from '@pyreon/form'
import type { SchemaValidateFn } from '@pyreon/form'
import { zodSchema } from '@pyreon/validation'
import {
  useQuery as _useQuery,
  useMutation as _useMutation,
  useQueryClient,
} from '@pyreon/query'
import type { QueryKey } from '@pyreon/query'
import {
  useTable as _useTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@pyreon/table'
import type { ColumnDef, SortingState } from '@pyreon/table'
import { extractFields, defaultInitialValues } from './schema'
import type {
  Feature,
  FeatureConfig,
  FeatureFormOptions,
  FeatureTableOptions,
  ListOptions,
} from './types'

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

function createFetcher(baseFetcher: typeof fetch = fetch) {
  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await baseFetcher(url, init)

    if (!res.ok) {
      let message = `${init?.method ?? 'GET'} ${url} failed: ${res.status}`
      try {
        const body = await res.json()
        if (body?.message) message = body.message
        if (body?.errors) {
          throw Object.assign(new Error(message), {
            status: res.status,
            errors: body.errors,
          })
        }
      } catch (e) {
        if (e instanceof Error && 'errors' in e) throw e
      }
      throw Object.assign(new Error(message), { status: res.status })
    }

    if (res.status === 204) return undefined as T
    return res.json()
  }

  return {
    list<T>(
      url: string,
      params?: Record<string, string | number | boolean>,
    ): Promise<T[]> {
      const query = params
        ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`
        : ''
      return request<T[]>(`${url}${query}`)
    },
    getById<T>(url: string, id: string | number): Promise<T> {
      return request<T>(`${url}/${id}`)
    },
    create<T>(url: string, data: unknown): Promise<T> {
      return request<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    update<T>(url: string, id: string | number, data: unknown): Promise<T> {
      return request<T>(`${url}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    delete(url: string, id: string | number): Promise<void> {
      return request<void>(`${url}/${id}`, { method: 'DELETE' })
    },
  }
}

// ─── Schema validation ────────────────────────────────────────────────────────

function createValidator<TValues extends Record<string, unknown>>(
  schema: unknown,
  customValidate?: SchemaValidateFn<TValues>,
): SchemaValidateFn<TValues> | undefined {
  if (customValidate) return customValidate

  if (
    schema &&
    typeof schema === 'object' &&
    'safeParseAsync' in schema &&
    typeof (schema as Record<string, unknown>).safeParseAsync === 'function'
  ) {
    return zodSchema(
      schema as Parameters<typeof zodSchema>[0],
    ) as SchemaValidateFn<TValues>
  }

  return undefined
}

// ─── defineFeature ────────────────────────────────────────────────────────────

/**
 * Define a schema-driven feature with auto-generated CRUD hooks.
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
 *     role: z.enum(['admin', 'editor', 'viewer']),
 *   }),
 *   api: '/api/users',
 * })
 * ```
 */
export function defineFeature<TValues extends Record<string, unknown>>(
  config: FeatureConfig<TValues>,
): Feature<TValues> {
  const { name, schema, api, fetcher: customFetcher } = config
  const http = createFetcher(customFetcher)

  // Introspect schema fields
  const fields = extractFields(schema)
  const autoInitialValues = defaultInitialValues(fields) as TValues
  const initialValues = config.initialValues
    ? { ...autoInitialValues, ...config.initialValues }
    : autoInitialValues

  const validate = createValidator<TValues>(schema, config.validate)

  const queryKeyBase = [name] as const
  const queryKey = (suffix?: string | number): QueryKey =>
    suffix !== undefined ? [name, suffix] : [name]

  return {
    name,
    api,
    schema,
    fields,
    queryKey,

    // ─── Queries ────────────────────────────────────────────────────

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

    useSearch(searchTerm, options?: ListOptions) {
      return _useQuery(() => ({
        queryKey: [...queryKeyBase, 'search', searchTerm()],
        queryFn: () =>
          http.list<TValues>(api, { ...options?.params, q: searchTerm() }),
        enabled: searchTerm().length > 0,
        staleTime: options?.staleTime,
      }))
    },

    // ─── Mutations ──────────────────────────────────────────────────

    useCreate() {
      const client = useQueryClient()
      return _useMutation({
        mutationFn: (data: Partial<TValues>) => http.create<TValues>(api, data),
        onSuccess: () => {
          client.invalidateQueries({
            queryKey: queryKeyBase as unknown as QueryKey,
          })
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
          client.invalidateQueries({
            queryKey: queryKeyBase as unknown as QueryKey,
          })
          client.invalidateQueries({ queryKey: [name, variables.id] })
        },
      })
    },

    useDelete() {
      const client = useQueryClient()
      return _useMutation({
        mutationFn: (id: string | number) => http.delete(api, id),
        onSuccess: () => {
          client.invalidateQueries({
            queryKey: queryKeyBase as unknown as QueryKey,
          })
        },
      })
    },

    // ─── Form ───────────────────────────────────────────────────────

    useForm(options?: FeatureFormOptions<TValues>) {
      const mode = options?.mode ?? 'create'
      const mergedInitial = {
        ...initialValues,
        ...(options?.initialValues ?? {}),
      } as TValues

      return _useForm<TValues>({
        initialValues: mergedInitial,
        schema: validate,
        validateOn: options?.validateOn ?? 'blur',
        onSubmit: async (values) => {
          try {
            let result: unknown
            if (mode === 'edit' && options?.id !== undefined) {
              result = await http.update<TValues>(api, options.id, values)
            } else {
              result = await http.create<TValues>(api, values)
            }
            options?.onSuccess?.(result)
          } catch (err) {
            options?.onError?.(err)
            throw err
          }
        },
      })
    },

    // ─── Table ──────────────────────────────────────────────────────

    useTable(
      data: TValues[] | (() => TValues[]),
      options?: FeatureTableOptions<TValues>,
    ) {
      const visibleFields = options?.columns
        ? fields.filter((f) =>
            options.columns!.includes(f.name as keyof TValues & string),
          )
        : fields

      const columns: ColumnDef<TValues, unknown>[] = visibleFields.map(
        (field) => ({
          accessorKey: field.name,
          header: field.label,
          ...(options?.columnOverrides?.[
            field.name as keyof TValues & string
          ] ?? {}),
        }),
      )

      const sorting = signal<SortingState>([])
      const globalFilter = signal('')

      const table = _useTable(() => ({
        data: typeof data === 'function' ? data() : data,
        columns,
        state: {
          sorting: sorting(),
          globalFilter: globalFilter(),
        },
        onSortingChange: (updater: unknown) => {
          sorting.set(
            typeof updater === 'function'
              ? (updater as (prev: SortingState) => SortingState)(sorting())
              : (updater as SortingState),
          )
        },
        onGlobalFilterChange: (updater: unknown) => {
          globalFilter.set(
            typeof updater === 'function'
              ? (updater as (prev: string) => string)(globalFilter())
              : (updater as string),
          )
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        ...(options?.pageSize
          ? { getPaginationRowModel: getPaginationRowModel() }
          : {}),
      }))

      return {
        table,
        sorting,
        globalFilter,
        columns: visibleFields,
      }
    },
  }
}
