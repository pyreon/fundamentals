/**
 * @pyreon/store — Store Plugins
 *
 * Demonstrates:
 * - addStorePlugin() for cross-cutting concerns
 * - Persistence plugin (localStorage)
 * - Logger plugin
 * - Plugin receives StoreApi directly
 */
import { defineStore, addStorePlugin, signal, computed } from "@pyreon/store"
import type { StorePlugin } from "@pyreon/store"

// ─── Logger Plugin ───────────────────────────────────────────────────────────
// Logs every state mutation to the console.

const loggerPlugin: StorePlugin = (api) => {
  api.subscribe((mutation, state) => {
    console.group(`[store:${api.id}] ${mutation.type}`)
    for (const event of mutation.events) {
      console.log(`  ${event.key}: ${JSON.stringify(event.oldValue)} → ${JSON.stringify(event.newValue)}`)
    }
    console.groupEnd()
  })
}

// ─── Persistence Plugin ──────────────────────────────────────────────────────
// Saves store state to localStorage on every change and restores on init.

const persistPlugin: StorePlugin = (api) => {
  const storageKey = `pyreon-store:${api.id}`

  // Restore saved state
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>
      api.patch(parsed)
    } catch {
      // Ignore invalid JSON
    }
  }

  // Subscribe to persist future changes
  api.subscribe((_mutation, state) => {
    localStorage.setItem(storageKey, JSON.stringify(state))
  })
}

// ─── Undo Plugin ─────────────────────────────────────────────────────────────
// Tracks state history for undo capability.

const undoPlugin: StorePlugin = (api) => {
  const history: Record<string, unknown>[] = []
  const maxHistory = 50

  // Save initial state
  history.push({ ...api.state })

  api.subscribe((_mutation, state) => {
    history.push({ ...state })
    if (history.length > maxHistory) history.shift()
  })

  // Augment the store with undo capabilities
  ;(api as Record<string, unknown>).undo = () => {
    if (history.length < 2) return
    history.pop() // Remove current state
    const prev = history[history.length - 1]
    if (prev) api.patch(prev)
  }
  ;(api as Record<string, unknown>).canUndo = () => history.length > 1
}

// ─── Register plugins (before defining stores) ──────────────────────────────

addStorePlugin(loggerPlugin)
addStorePlugin(persistPlugin)

// ─── Define a store that benefits from plugins ───────────────────────────────

const useSettings = defineStore("settings", () => {
  const theme = signal<"light" | "dark">("light")
  const fontSize = signal(14)
  const language = signal("en")

  const toggleTheme = () => {
    theme.update((t) => (t === "light" ? "dark" : "light"))
  }

  const setFontSize = (size: number) => {
    fontSize.set(Math.max(10, Math.min(24, size)))
  }

  return { theme, fontSize, language, toggleTheme, setFontSize }
})

// ─── Usage ───────────────────────────────────────────────────────────────────

const { store: settings, patch } = useSettings()

// Every change is logged and persisted automatically via plugins
settings.toggleTheme() // Logged + saved to localStorage
settings.setFontSize(16) // Logged + saved to localStorage

// Patch multiple values at once
patch({ fontSize: 18, language: "de" })
