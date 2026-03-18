# @pyreon/feature

Schema-driven feature primitives. Define a Zod schema and API path, get fully typed CRUD hooks, forms, and queries.

## Install

```bash
bun add @pyreon/feature
```

## Quick Start

```ts
import { defineFeature } from '@pyreon/feature'
import { z } from 'zod'

const users = defineFeature({
  name: 'users',
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['admin', 'editor', 'viewer']),
  }),
  api: '/api/users',
})
```

One definition gives you everything:

```tsx
// List query
const { data, isPending } = users.useList()

// Single item query
const { data: user } = users.useById(id)

// Create mutation (auto-invalidates list)
const { mutate: create } = users.useCreate()
create({ name: 'Alice', email: 'alice@example.com' })

// Update mutation (auto-invalidates list + item)
const { mutate: update } = users.useUpdate()
update({ id: 1, data: { name: 'Alice Updated' } })

// Delete mutation (auto-invalidates list)
const { mutate: remove } = users.useDelete()
remove(1)

// Form with schema validation
const form = users.useForm()
<form onSubmit={(e) => form.handleSubmit(e)}>
  <input {...form.register('name')} />
  <input {...form.register('email')} />
  <button type="submit">Create</button>
</form>

// Query keys for manual cache operations
users.queryKey()      // ['users']
users.queryKey(42)    // ['users', 42]
```

## API

### `defineFeature(config)`

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Feature name — used for store ID and query key namespace |
| `schema` | `ZodSchema` | Validation schema — passed to `zodSchema()` for form validation |
| `api` | `string` | API base path (e.g., `/api/users`) |
| `initialValues?` | `TValues` | Default values for create forms |
| `fetcher?` | `typeof fetch` | Custom fetch function (defaults to global `fetch`) |

### Returned hooks

| Hook | Returns | Description |
| --- | --- | --- |
| `useList(opts?)` | `UseQueryResult<T[]>` | GET `api` — list query with optional params |
| `useById(id)` | `UseQueryResult<T>` | GET `api/:id` — single item query |
| `useCreate()` | `UseMutationResult` | POST `api` — invalidates list on success |
| `useUpdate()` | `UseMutationResult` | PUT `api/:id` — invalidates list + item on success |
| `useDelete()` | `UseMutationResult` | DELETE `api/:id` — invalidates list on success |
| `useForm(opts?)` | `FormState<T>` | Form with schema validation + submit to API |
| `queryKey(suffix?)` | `QueryKey` | Generate namespaced query keys |

## Why

An AI agent asked to "add user management" writes 10 lines of schema instead of 200 lines of components, hooks, and wiring. The feature definition is the single source of truth — types, validation, API calls, and cache management all flow from the schema.
