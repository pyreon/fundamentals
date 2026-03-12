/**
 * @pyreon/store — global state management built on @pyreon/reactivity signals.
 *
 * API (Pinia-inspired composition style):
 *
 *   const useCounter = defineStore("counter", () => {
 *     const count = signal(0)
 *     const double = computed(() => count() * 2)
 *     const increment = () => count.update(n => n + 1)
 *     return { count, double, increment }
 *   })
 *
 *   // Inside a component (or anywhere):
 *   const { count, increment } = useCounter()
 *
 * Stores are singletons — the setup function runs once per store id.
 * Call `resetStore(id)` or `resetAllStores()` to clear the registry
 * (useful for testing or HMR).
 *
 * For concurrent SSR, call setStoreRegistryProvider() with an
 * AsyncLocalStorage-backed provider so each request gets isolated store state.
 */

export type { Signal } from "@pyreon/reactivity"
export { batch, computed, effect, signal } from "@pyreon/reactivity"
import { batch } from "@pyreon/reactivity"

export { setRegistryProvider as setStoreRegistryProvider } from "./registry"
import { getRegistry } from "./registry"
import { _notifyChange } from "./devtools"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MutationInfo {
  storeId: string
  type: "direct" | "patch"
  events: { key: string; newValue: unknown; oldValue: unknown }[]
}

export type SubscribeCallback = (mutation: MutationInfo, state: Record<string, unknown>) => void

export interface ActionContext {
  name: string
  storeId: string
  args: unknown[]
  after: (cb: (result: unknown) => void) => void
  onError: (cb: (error: unknown) => void) => void
}

export type OnActionCallback = (context: ActionContext) => void

export type StorePlugin = (context: { store: any; storeId: string }) => void

/** The $ methods added to every store instance. */
export interface EnhancedStoreApi {
  $id: string
  readonly $state: Record<string, unknown>
  $patch(partialState: Record<string, unknown>): void
  $patch(fn: (state: Record<string, any>) => void): void
  $subscribe(callback: SubscribeCallback, options?: { immediate?: boolean }): () => void
  $onAction(callback: OnActionCallback): () => void
  $reset(): void
  $dispose(): void
}

// ─── Detection helpers ───────────────────────────────────────────────────────

function isSignalLike(
  v: unknown,
): v is { (): unknown; set: (v: unknown) => void; peek: () => unknown; subscribe: (l: () => void) => () => void } {
  return typeof v === "function" && typeof (v as any).set === "function" && typeof (v as any).peek === "function"
}

function isComputedLike(v: unknown): boolean {
  return typeof v === "function" && typeof (v as any).dispose === "function" && !isSignalLike(v)
}

// ─── Plugin system ───────────────────────────────────────────────────────────

const _plugins: StorePlugin[] = []

/** Register a global store plugin. Plugins run when a store is first created. */
export function addStorePlugin(plugin: StorePlugin): void {
  _plugins.push(plugin)
}

// ─── defineStore ─────────────────────────────────────────────────────────────

/**
 * Define a store with a unique id and a setup function.
 * Returns a `useStore` hook that returns the singleton enhanced store state.
 */
