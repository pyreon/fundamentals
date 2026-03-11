import { computed, defineStore, resetAllStores, resetStore, setStoreRegistryProvider, signal } from "../index"

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
