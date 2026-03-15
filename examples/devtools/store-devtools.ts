/**
 * Devtools: @pyreon/store
 *
 * Demonstrates:
 * - @pyreon/store devtools registration (automatic via defineStore)
 * - getRegisteredStores() for listing all active stores
 * - getStoreById() for inspecting a specific store
 * - onStoreChange() for reactive devtools panels
 * - Building a devtools panel component
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal, effect } from "@pyreon/reactivity"
import { defineStore, signal as storeSignal, computed } from "@pyreon/store"
import {
  getRegisteredStores,
  getStoreById,
  onStoreChange,
} from "@pyreon/store/devtools"

// ─── Define some stores ──────────────────────────────────────────────────────

const useCounter = defineStore("counter", () => {
  const count = storeSignal(0)
  const doubled = computed(() => count() * 2)
  const increment = () => count.update((n) => n + 1)
  return { count, doubled, increment }
})

const useSettings = defineStore("settings", () => {
  const theme = storeSignal<"light" | "dark">("light")
  const language = storeSignal("en")
  const toggleTheme = () => theme.update((t) => (t === "light" ? "dark" : "light"))
  return { theme, language, toggleTheme }
})

// ─── Initialize stores ───────────────────────────────────────────────────────

const counter = useCounter()
const settings = useSettings()

// ─── Querying active stores ──────────────────────────────────────────────────

console.log(getRegisteredStores()) // ["counter", "settings"]

// Get a store's StoreApi by ID
const counterApi = getStoreById("counter")
console.log(counterApi?.state) // { count: 0 }
console.log(counterApi?.id) // "counter"

// ─── Building a Devtools Panel ───────────────────────────────────────────────

const StoreDevtoolsPanel: ComponentFn = () => {
  const stores = signal<string[]>(getRegisteredStores())
  const selectedStore = signal<string | null>(null)

  // React to store registry changes (new stores, disposed stores)
  const stopListening = onStoreChange(() => {
    stores.set(getRegisteredStores())
  })

  return () =>
    h("div", { class: "devtools-panel" }, [
      h("h3", {}, "Store Devtools"),

      // Store list
      h("div", { class: "store-list" }, [
        h("h4", {}, `Active Stores (${stores().length})`),
        ...stores().map((storeId) =>
          h("div", {
            key: storeId,
            class: `store-item ${selectedStore() === storeId ? "selected" : ""}`,
            onClick: () => selectedStore.set(storeId),
          }, [
            h("span", {}, storeId),
          ]),
        ),
      ]),

      // Store inspector
      selectedStore()
        ? (() => {
            const api = getStoreById(selectedStore()!)
            if (!api) return h("div", {}, "Store not found")

            return h("div", { class: "store-inspector" }, [
              h("h4", {}, `Store: ${api.id}`),
              h("pre", {}, JSON.stringify(api.state, null, 2)),

              // Action buttons
              h("div", { class: "actions" }, [
                h("button", { onClick: () => api.reset() }, "Reset"),
                h("button", { onClick: () => api.dispose() }, "Dispose"),
              ]),
            ])
          })()
        : h("div", {}, "Select a store to inspect"),
    ])
}
