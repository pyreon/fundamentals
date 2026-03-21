# AI Building Instructions

These instructions tell AI agents exactly how to use Pyreon fundamentals packages. Follow these decision trees — do not invent patterns.

## When building a complete CRUD feature (PREFERRED)

Use `defineFeature()` from @pyreon/feature. One schema definition gives you
everything -- queries, mutations, forms, tables, store.

```tsx
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

// List page
function UsersPage() {
  const { data, isPending } = users.useList()
  if (isPending()) return <p>Loading...</p>
  return <ul>{data()!.map(u => <li key={u.email}>{u.name}</li>)}</ul>
}

// Create form
function CreateUser() {
  const form = users.useForm()
  return (
    <form onSubmit={(e: Event) => form.handleSubmit(e)}>
      <input {...form.register('name')} />
      <input {...form.register('email')} />
      <button type="submit">Create</button>
    </form>
  )
}

// Edit form (auto-fetches item)
function EditUser({ id }: { id: number }) {
  const form = users.useForm({ mode: 'edit', id })
  return (
    <form onSubmit={(e: Event) => form.handleSubmit(e)}>
      <input {...form.register('name')} />
      <button type="submit">Save</button>
    </form>
  )
}
```

This is the PREFERRED approach for any data entity. Only drop to individual
packages (useQuery, useForm, useTable) when you need custom behavior that
defineFeature doesn't cover.

## When adding charts or data visualizations

Use `<Chart />` or `useChart()` from @pyreon/charts. ECharts modules are
lazy-loaded automatically -- zero bundle cost until a chart renders.

```tsx
import { Chart } from '@pyreon/charts'

function RevenueChart() {
  return (
    <Chart
      options={() => ({
        xAxis: { type: 'category', data: months() },
        yAxis: { type: 'value' },
        tooltip: { trigger: 'axis' },
        series: [
          { name: 'Revenue', type: 'bar', data: revenue() },
          { name: 'Profit', type: 'line', data: profit() },
        ],
      })}
      style="height: 400px"
    />
  )
}
```

For strict typing:
```tsx
import { useChart } from '@pyreon/charts'
import type { ComposeOption, BarSeriesOption, LineSeriesOption } from '@pyreon/charts'

type MyOption = ComposeOption<BarSeriesOption | LineSeriesOption>

const chart = useChart<MyOption>(() => ({
  series: [{ type: 'bar', data: values() }],
}))
```

Common chart types: bar, line, pie, scatter, radar, heatmap, treemap,
sankey, gauge, funnel, candlestick, graph.

The config is standard ECharts -- any ECharts example from the docs works.
Just wrap signal reads in the options function for reactivity.

## When persisting state client-side

Use `@pyreon/storage` for any client-side persistence. Every stored value is a reactive signal.

```tsx
import { useStorage, useCookie, useSessionStorage, useIndexedDB } from '@pyreon/storage'

// localStorage — persistent, cross-tab synced
const theme = useStorage('theme', 'light')
theme()            // read reactively
theme.set('dark')  // updates signal + localStorage

// Cookie — SSR-readable, configurable expiry
const locale = useCookie('locale', 'en', { maxAge: 365 * 86400 })

// sessionStorage — tab-scoped
const wizardStep = useSessionStorage('wizard-step', 0)

// IndexedDB — large data, debounced writes
const draft = useIndexedDB('article-draft', { title: '', body: '' })
```

Same key returns the same signal instance — no drift between components.

## When adding keyboard shortcuts

Use `useHotkey()` from `@pyreon/hotkeys`. Component-scoped, auto-unregisters on unmount.

```tsx
import { useHotkey, useHotkeyScope } from '@pyreon/hotkeys'

// Global shortcuts
useHotkey('mod+s', () => save(), { description: 'Save document' })
useHotkey('mod+k', () => openCommandPalette())

// Scoped shortcuts — only active when scope is enabled
useHotkeyScope('editor')
useHotkey('ctrl+z', () => undo(), { scope: 'editor' })
useHotkey('escape', () => closeModal(), { scope: 'modal' })
```

`mod` = ⌘ on Mac, Ctrl elsewhere. Shortcuts are ignored in inputs by default.

## When adding realtime/WebSocket features

