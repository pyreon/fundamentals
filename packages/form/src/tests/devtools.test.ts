import { signal, computed } from "@pyreon/reactivity"
import {
  registerForm,
  unregisterForm,
  getActiveForms,
  getFormInstance,
  getFormSnapshot,
  onFormChange,
  _resetDevtools,
} from "../devtools"

// Minimal form-like object for testing (avoids needing the full useForm + DOM)
function createMockForm(values: Record<string, unknown>) {
  const isSubmitting = signal(false)
  const isValid = computed(() => true)
  const isDirty = signal(false)
  const submitCount = signal(0)

  return {
    values: () => ({ ...values }),
    errors: () => ({}),
    isSubmitting,
    isValid,
    isDirty,
    submitCount,
  }
}

afterEach(() => _resetDevtools())

describe("form devtools", () => {
  test("getActiveForms returns empty initially", () => {
    expect(getActiveForms()).toEqual([])
  })

  test("registerForm makes form visible", () => {
    const form = createMockForm({ email: "" })
    registerForm("login", form)
    expect(getActiveForms()).toEqual(["login"])
  })

  test("getFormInstance returns the registered form", () => {
    const form = createMockForm({ email: "" })
    registerForm("login", form)
    expect(getFormInstance("login")).toBe(form)
  })

  test("getFormInstance returns undefined for unregistered name", () => {
    expect(getFormInstance("nope")).toBeUndefined()
  })

  test("unregisterForm removes the form", () => {
    const form = createMockForm({ email: "" })
    registerForm("login", form)
    unregisterForm("login")
    expect(getActiveForms()).toEqual([])
  })

  test("getFormSnapshot returns current form state", () => {
    const form = createMockForm({ email: "test@test.com" })
    registerForm("login", form)
    const snapshot = getFormSnapshot("login")
    expect(snapshot).toBeDefined()
    expect(snapshot!.values).toEqual({ email: "test@test.com" })
    expect(snapshot!.errors).toEqual({})
    expect(snapshot!.isSubmitting).toBe(false)
    expect(snapshot!.isValid).toBe(true)
    expect(snapshot!.isDirty).toBe(false)
    expect(snapshot!.submitCount).toBe(0)
  })

  test("getFormSnapshot returns undefined for unregistered name", () => {
    expect(getFormSnapshot("nope")).toBeUndefined()
  })

  test("onFormChange fires on register", () => {
    const calls: number[] = []
    const unsub = onFormChange(() => calls.push(1))

    registerForm("login", createMockForm({}))
    expect(calls.length).toBe(1)

    unsub()
  })

  test("onFormChange fires on unregister", () => {
    registerForm("login", createMockForm({}))

    const calls: number[] = []
    const unsub = onFormChange(() => calls.push(1))
    unregisterForm("login")
    expect(calls.length).toBe(1)

    unsub()
  })

  test("onFormChange unsubscribe stops notifications", () => {
    const calls: number[] = []
    const unsub = onFormChange(() => calls.push(1))
    unsub()

    registerForm("login", createMockForm({}))
    expect(calls.length).toBe(0)
  })

  test("multiple forms are tracked", () => {
    registerForm("login", createMockForm({}))
    registerForm("signup", createMockForm({}))
    expect(getActiveForms().sort()).toEqual(["login", "signup"])
  })
})
