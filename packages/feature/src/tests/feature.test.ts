import { h } from '@pyreon/core'
import { signal } from '@pyreon/reactivity'
import { mount } from '@pyreon/runtime-dom'
import { QueryClient, QueryClientProvider } from '@pyreon/query'
import { z } from 'zod'
import { defineFeature } from '../define-feature'
import { extractFields, defaultInitialValues } from '../schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mountWith<T>(
  client: QueryClient,
  fn: () => T,
): { result: T; unmount: () => void } {
  let result: T | undefined
  const el = document.createElement('div')
  document.body.appendChild(el)
  const unmount = mount(
    h(
      QueryClientProvider as any,
      { client },
      h(() => {
        result = fn()
        return null
      }, null),
    ),
    el,
  )
  return {
    result: result!,
    unmount: () => {
      unmount()
      el.remove()
    },
  }
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  age: z.number().optional(),
  active: z.boolean(),
})

type UserValues = z.infer<typeof userSchema>

// ─── Mock fetch ────────────────────────────────────────────────────────────────

function createMockFetch(
  responses: Record<string, { status?: number; body?: unknown }>,
) {
  return async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    const method = init?.method ?? 'GET'
    const key = `${method} ${urlStr}`

    const match =
      responses[key] ??
      Object.entries(responses).find(([k]) => key.startsWith(k))?.[1]

    if (!match) {
      return new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
      })
    }

    return new Response(
      match.body !== undefined ? JSON.stringify(match.body) : null,
      {
        status: match.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

// ─── Schema introspection ──────────────────────────────────────────────────────

describe('extractFields', () => {
  it('extracts field names and types from a Zod schema', () => {
    const fields = extractFields(userSchema)

    expect(fields).toHaveLength(5)
    expect(fields[0]).toEqual({
      name: 'name',
      type: 'string',
      optional: false,
      label: 'Name',
    })
    expect(fields[1]).toEqual({
      name: 'email',
      type: 'string',
      optional: false,
      label: 'Email',
    })
    expect(fields[2]).toMatchObject({
      name: 'role',
      type: 'enum',
      optional: false,
      label: 'Role',
    })
  })

  it('detects optional fields', () => {
    const fields = extractFields(userSchema)
    const ageField = fields.find((f) => f.name === 'age')
    expect(ageField?.optional).toBe(true)
    expect(ageField?.type).toBe('number')
  })

  it('detects boolean fields', () => {
    const fields = extractFields(userSchema)
    const activeField = fields.find((f) => f.name === 'active')
    expect(activeField?.type).toBe('boolean')
  })

  it('converts field names to labels', () => {
    const schema = z.object({
      firstName: z.string(),
      last_name: z.string(),
      email_address: z.string(),
    })
    const fields = extractFields(schema)
    expect(fields[0]!.label).toBe('First Name')
    expect(fields[1]!.label).toBe('Last Name')
    expect(fields[2]!.label).toBe('Email Address')
  })

  it('returns empty array for non-object input', () => {
    expect(extractFields(null)).toEqual([])
    expect(extractFields(undefined)).toEqual([])
    expect(extractFields('string')).toEqual([])
  })
})

describe('defaultInitialValues', () => {
  it('generates defaults from field types', () => {
    const fields = extractFields(userSchema)
    const values = defaultInitialValues(fields)

    expect(values.name).toBe('')
    expect(values.email).toBe('')
    expect(values.age).toBe(0)
    expect(values.active).toBe(false)
  })
})

// ─── defineFeature ─────────────────────────────────────────────────────────────

describe('defineFeature', () => {
  it('returns a feature with name, api, schema, fields, and queryKey', () => {
    const users = defineFeature<UserValues>({
      name: 'users',
      schema: userSchema,
      api: '/api/users',
    })

    expect(users.name).toBe('users')
    expect(users.api).toBe('/api/users')
    expect(users.schema).toBe(userSchema)
    expect(users.fields.length).toBeGreaterThan(0)
    expect(users.fields[0]!.name).toBe('name')
    expect(users.queryKey()).toEqual(['users'])
    expect(users.queryKey('123')).toEqual(['users', '123'])
    expect(users.queryKey(42)).toEqual(['users', 42])
  })

  it('has all hooks', () => {
    const users = defineFeature<UserValues>({
      name: 'users',
      schema: userSchema,
      api: '/api/users',
    })

    expect(typeof users.useList).toBe('function')
    expect(typeof users.useById).toBe('function')
    expect(typeof users.useSearch).toBe('function')
    expect(typeof users.useCreate).toBe('function')
    expect(typeof users.useUpdate).toBe('function')
    expect(typeof users.useDelete).toBe('function')
    expect(typeof users.useForm).toBe('function')
    expect(typeof users.useTable).toBe('function')
  })

  it('auto-generates initial values from schema', () => {
    const users = defineFeature<UserValues>({
      name: 'users-auto-init',
      schema: userSchema,
      api: '/api/users',
    })

    const client = new QueryClient()
    const { result: form, unmount } = mountWith(client, () => users.useForm())
    expect(form.values().name).toBe('')
    expect(form.values().active).toBe(false)
    unmount()
  })
})

// ─── useList ────────────────────────────────────────────────────────────────────

describe('useList', () => {
  it('fetches list from API', async () => {
    const mockUsers = [
      { name: 'Alice', email: 'a@t.com', role: 'admin', active: true },
    ]

    const users = defineFeature<UserValues>({
      name: 'users-list',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'GET /api/users': { body: mockUsers },
      }) as typeof fetch,
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { result: query, unmount } = mountWith(client, () => users.useList())

    expect(query.isPending()).toBe(true)
    await new Promise((r) => setTimeout(r, 50))
    expect(query.data()).toEqual(mockUsers)
    unmount()
  })

  it('passes query params to URL', async () => {
    let capturedUrl = ''
    const users = defineFeature<UserValues>({
      name: 'users-params',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (url: string) => {
        capturedUrl = url
        return new Response('[]', { status: 200 })
      }) as typeof fetch,
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { unmount } = mountWith(client, () =>
      users.useList({ params: { page: 2 } }),
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(capturedUrl).toContain('page=2')
    unmount()
  })
})

// ─── useById ────────────────────────────────────────────────────────────────────

describe('useById', () => {
  it('fetches single item by ID', async () => {
    const mockUser = {
      name: 'Alice',
      email: 'a@t.com',
      role: 'admin',
      active: true,
    }

    const users = defineFeature<UserValues>({
      name: 'users-by-id',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'GET /api/users/1': { body: mockUser },
      }) as typeof fetch,
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { result: query, unmount } = mountWith(client, () => users.useById(1))
    await new Promise((r) => setTimeout(r, 50))
    expect(query.data()).toEqual(mockUser)
    unmount()
  })
})

// ─── useCreate ──────────────────────────────────────────────────────────────────

describe('useCreate', () => {
  it('posts to API', async () => {
    const users = defineFeature<UserValues>({
      name: 'users-create',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'POST /api/users': { body: { name: 'Created' } },
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: mutation, unmount } = mountWith(client, () =>
      users.useCreate(),
    )

    mutation.mutate({ name: 'New' })
    await new Promise((r) => setTimeout(r, 50))
    expect(mutation.isSuccess()).toBe(true)
    unmount()
  })
})

// ─── useUpdate ──────────────────────────────────────────────────────────────────

describe('useUpdate', () => {
  it('sends PUT with id and data', async () => {
    let capturedUrl = ''
    let capturedMethod = ''

    const users = defineFeature<UserValues>({
      name: 'users-update',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedMethod = init?.method ?? 'GET'
        return new Response('{}', { status: 200 })
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: mutation, unmount } = mountWith(client, () =>
      users.useUpdate(),
    )

    mutation.mutate({ id: 42, data: { name: 'Updated' } })
    await new Promise((r) => setTimeout(r, 50))

    expect(capturedUrl).toBe('/api/users/42')
    expect(capturedMethod).toBe('PUT')
    expect(mutation.isSuccess()).toBe(true)
    unmount()
  })
})

// ─── useDelete ──────────────────────────────────────────────────────────────────

describe('useDelete', () => {
  it('sends DELETE with id', async () => {
    let capturedUrl = ''
    let capturedMethod = ''

    const users = defineFeature<UserValues>({
      name: 'users-delete',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedMethod = init?.method ?? 'GET'
        return new Response(null, { status: 204 })
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: mutation, unmount } = mountWith(client, () =>
      users.useDelete(),
    )

    mutation.mutate(7)
    await new Promise((r) => setTimeout(r, 50))

    expect(capturedUrl).toBe('/api/users/7')
    expect(capturedMethod).toBe('DELETE')
    expect(mutation.isSuccess()).toBe(true)
    unmount()
  })
})

// ─── useForm ────────────────────────────────────────────────────────────────────

describe('useForm', () => {
  it('creates form with schema validation', () => {
    const users = defineFeature<UserValues>({
      name: 'users-form',
      schema: userSchema,
      api: '/api/users',
    })

    const client = new QueryClient()
    const { result: form, unmount } = mountWith(client, () => users.useForm())

    expect(typeof form.handleSubmit).toBe('function')
    expect(typeof form.register).toBe('function')
    unmount()
  })

  it('submits as POST in create mode', async () => {
    let capturedMethod = ''
    const users = defineFeature<UserValues>({
      name: 'users-form-post',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (_url: string, init?: RequestInit) => {
        capturedMethod = init?.method ?? 'GET'
        return new Response('{}', { status: 200 })
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: form, unmount } = mountWith(client, () => users.useForm())

    form.setFieldValue('name', 'Al')
    form.setFieldValue('email', 'a@t.com')
    form.setFieldValue('role', 'admin')
    form.setFieldValue('active', true)
    await form.handleSubmit()
    await new Promise((r) => setTimeout(r, 50))

    expect(capturedMethod).toBe('POST')
    unmount()
  })

  it('submits as PUT in edit mode', async () => {
    let capturedMethod = ''
    let capturedUrl = ''
    const users = defineFeature<UserValues>({
      name: 'users-form-put',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedMethod = init?.method ?? 'GET'
        return new Response('{}', { status: 200 })
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: form, unmount } = mountWith(client, () =>
      users.useForm({
        mode: 'edit',
        id: 42,
        initialValues: {
          name: 'Al',
          email: 'a@t.com',
          role: 'admin',
          active: true,
        },
      }),
    )

    await form.handleSubmit()
    await new Promise((r) => setTimeout(r, 50))

    expect(capturedMethod).toBe('PUT')
    expect(capturedUrl).toBe('/api/users/42')
    unmount()
  })

  it('calls onSuccess callback', async () => {
    let successResult: unknown = null
    const users = defineFeature<UserValues>({
      name: 'users-form-cb',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'POST /api/users': { body: { id: 1 } },
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: form, unmount } = mountWith(client, () =>
      users.useForm({
        onSuccess: (r) => {
          successResult = r
        },
      }),
    )

    form.setFieldValue('name', 'Al')
    form.setFieldValue('email', 'a@t.com')
    form.setFieldValue('role', 'admin')
    form.setFieldValue('active', true)
    await form.handleSubmit()
    await new Promise((r) => setTimeout(r, 50))

    expect(successResult).toEqual({ id: 1 })
    unmount()
  })
})

// ─── useTable ───────────────────────────────────────────────────────────────────

describe('useTable', () => {
  it('creates table with schema-inferred columns', () => {
    const users = defineFeature<UserValues>({
      name: 'users-table',
      schema: userSchema,
      api: '/api/users',
    })

    const data: UserValues[] = [
      { name: 'Alice', email: 'a@t.com', role: 'admin', active: true },
    ]

    const client = new QueryClient()
    const { result, unmount } = mountWith(client, () => users.useTable(data))

    expect(result.columns.length).toBeGreaterThan(0)
    expect(result.columns[0]!.name).toBe('name')
    expect(result.columns[0]!.label).toBe('Name')
    expect(result.table().getRowModel().rows).toHaveLength(1)
    unmount()
  })

  it('filters columns by name', () => {
    const users = defineFeature<UserValues>({
      name: 'users-table-cols',
      schema: userSchema,
      api: '/api/users',
    })

    const client = new QueryClient()
    const { result, unmount } = mountWith(client, () =>
      users.useTable(
        [{ name: 'Alice', email: 'a@t.com', role: 'admin', active: true }],
        { columns: ['name', 'email'] },
      ),
    )

    expect(result.columns).toHaveLength(2)
    expect(result.columns.map((c) => c.name)).toEqual(['name', 'email'])
    unmount()
  })

  it('accepts reactive data function', () => {
    const users = defineFeature<UserValues>({
      name: 'users-table-fn',
      schema: userSchema,
      api: '/api/users',
    })

    const data = signal<UserValues[]>([
      { name: 'Alice', email: 'a@t.com', role: 'admin', active: true },
    ])

    const client = new QueryClient()
    const { result, unmount } = mountWith(client, () =>
      users.useTable(() => data()),
    )

    expect(result.table().getRowModel().rows).toHaveLength(1)
    unmount()
  })
})

// ─── useSearch ──────────────────────────────────────────────────────────────────

describe('useSearch', () => {
  it('passes search term as query param', async () => {
    let capturedUrl = ''
    const users = defineFeature<UserValues>({
      name: 'users-search',
      schema: userSchema,
      api: '/api/users',
      fetcher: (async (url: string) => {
        capturedUrl = url
        return new Response('[]', { status: 200 })
      }) as typeof fetch,
    })

    const term = signal('alice')
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { unmount } = mountWith(client, () => users.useSearch(term))

    await new Promise((r) => setTimeout(r, 50))
    expect(capturedUrl).toContain('q=alice')
    unmount()
  })

  it('disables query when search term is empty', () => {
    const users = defineFeature<UserValues>({
      name: 'users-search-empty',
      schema: userSchema,
      api: '/api/users',
      fetcher: (() => {
        throw new Error('Should not fetch')
      }) as typeof fetch,
    })

    const term = signal('')
    const client = new QueryClient()
    const { result: query, unmount } = mountWith(client, () =>
      users.useSearch(term),
    )

    expect(query.isPending()).toBe(true)
    expect(query.isFetching()).toBe(false)
    unmount()
  })
})

// ─── Error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('handles API errors in useList', async () => {
    const users = defineFeature<UserValues>({
      name: 'users-err',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'GET /api/users': { status: 500, body: { message: 'Server error' } },
      }) as typeof fetch,
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { result: query, unmount } = mountWith(client, () => users.useList())

    await new Promise((r) => setTimeout(r, 50))
    expect(query.isError()).toBe(true)
    unmount()
  })

  it('parses structured error body from API', async () => {
    const users = defineFeature<UserValues>({
      name: 'users-err-struct',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'POST /api/users': {
          status: 422,
          body: { message: 'Validation failed', errors: { email: 'Taken' } },
        },
      }) as typeof fetch,
    })

    const client = new QueryClient()
    const { result: mutation, unmount } = mountWith(client, () =>
      users.useCreate(),
    )

    mutation.mutate({ name: 'Test' })
    await new Promise((r) => setTimeout(r, 50))

    expect(mutation.isError()).toBe(true)
    const err = mutation.error() as Error & { errors?: unknown }
    expect(err.message).toBe('Validation failed')
    expect(err.errors).toEqual({ email: 'Taken' })
    unmount()
  })
})