Use `useSubscription()` from `@pyreon/query` to connect WebSockets with the query cache.

```tsx
import { useSubscription } from '@pyreon/query'

const sub = useSubscription({
  url: 'wss://api.example.com/ws',
  onMessage: (event, queryClient) => {
    const data = JSON.parse(event.data)
    if (data.type === 'order-updated') {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  },
})
// sub.status() — 'connecting' | 'connected' | 'disconnected' | 'error'
// sub.send(JSON.stringify({ subscribe: 'orders' }))
```

Auto-reconnects with exponential backoff. Reactive `url` and `enabled` options.

## When adding permissions / access control

Use `createPermissions()` from `@pyreon/permissions`. Universal — works with RBAC, ABAC, feature flags, subscription tiers.

```tsx
import { createPermissions } from '@pyreon/permissions'

const can = createPermissions({
  'posts.read': true,
  'posts.create': true,
  'posts.update': (post: Post) => post.authorId === currentUserId(),
  'users.manage': false,
  'feature.new-editor': true,
})

// Check — reactive in effects/computeds/JSX
can('posts.read')              // true
can('posts.update', myPost)    // evaluates predicate
can.not('billing.export')      // true if denied
can.all('posts.read', 'posts.create')  // true if both granted

// Update after login / role change
can.set(fromRole(user.role))
can.patch({ 'billing.export': true })

// JSX
{() => can('posts.delete') && <DeleteButton />}
{() => can('users.manage') && <AdminPanel />}
```

Wildcards: `'posts.*'` matches any `posts.X`. `'*'` matches everything (superadmin).

## When building multi-step flows or complex UI state

Use `createMachine()` from `@pyreon/machine`. Replaces nested booleans with explicit states and transitions.

```tsx
import { createMachine } from '@pyreon/machine'

const wizard = createMachine({
  initial: 'step1',
  states: {
    step1: { on: { NEXT: 'step2' } },
    step2: { on: { NEXT: 'step3', BACK: 'step1' } },
    step3: { on: { SUBMIT: 'submitting', BACK: 'step2' } },
    submitting: { on: { SUCCESS: 'done', ERROR: 'step3' } },
    done: {},
  },
})

wizard()              // 'step1' — reads like a signal
wizard.send('NEXT')
wizard()              // 'step2'

// Reactive in JSX
{() => wizard.matches('step1') && <Step1 onNext={() => wizard.send('NEXT')} />}
{() => wizard.matches('submitting') && <Spinner />}
{() => wizard.matches('done') && <Success />}

// Guards for conditional transitions
const form = createMachine({
  initial: 'editing',
  states: {
    editing: {
      on: { SUBMIT: { target: 'submitting', guard: () => isValid() } },
    },
    submitting: { on: { SUCCESS: 'done', ERROR: 'editing' } },
    done: {},
  },
})

// Side effects — use onEnter, not context
wizard.onEnter('submitting', async () => {
  try {
    await submitData()
    wizard.send('SUCCESS')
  } catch {
    wizard.send('ERROR')
  }
})

// Data alongside machine — use signals, not machine context
const formData = signal({ name: '', email: '' })
```

Use machines for: wizards, auth flows, modals, file uploads, players, approval workflows.
Use signals alongside machines for data. The machine manages transitions, signals manage data.

## Core Principle

Pyreon uses **signals** for all reactivity. There are no hooks rules, no dependency arrays, no re-renders. A signal is created once, read by calling it (`count()`), and written with `.set()` or `.update()`. Effects and computeds track dependencies automatically.

```tsx
import { signal, computed, effect } from '@pyreon/reactivity'

const count = signal(0)           // create
count()                            // read (subscribes in effects/computeds)
count.set(5)                       // write
count.update(n => n + 1)           // write with updater
const doubled = computed(() => count() * 2)  // derived value
```

## When building a feature that needs state management

Use `defineStore()` from `@pyreon/store`. Returns `StoreApi<T>` with `.store` (user state) and framework methods.

