import {
  type MutationInfo,
  type OnActionCallback,
  type SubscribeCallback,
  addStorePlugin,
  computed,
  defineStore,
  resetAllStores,
  resetStore,
  setStoreRegistryProvider,
  signal,
} from "../index"

afterEach(() => resetAllStores())

describe("defineStore", () => {
  test("returns singleton — setup runs once", () => {
    let runs = 0
    const useStore = defineStore("counter", () => {
      runs++
      const count = signal(0)
      return { count }
    })

    useStore()
    useStore()
    expect(runs).toBe(1)
  })

  test("state is shared across calls", () => {
    const useStore = defineStore("shared", () => {
      const count = signal(0)
      return { count }
    })

    const a = useStore()
    const b = useStore()
    a.count.set(42)
    expect(b.count()).toBe(42)
  })

  test("supports computed values", () => {
    const useStore = defineStore("computed-store", () => {
      const count = signal(3)
      const double = computed(() => count() * 2)
      return { count, double }
    })

    const { count, double } = useStore()
    expect(double()).toBe(6)
    count.set(5)
    expect(double()).toBe(10)
  })

  test("supports actions (plain functions)", () => {
    const useStore = defineStore("actions-store", () => {
      const count = signal(0)
      const increment = () => count.update((n) => n + 1)
      return { count, increment }
    })

    const { count, increment } = useStore()
    increment()
    increment()
    expect(count()).toBe(2)
  })

  test("different ids create independent stores", () => {
    const useA = defineStore("a", () => ({ val: signal(1) }))
    const useB = defineStore("b", () => ({ val: signal(2) }))

    expect(useA().val()).toBe(1)
    expect(useB().val()).toBe(2)
    useA().val.set(99)
    expect(useB().val()).toBe(2)
  })

  test("same id from different defineStore calls shares state", () => {
    const useA = defineStore("dup", () => ({ val: signal("first") }))
    const useB = defineStore("dup", () => ({ val: signal("second") }))

    const a = useA()
    const b = useB()
    expect(a).toBe(b)
    expect(a.val()).toBe("first")
  })
})

describe("resetStore", () => {
  test("re-runs setup after reset", () => {
    let runs = 0
    const useStore = defineStore("resettable", () => {
      runs++
      return { val: signal(runs) }
    })

    useStore()
    resetStore("resettable")
    useStore()
    expect(runs).toBe(2)
  })

  test("fresh state after reset", () => {
    const useStore = defineStore("fresh", () => ({ count: signal(0) }))

    useStore().count.set(99)
    resetStore("fresh")
    expect(useStore().count()).toBe(0)
  })

  test("resetting non-existent id is a no-op", () => {
    expect(() => resetStore("does-not-exist")).not.toThrow()
  })
})

describe("resetAllStores", () => {
  test("clears all registrations", () => {
    let runsA = 0
    let runsB = 0
    const useA = defineStore("all-a", () => {
      runsA++
      return {}
    })
    const useB = defineStore("all-b", () => {
      runsB++
      return {}
    })

    useA()
    useB()
    resetAllStores()
    useA()
    useB()
    expect(runsA).toBe(2)
    expect(runsB).toBe(2)
  })
})

describe("setStoreRegistryProvider", () => {
  afterEach(() => {
    // Restore default registry
    setStoreRegistryProvider(() => new Map())
  })

  test("custom provider isolates registries", () => {
    const registryA = new Map<string, unknown>()
    const registryB = new Map<string, unknown>()

    const useStore = defineStore("isolated", () => ({ val: signal(0) }))

    setStoreRegistryProvider(() => registryA)
    useStore().val.set(10)

    setStoreRegistryProvider(() => registryB)
    expect(useStore().val()).toBe(0)

    setStoreRegistryProvider(() => registryA)
    expect(useStore().val()).toBe(10)
  })

  test("resetAllStores clears current provider registry", () => {
    const custom = new Map<string, unknown>()
    setStoreRegistryProvider(() => custom)

    const useStore = defineStore("custom-reset", () => ({ val: signal(1) }))
    useStore()
    expect(custom.size).toBe(1)

    resetAllStores()
    expect(custom.size).toBe(0)
  })
})

// ─── Enhanced Store API Tests ────────────────────────────────────────────────

describe("$id", () => {
  test("exposes the store id", () => {
    const useStore = defineStore("my-store", () => ({
      count: signal(0),
    }))
    const store = useStore()
    expect(store.$id).toBe("my-store")
  })
})

describe("$state", () => {
  test("returns a plain snapshot of all signal values", () => {
    const useStore = defineStore("state-test", () => ({
      count: signal(10),
      name: signal("Alice"),
      double: computed(() => 20),
      greet: () => "hello",
    }))
    const store = useStore()
    expect(store.$state).toEqual({ count: 10, name: "Alice" })
  })

  test("reflects current values after mutation", () => {
    const useStore = defineStore("state-mut", () => ({
      count: signal(0),
    }))
    const store = useStore()
    store.count.set(42)
    expect(store.$state).toEqual({ count: 42 })
  })
})

