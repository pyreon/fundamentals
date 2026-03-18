import { h } from '@pyreon/core'
import { mount } from '@pyreon/runtime-dom'
import { QueryClient, QueryClientProvider } from '@pyreon/query'
import { z } from 'zod'
import { defineFeature } from '../define-feature'

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
})

type UserValues = z.infer<typeof userSchema>

// ─── Mock fetch ────────────────────────────────────────────────────────────────

function createMockFetch(responses: Record<string, unknown>) {
  return async (
    url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    const method = init?.method ?? 'GET'
    const key = `${method} ${urlStr}`

    // Check for exact match first, then prefix match
    const data =
      responses[key] ??
      Object.entries(responses).find(([k]) => key.startsWith(k))?.[1]

    if (data === undefined) {
      return new Response(null, { status: 404 })
    }

    return new Response(JSON.stringify(data), {
      status: method === 'DELETE' ? 204 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── defineFeature ─────────────────────────────────────────────────────────────

describe('defineFeature', () => {
  it('returns a feature with name, api, schema, and queryKey', () => {
    const users = defineFeature<UserValues>({
      name: 'users',
      schema: userSchema,
      api: '/api/users',
    })

    expect(users.name).toBe('users')
    expect(users.api).toBe('/api/users')
    expect(users.schema).toBe(userSchema)
    expect(users.queryKey()).toEqual(['users'])
    expect(users.queryKey('123')).toEqual(['users', '123'])
  })

  it('has all CRUD hooks and useForm', () => {
    const users = defineFeature<UserValues>({
      name: 'users',
      schema: userSchema,
      api: '/api/users',
    })

    expect(typeof users.useList).toBe('function')
    expect(typeof users.useById).toBe('function')
    expect(typeof users.useCreate).toBe('function')
    expect(typeof users.useUpdate).toBe('function')
    expect(typeof users.useDelete).toBe('function')
    expect(typeof users.useForm).toBe('function')
  })
})

// ─── useList ────────────────────────────────────────────────────────────────────

describe('useList', () => {
  it('fetches list from API', async () => {
    const mockUsers = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ]

    const users = defineFeature<UserValues>({
      name: 'users-list',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'GET /api/users': mockUsers,
      }) as typeof fetch,
    })

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result: query, unmount } = mountWith(client, () => users.useList())

    expect(query.isPending()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    expect(query.isPending()).toBe(false)
    expect(query.data()).toEqual(mockUsers)

    unmount()
  })
})

// ─── useById ────────────────────────────────────────────────────────────────────

describe('useById', () => {
  it('fetches single item by ID', async () => {
    const mockUser = { name: 'Alice', email: 'alice@test.com' }

    const users = defineFeature<UserValues>({
      name: 'users-by-id',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'GET /api/users/1': mockUser,
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
  it('posts to API and returns created item', async () => {
    const created = { name: 'New User', email: 'new@test.com' }

    const users = defineFeature<UserValues>({
      name: 'users-create',
      schema: userSchema,
      api: '/api/users',
      fetcher: createMockFetch({
        'POST /api/users': created,
      }) as typeof fetch,
    })

    const client = new QueryClient()

    const { result: mutation, unmount } = mountWith(client, () =>
      users.useCreate(),
    )

    expect(mutation.isIdle()).toBe(true)

    mutation.mutate({ name: 'New User', email: 'new@test.com' })

    await new Promise((r) => setTimeout(r, 50))

    expect(mutation.isSuccess()).toBe(true)
    expect(mutation.data()).toEqual(created)

    unmount()
  })
})

// ─── useForm ────────────────────────────────────────────────────────────────────

describe('useForm', () => {
  it('creates a form with schema validation', () => {
    const users = defineFeature<UserValues>({
      name: 'users-form',
      schema: userSchema,
      api: '/api/users',
      initialValues: { name: '', email: '' },
    })

    const client = new QueryClient()

    const { result: form, unmount } = mountWith(client, () => users.useForm())

    expect(form.values()).toEqual({ name: '', email: '' })
    expect(form.isSubmitting()).toBe(false)
    expect(typeof form.handleSubmit).toBe('function')
    expect(typeof form.register).toBe('function')

    unmount()
  })

  it('accepts override initial values', () => {
    const users = defineFeature<UserValues>({
      name: 'users-form-override',
      schema: userSchema,
      api: '/api/users',
      initialValues: { name: '', email: '' },
    })

    const client = new QueryClient()

    const { result: form, unmount } = mountWith(client, () =>
      users.useForm({ initialValues: { name: 'Pre-filled' } }),
    )

    expect(form.values().name).toBe('Pre-filled')

    unmount()
  })
})

// ─── queryKey ───────────────────────────────────────────────────────────────────

describe('queryKey', () => {
  it('generates namespaced query keys', () => {
    const posts = defineFeature<{ title: string }>({
      name: 'posts',
      schema: {},
      api: '/api/posts',
    })

    expect(posts.queryKey()).toEqual(['posts'])
    expect(posts.queryKey('draft')).toEqual(['posts', 'draft'])
    expect(posts.queryKey(42)).toEqual(['posts', 42])
  })
})