```tsx
import { defineStore, signal, computed, batch } from '@pyreon/store'

const useAuth = defineStore('auth', () => {
  const token = signal<string | null>(null)
  const user = signal<User | null>(null)
  const isLoggedIn = computed(() => token() !== null)

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    const data = await res.json()
    batch(() => {
      token.set(data.token)
      user.set(data.user)
    })
  }

  const logout = () => batch(() => { token.set(null); user.set(null) })

  return { token, user, isLoggedIn, login, logout }
})

// Usage in component — destructure what you need:
const { store, patch, subscribe, reset } = useAuth()
store.isLoggedIn()    // read user state
store.login(email, pw) // call actions
patch({ token: null }) // batch-update signals
reset()                // restore initial values
```

## When building a form

Use `useForm()` from `@pyreon/form`. For schema validation, combine with `zodSchema()` from `@pyreon/validation`.

```tsx
import { useForm, useField } from '@pyreon/form'
import { zodSchema } from '@pyreon/validation'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

function RegisterForm() {
  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    schema: zodSchema(schema),
    validateOn: 'blur',
    onSubmit: async (values) => {
      await fetch('/api/register', { method: 'POST', body: JSON.stringify(values) })
    },
  })

  const name = useField(form, 'name')
  const email = useField(form, 'email')

  return (
    <form onSubmit={(e: Event) => form.handleSubmit(e)}>
      <input placeholder="Name" {...name.register()} />
      {() => name.showError() ? <span class="error">{name.error()}</span> : null}

      <input type="email" placeholder="Email" {...email.register()} />
      {() => email.showError() ? <span class="error">{email.error()}</span> : null}

      <input type="password" {...form.register('password')} />

      <button type="submit" disabled={form.isSubmitting()}>
        {() => form.isSubmitting() ? 'Submitting...' : 'Register'}
      </button>
    </form>
  )
}
```

**Key points:**
- `useField()` gives per-field `hasError`, `showError`, `register()`
- `register()` returns `{ value, onInput, onBlur }` for input binding
- Use `register('field', { type: 'checkbox' })` for booleans
- Use `register('field', { type: 'number' })` for numbers
- Wrap reactive expressions in `{() => ...}` for conditional rendering

## When fetching API data

Use `useQuery()` from `@pyreon/query`. **ALWAYS pass options as a function** for reactive tracking.

```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@pyreon/query'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } })

// Wrap app with provider:
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>

// Fetch data:
function UserList() {
  const { data, isPending, error, refetch } = useQuery(() => ({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      return res.json()
    },
  }))

  return () => {
    if (isPending()) return <p>Loading...</p>
    if (error()) return <p>Error: {error()!.message}</p>
    return <ul>{data()!.map(u => <li key={u.id}>{u.name}</li>)}</ul>
  }
}

// Mutate data:
function CreateUser() {
  const client = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: (input) => fetch('/api/users', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })

  return <button onClick={() => mutate({ name: 'Alice' })} disabled={isPending()}>Create</button>
}
```

## When building a data table

Use `useTable()` from `@pyreon/table` with TanStack Table column helpers.

```tsx
import { useTable, flexRender, createColumnHelper, getCoreRowModel, getSortedRowModel } from '@pyreon/table'
import { signal } from '@pyreon/reactivity'

const columnHelper = createColumnHelper<User>()
const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
]

function UserTable({ users }: { users: User[] }) {
  const sorting = signal([])

  const table = useTable(() => ({
    data: users,
    columns,
    state: { sorting: sorting() },
    onSortingChange: (updater) => sorting.set(typeof updater === 'function' ? updater(sorting()) : updater),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }))

  return (
    <table>
      <thead>
        {() => table().getHeaderGroups().map(group =>
          <tr key={group.id}>
            {group.headers.map(header =>
              <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            )}
          </tr>
        )}
      </thead>
      <tbody>
        {() => table().getRowModel().rows.map(row =>
          <tr key={row.id}>
            {row.getVisibleCells().map(cell =>
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            )}
          </tr>
        )}
      </tbody>
    </table>
  )
}
```

## When building a large scrollable list

Use `useVirtualizer()` from `@pyreon/virtual`.