describe("$patch", () => {
  test("object form: batch-updates multiple signals", () => {
    const useStore = defineStore("patch-obj", () => ({
      count: signal(0),
      name: signal("Bob"),
    }))
    const store = useStore()
    store.$patch({ count: 5, name: "Alice" })
    expect(store.count()).toBe(5)
    expect(store.name()).toBe("Alice")
  })

  test("function form: receives signals for manual updates", () => {
    const useStore = defineStore("patch-fn", () => ({
      count: signal(0),
      name: signal("Bob"),
    }))
    const store = useStore()
    store.$patch((state) => {
      state.count.set(10)
      state.name.set("Charlie")
    })
    expect(store.count()).toBe(10)
    expect(store.name()).toBe("Charlie")
  })

  test("emits single subscribe notification with type 'patch'", () => {
    const useStore = defineStore("patch-notify", () => ({
      count: signal(0),
      name: signal("Bob"),
    }))
    const store = useStore()
    const mutations: MutationInfo[] = []
    store.$subscribe((mutation) => {
      mutations.push(mutation)
    })
    store.$patch({ count: 5, name: "Alice" })
    expect(mutations).toHaveLength(1)
    expect(mutations[0].type).toBe("patch")
    expect(mutations[0].events).toHaveLength(2)
  })

  test("ignores keys that are not signals", () => {
    const useStore = defineStore("patch-ignore", () => ({
      count: signal(0),
      greet: () => "hello",
    }))
    const store = useStore()
    // Should not throw
    store.$patch({ count: 5, greet: "nope" as any, nonExistent: 99 })
    expect(store.count()).toBe(5)
  })
})

describe("$subscribe", () => {
  test("fires on direct signal changes", () => {
    const useStore = defineStore("sub-direct", () => ({
      count: signal(0),
    }))
    const store = useStore()
    const mutations: MutationInfo[] = []
    store.$subscribe((mutation) => {
      mutations.push(mutation)
    })
    store.count.set(5)
    expect(mutations).toHaveLength(1)
    expect(mutations[0].type).toBe("direct")
    expect(mutations[0].storeId).toBe("sub-direct")
    expect(mutations[0].events).toEqual([{ key: "count", oldValue: 0, newValue: 5 }])
  })

  test("provides current state snapshot", () => {
    const useStore = defineStore("sub-state", () => ({
      count: signal(0),
      name: signal("X"),
    }))
    const store = useStore()
    let capturedState: Record<string, unknown> | null = null
    store.$subscribe((_mutation, state) => {
      capturedState = state
    })
    store.count.set(42)
    expect(capturedState).toEqual({ count: 42, name: "X" })
  })

  test("immediate option calls callback right away", () => {
    const useStore = defineStore("sub-immediate", () => ({
      count: signal(7),
    }))
    const store = useStore()
    let called = false
    let capturedState: Record<string, unknown> | null = null
    store.$subscribe(
      (_mutation, state) => {
        called = true
        capturedState = state
      },
      { immediate: true },
    )
    expect(called).toBe(true)
    expect(capturedState).toEqual({ count: 7 })
  })

  test("unsubscribe stops notifications", () => {
    const useStore = defineStore("sub-unsub", () => ({
      count: signal(0),
    }))
    const store = useStore()
    let callCount = 0
    const unsub = store.$subscribe(() => {
      callCount++
    })
    store.count.set(1)
    expect(callCount).toBe(1)
    unsub()
    store.count.set(2)
    expect(callCount).toBe(1)
  })

  test("does not fire if signal is set to same value", () => {
    const useStore = defineStore("sub-same", () => ({
      count: signal(5),
    }))
    const store = useStore()
    let callCount = 0
    store.$subscribe(() => {
      callCount++
    })
    store.count.set(5) // same value
    expect(callCount).toBe(0)
  })
})

