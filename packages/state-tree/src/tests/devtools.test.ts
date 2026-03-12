import { model, getSnapshot } from "../index"
import {
  registerInstance,
  unregisterInstance,
  getActiveModels,
  getModelInstance,
  getModelSnapshot,
  onModelChange,
  _resetDevtools,
} from "../devtools"

const Counter = model({
  state: { count: 0 },
  actions: (self) => ({
    inc: () => self.count.update((c: number) => c + 1),
  }),
})

afterEach(() => _resetDevtools())

describe("state-tree devtools", () => {
  test("getActiveModels returns empty initially", () => {
    expect(getActiveModels()).toEqual([])
  })

  test("registerInstance makes model visible", () => {
    const counter = Counter.create()
    registerInstance("app-counter", counter)
    expect(getActiveModels()).toEqual(["app-counter"])
  })

  test("getModelInstance returns the registered instance", () => {
    const counter = Counter.create()
    registerInstance("app-counter", counter)
    expect(getModelInstance("app-counter")).toBe(counter)
  })

  test("getModelInstance returns undefined for unregistered name", () => {
    expect(getModelInstance("nope")).toBeUndefined()
  })

  test("unregisterInstance removes the model", () => {
    const counter = Counter.create()
    registerInstance("app-counter", counter)
    unregisterInstance("app-counter")
    expect(getActiveModels()).toEqual([])
  })

  test("getModelSnapshot returns current snapshot", () => {
    const counter = Counter.create({ count: 5 })
    registerInstance("app-counter", counter)
    expect(getModelSnapshot("app-counter")).toEqual({ count: 5 })
  })

  test("getModelSnapshot reflects mutations", () => {
    const counter = Counter.create()
    registerInstance("app-counter", counter)
    counter.inc()
    counter.inc()
    expect(getModelSnapshot("app-counter")).toEqual({ count: 2 })
  })

  test("getModelSnapshot returns undefined for unregistered name", () => {
    expect(getModelSnapshot("nope")).toBeUndefined()
  })

  test("onModelChange fires on register", () => {
    const calls: number[] = []
    const unsub = onModelChange(() => calls.push(1))

    const counter = Counter.create()
    registerInstance("app-counter", counter)
    expect(calls.length).toBe(1)

    unsub()
  })

  test("onModelChange fires on unregister", () => {
    const counter = Counter.create()
    registerInstance("app-counter", counter)

    const calls: number[] = []
    const unsub = onModelChange(() => calls.push(1))
    unregisterInstance("app-counter")
    expect(calls.length).toBe(1)

    unsub()
  })

  test("onModelChange unsubscribe stops notifications", () => {
    const calls: number[] = []
    const unsub = onModelChange(() => calls.push(1))
    unsub()

    registerInstance("app-counter", Counter.create())
    expect(calls.length).toBe(0)
  })

  test("multiple instances are tracked", () => {
    registerInstance("a", Counter.create())
    registerInstance("b", Counter.create())
    expect(getActiveModels().sort()).toEqual(["a", "b"])
  })
})