```tsx
import { useVirtualizer } from '@pyreon/virtual'
import { signal } from '@pyreon/reactivity'

function VirtualList({ items }: { items: string[] }) {
  const parentRef = signal<HTMLElement | null>(null)

  const { virtualItems, totalSize } = useVirtualizer(() => ({
    count: items.length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 40,
    overscan: 5,
  }))

  return (
    <div ref={(el) => parentRef.set(el)} style="height: 400px; overflow-y: auto;">
      <div style={`height: ${totalSize()}px; position: relative;`}>
        {() => virtualItems().map(row =>
          <div key={row.key} style={`position: absolute; top: 0; width: 100%; height: ${row.size}px; transform: translateY(${row.start}px);`}>
            {items[row.index]}
          </div>
        )}
      </div>
    </div>
  )
}
```

## When adding internationalization

Use `createI18n()` from `@pyreon/i18n`.

```tsx
import { createI18n, I18nProvider, useI18n, Trans } from '@pyreon/i18n'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { greeting: 'Hello, {{name}}!', items_one: '{{count}} item', items_other: '{{count}} items' },
    de: { greeting: 'Hallo, {{name}}!', items_one: '{{count}} Artikel', items_other: '{{count}} Artikel' },
  },
})

// Wrap app:
<I18nProvider instance={i18n}><App /></I18nProvider>

// Use in components:
function Greeting({ name }: { name: string }) {
  const { t, locale } = useI18n()
  return (
    <div>
      <p>{() => t('greeting', { name })}</p>
      <p>{() => t('items', { count: 5 })}</p>
      <button onClick={() => locale.set('de')}>Deutsch</button>
    </div>
  )
}
```

## When using structured reactive models

Use `model()` from `@pyreon/state-tree` for complex domain models with snapshots and patches.

```tsx
import { computed } from '@pyreon/reactivity'
import { model, getSnapshot, applySnapshot, onPatch } from '@pyreon/state-tree'

const Todo = model({
  state: { text: '', done: false },
  views: (self) => ({
    display: computed(() => `${self.done() ? '✓' : '○'} ${self.text()}`),
  }),
  actions: (self) => ({
    toggle: () => self.done.update(d => !d),
    setText: (text: string) => self.text.set(text),
  }),
})

const todo = Todo.create({ text: 'Learn Pyreon', done: false })
todo.toggle()
getSnapshot(todo)  // { text: 'Learn Pyreon', done: true }
```

## NEVER do

- **Never use useState/useEffect** — those are React. Use `signal()` and `effect()`.
- **Never use useCallback/useMemo** — signals handle memoization automatically.
- **Never create signals inside render functions** — create them in the component setup (outer function), not in the return function.
- **Never nest `effect()` inside `effect()`** — use `computed()` for derived values.
- **Never set 3+ signals without `batch()`** — causes multiple notification flushes.
- **Never read `signal.peek()` inside effects/computeds** — use `signal()` (subscribing read) for proper tracking.
- **Never forget `QueryClientProvider`** — wrap the app root when using `useQuery()`.
- **Never forget `I18nProvider`** — wrap the app root when using `useI18n()`.
- **Never use `h()` in app code** — use JSX. `h()` is for library internals only.
- **Never import from 'echarts' directly in app code** — use `@pyreon/charts` which lazy-loads.
- **Never use individual `@pyreon/*` packages when `defineFeature()` covers the use case** — it composes them for you.
- **Never use raw `localStorage`/`sessionStorage`/`document.cookie`** — use `@pyreon/storage` for reactive, type-safe persistence.
- **Never add manual `keydown` event listeners** — use `@pyreon/hotkeys` for scoped, lifecycle-managed shortcuts.
- **Never use raw `WebSocket` for query invalidation** — use `useSubscription()` from `@pyreon/query`.
- **Never use nested booleans for multi-step flows** — use `createMachine()` from `@pyreon/machine`.
- **Never scatter `if (role === 'admin')` checks** — use `createPermissions()` from `@pyreon/permissions`.

## JSX patterns specific to Pyreon

```tsx
// Reactive text — wrap signal reads in JSX:
<span>{() => count()}</span>

// Conditional rendering — use function children:
{() => isVisible() ? <Modal /> : null}

// List rendering:
{() => items().map(item => <Item key={item.id} data={item} />)}

// Event handlers — no wrapping needed:
<button onClick={() => count.update(n => n + 1)}>+</button>

// Reactive attributes:
<div class={active() ? 'active' : ''}>

// Spread props from register():
<input {...field.register()} />
```