export function defineStore<T extends Record<string, unknown>>(id: string, setup: () => T): () => T & EnhancedStoreApi {
  return function useStore(): T & EnhancedStoreApi {
    const registry = getRegistry()
    if (registry.has(id)) return registry.get(id) as T & EnhancedStoreApi

    const raw = setup()

    // Classify properties
    const signalKeys: string[] = []
    const actionKeys: string[] = []
    const initialValues = new Map<string, unknown>()

    for (const key of Object.keys(raw)) {
      const val = raw[key]
      if (isSignalLike(val)) {
        signalKeys.push(key)
        initialValues.set(key, val.peek())
      } else if (isComputedLike(val)) {
        // computed — skip, just pass through
      } else if (typeof val === "function") {
        actionKeys.push(key)
      }
    }

    // ─── $subscribe infrastructure ─────────────────────────────────────
    const subscribers = new Set<SubscribeCallback>()
    let patchInProgress = false
    let patchEvents: MutationInfo["events"] = []

    function getState(): Record<string, unknown> {
      const state: Record<string, unknown> = {}
      for (const key of signalKeys) {
        state[key] = (raw[key] as any).peek()
      }
      return state
    }

    function notifyDirect(key: string, oldValue: unknown, newValue: unknown) {
      if (patchInProgress) {
        patchEvents.push({ key, newValue, oldValue })
        return
      }
      if (subscribers.size === 0) return
      const mutation: MutationInfo = {
        storeId: id,
        type: "direct",
        events: [{ key, newValue, oldValue }],
      }
      const state = getState()
      for (const cb of subscribers) cb(mutation, state)
    }

    // Subscribe to each signal for change detection
    const signalUnsubs: (() => void)[] = []
    for (const key of signalKeys) {
      const sig = raw[key] as any
      let prev = sig.peek()
      const unsub = sig.subscribe(() => {
        const next = sig.peek()
        const old = prev
        prev = next
        notifyDirect(key, old, next)
      })
      signalUnsubs.push(unsub)
    }

    // ─── $onAction infrastructure ──────────────────────────────────────
    const actionListeners = new Set<OnActionCallback>()

    // Wrap actions
    function wrapAction(key: string, original: (...args: any[]) => unknown) {
      return (...args: unknown[]) => {
        const afterCbs: ((result: unknown) => void)[] = []
        const errorCbs: ((error: unknown) => void)[] = []

        const context: ActionContext = {
          name: key,
          storeId: id,
          args,
          after: (cb) => afterCbs.push(cb),
          onError: (cb) => errorCbs.push(cb),
        }

        for (const listener of actionListeners) {
          listener(context)
        }

        try {
          const result = original(...args)

          // Handle async actions: if the result is a thenable, wait for
          // resolution before calling after/onError callbacks.
          if (result != null && typeof (result as any).then === "function") {
            return (result as Promise<unknown>).then(
              (resolved) => {
                for (const cb of afterCbs) cb(resolved)
                return resolved
              },
              (err) => {
                for (const cb of errorCbs) cb(err)
                throw err
              },
            )
          }

          for (const cb of afterCbs) cb(result)
          return result
        } catch (err) {
          for (const cb of errorCbs) cb(err)
          throw err
        }
      }
    }

    // ─── Build enhanced store ──────────────────────────────────────────
    const enhanced: Record<string, unknown> = {}

    // Copy properties, wrapping actions
    for (const key of Object.keys(raw)) {
      if (actionKeys.includes(key)) {
        enhanced[key] = wrapAction(key, raw[key] as (...args: any[]) => unknown)
      } else {
        enhanced[key] = raw[key]
      }
    }

    // $id
    enhanced.$id = id

    // $state getter
    Object.defineProperty(enhanced, "$state", {
      get: getState,
      enumerable: false,
      configurable: true,
    })

    // $patch
    enhanced.$patch = (partialOrFn: Record<string, unknown> | ((state: Record<string, any>) => void)) => {
      patchInProgress = true
      patchEvents = []

      batch(() => {
        if (typeof partialOrFn === "function") {
          // Functional form: pass an object with the actual signals so user calls .set()
          const signalMap: Record<string, any> = {}
          for (const key of signalKeys) {
            signalMap[key] = raw[key]
          }
          partialOrFn(signalMap)
        } else {
          // Object form: set values directly
          for (const [key, value] of Object.entries(partialOrFn)) {
            if (signalKeys.includes(key)) {
              ;(raw[key] as any).set(value)
            }
          }
        }
      })

      patchInProgress = false

      // Emit a single notification for the patch
      if (subscribers.size > 0 && patchEvents.length > 0) {
        const mutation: MutationInfo = {
          storeId: id,
          type: "patch",
          events: patchEvents,
        }
        const state = getState()
        for (const cb of subscribers) cb(mutation, state)
      }
      patchEvents = []
    }

    // $subscribe
    enhanced.$subscribe = (callback: SubscribeCallback, options?: { immediate?: boolean }): (() => void) => {
      subscribers.add(callback)
      if (options?.immediate) {
        const mutation: MutationInfo = {
          storeId: id,
          type: "direct",
          events: [],
        }
        callback(mutation, getState())
      }
      return () => {
        subscribers.delete(callback)
      }
    }

    // $onAction
    enhanced.$onAction = (callback: OnActionCallback): (() => void) => {
      actionListeners.add(callback)
      return () => {
        actionListeners.delete(callback)
      }
    }

    // $reset
    enhanced.$reset = () => {
      batch(() => {
        for (const [key, initial] of initialValues) {
          ;(raw[key] as any).set(initial)
        }
      })
    }

    // $dispose
    enhanced.$dispose = () => {
      for (const unsub of signalUnsubs) unsub()
      signalUnsubs.length = 0
      subscribers.clear()
      actionListeners.clear()
      getRegistry().delete(id)
    }

    // Run plugins
    for (const plugin of _plugins) {
      plugin({ store: enhanced, storeId: id })
    }

    registry.set(id, enhanced)
    _notifyChange()
    return enhanced as T & EnhancedStoreApi
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Destroy a store by id so next call to useStore() re-runs setup. */
export function resetStore(id: string): void {
  getRegistry().delete(id)
  _notifyChange()
}

/** Destroy all stores — useful for SSR isolation and tests. */
export function resetAllStores(): void {
  getRegistry().clear()
  _notifyChange()
}
