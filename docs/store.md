# Store

`@pyreon/store` is a Pinia-inspired global state management library built on `@pyreon/reactivity` signals.

## Installation

```bash
bun add @pyreon/store
```

## Quick Start

```ts
import { defineStore, signal, computed } from "@pyreon/store"

const useCounter = defineStore("counter", () => {
  const count = signal(0)
  const double = computed(() => count() * 2)
  const increment = () => count.update(n => n + 1)
  return { count, double, increment }
})

// Anywhere in your app:
const { count, increment } = useCounter()
increment()
count() // 1
```

## API

### `defineStore(id, setup)`

Define a singleton store with a unique id and a composition-style setup function.

```ts
const useAuth = defineStore("auth", () => {
  const user = signal<User | null>(null)
  const isLoggedIn = computed(() => user() !== null)

  const login = async (credentials: Credentials) => {
    const result = await api.login(credentials)
    user.set(result.user)
  }

  const logout = () => user.set(null)

  return { user, isLoggedIn, login, logout }
})
```

**Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique store identifier |
| `setup` | `() => T` | Setup function returning the store's state, computed values, and actions |

**Returns:** `() => T` — a hook function. Every call returns the same singleton instance.

The setup function runs once (on first access). Subsequent calls return the cached instance.

### `resetStore(id)`

Destroy a store by id. The next call to the store hook re-runs the setup function with fresh state.

```ts
resetStore("counter")
// Next useCounter() call creates a new instance
```

### `resetAllStores()`

Destroy all stores. Useful for test cleanup and HMR.

```ts
afterEach(() => resetAllStores())
```

### `setStoreRegistryProvider(fn)`

Override the store registry for concurrent SSR. Each request gets an isolated registry, preventing state leakage between requests.

```ts
import { AsyncLocalStorage } from "node:async_hooks"
import { setStoreRegistryProvider } from "@pyreon/store"

const als = new AsyncLocalStorage<Map<string, unknown>>()
setStoreRegistryProvider(() => als.getStore() ?? new Map())

// Wrap each request:
als.run(new Map(), () => renderToString(app))
```

## Re-exports

`@pyreon/store` re-exports these from `@pyreon/reactivity` for convenience:

- `signal`, `computed`, `effect`, `batch`
- `Signal` (type)

## Patterns

### Composing stores

Stores can reference other stores:

```ts
const useUser = defineStore("user", () => {
  const name = signal("")
  return { name }
})

const useGreeting = defineStore("greeting", () => {
  const { name } = useUser()
  const message = computed(() => `Hello, ${name()}!`)
  return { message }
})
```

### Async actions

Actions can be async — signals update reactively when the promise resolves:

```ts
const useTodos = defineStore("todos", () => {
  const items = signal<Todo[]>([])
  const loading = signal(false)

  const fetch = async () => {
    loading.set(true)
    items.set(await api.getTodos())
    loading.set(false)
  }

  return { items, loading, fetch }
})
```

## Gotchas

**Stores are singletons.** Two `defineStore` calls with the same id share the same instance — the first setup function wins.

**Reset in tests.** Always call `resetAllStores()` in `afterEach` to prevent test pollution.

**SSR isolation requires a provider.** Without `setStoreRegistryProvider`, stores are shared across all requests in concurrent SSR.