describe("$onAction", () => {
  test("intercepts action calls with name and args", () => {
    const useStore = defineStore("action-intercept", () => {
      const count = signal(0)
      const add = (n: number) => count.update((c) => c + n)
      return { count, add }
    })
    const store = useStore()
    const calls: { name: string; args: unknown[] }[] = []
    store.$onAction(({ name, args }) => {
      calls.push({ name, args })
    })
    store.add(5)
    expect(calls).toEqual([{ name: "add", args: [5] }])
  })

  test("after callback runs on success", () => {
    const useStore = defineStore("action-after", () => {
      const count = signal(0)
      const getCount = () => count()
      return { count, getCount }
    })
    const store = useStore()
    let result: unknown = null
    store.$onAction(({ after }) => {
      after((r) => {
        result = r
      })
    })
    store.count.set(42)
    store.getCount()
    expect(result).toBe(42)
  })

  test("onError callback runs when action throws", () => {
    const useStore = defineStore("action-error", () => {
      const fail = () => {
        throw new Error("boom")
      }
      return { fail }
    })
    const store = useStore()
    let caughtError: unknown = null
    store.$onAction(({ onError }) => {
      onError((err) => {
        caughtError = err
      })
    })
    expect(() => store.fail()).toThrow("boom")
    expect(caughtError).toBeInstanceOf(Error)
    expect((caughtError as Error).message).toBe("boom")
  })

  test("storeId is provided in context", () => {
    const useStore = defineStore("action-store-id", () => ({
      noop: () => {},
    }))
    const store = useStore()
    let capturedId: string | null = null
    store.$onAction(({ storeId }) => {
      capturedId = storeId
    })
    store.noop()
    expect(capturedId).toBe("action-store-id")
  })

  test("unsubscribe stops interception", () => {
    const useStore = defineStore("action-unsub", () => ({
      noop: () => {},
    }))
    const store = useStore()
    let callCount = 0
    const unsub = store.$onAction(() => {
      callCount++
    })
    store.noop()
    expect(callCount).toBe(1)
    unsub()
    store.noop()
    expect(callCount).toBe(1)
  })

  test("after callback receives resolved value for async actions", async () => {
    const useStore = defineStore("action-async", () => {
      const fetchData = async () => {
        await new Promise((r) => setTimeout(r, 5))
        return "resolved-data"
      }
      return { fetchData }
    })
    const store = useStore()
    let result: unknown = null
    store.$onAction(({ after }) => {
      after((r) => {
        result = r
      })
    })
    await store.fetchData()
    expect(result).toBe("resolved-data")
  })

  test("onError callback fires for async action rejection", async () => {
    const useStore = defineStore("action-async-error", () => {
      const failAsync = async () => {
        await new Promise((r) => setTimeout(r, 5))
        throw new Error("async boom")
      }
      return { failAsync }
    })
    const store = useStore()
    let caughtError: unknown = null
    store.$onAction(({ onError }) => {
      onError((err) => {
        caughtError = err
      })
    })
    await store.failAsync().catch(() => {})
    expect(caughtError).toBeInstanceOf(Error)
    expect((caughtError as Error).message).toBe("async boom")
  })
})

describe("$reset", () => {
  test("resets all signals to initial values", () => {
    const useStore = defineStore("reset-test", () => ({
      count: signal(0),
      name: signal("initial"),
    }))
    const store = useStore()
    store.count.set(99)
    store.name.set("changed")
    store.$reset()
    expect(store.count()).toBe(0)
    expect(store.name()).toBe("initial")
  })

  test("does not affect computed values (they recompute)", () => {
    const useStore = defineStore("reset-computed", () => {
      const count = signal(5)
      const double = computed(() => count() * 2)
      return { count, double }
    })
    const store = useStore()
    store.count.set(20)
    expect(store.double()).toBe(40)
    store.$reset()
    expect(store.count()).toBe(5)
    expect(store.double()).toBe(10)
  })
})

describe("$dispose", () => {
  test("removes store from registry", () => {
    const useStore = defineStore("dispose-test", () => ({
      count: signal(0),
    }))
    const store = useStore()
    store.$dispose()
    // Next call should re-run setup
    const store2 = useStore()
    expect(store2).not.toBe(store)
    expect(store2.count()).toBe(0)
  })

  test("clears subscribers after dispose", () => {
    const useStore = defineStore("dispose-sub", () => ({
      count: signal(0),
    }))
    const store = useStore()
    let callCount = 0
    store.$subscribe(() => {
      callCount++
    })
    store.count.set(1)
    expect(callCount).toBe(1)
    store.$dispose()
    // Mutating the old signal should not trigger subscriber
    store.count.set(2)
    expect(callCount).toBe(1)
  })
})

describe("addStorePlugin", () => {
  // Clean up plugins after each test by resetting module state
  // Since there's no removePlugin API, we test in isolation

  test("plugin receives store and storeId on creation", () => {
    let receivedStoreId: string | null = null
    let receivedStore: any = null

    addStorePlugin(({ store, storeId }) => {
      receivedStoreId = storeId
      receivedStore = store
    })

    const useStore = defineStore("plugin-test", () => ({
      count: signal(0),
    }))
    const store = useStore()

    expect(receivedStoreId).toBe("plugin-test")
    expect(receivedStore).toBe(store)
  })

  test("plugin can use $subscribe", () => {
    const changes: MutationInfo[] = []

    addStorePlugin(({ store }) => {
      store.$subscribe((mutation: MutationInfo) => {
        changes.push(mutation)
      })
    })

    const useStore = defineStore("plugin-subscribe", () => ({
      count: signal(0),
    }))
    const store = useStore()
    store.count.set(5)

    expect(changes.length).toBeGreaterThanOrEqual(1)
    const relevant = changes.filter((m) => m.storeId === "plugin-subscribe")
    expect(relevant).toHaveLength(1)
  })

  test("plugin can use $onAction", () => {
    const actionNames: string[] = []

    addStorePlugin(({ store }) => {
      store.$onAction(({ name, storeId }: { name: string; storeId: string }) => {
        if (storeId === "plugin-action") {
          actionNames.push(name)
        }
      })
    })

    const useStore = defineStore("plugin-action", () => ({
      count: signal(0),
      increment: () => {},
    }))
    const store = useStore()
    store.increment()

    expect(actionNames).toContain("increment")
  })
})
