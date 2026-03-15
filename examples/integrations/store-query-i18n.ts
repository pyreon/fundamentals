/**
 * Cross-Package Integration: Store + Query + i18n
 *
 * Demonstrates:
 * - @pyreon/store for auth state and user preferences
 * - @pyreon/query with auth headers from store
 * - @pyreon/i18n with locale driven by store preferences
 * - Full app setup with providers
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { effect } from "@pyreon/reactivity"
import { defineStore, signal, computed, batch } from "@pyreon/store"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@pyreon/query"
import { createI18n, I18nProvider, useI18n } from "@pyreon/i18n"

// ─── Auth Store ──────────────────────────────────────────────────────────────

const useAuthStore = defineStore("auth", () => {
  const token = signal<string | null>(null)
  const user = signal<{ id: number; name: string; locale: string } | null>(null)
  const isAuthenticated = computed(() => token() !== null)

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    const data = (await res.json()) as { token: string; user: { id: number; name: string; locale: string } }
    batch(() => {
      token.set(data.token)
      user.set(data.user)
    })
  }

  const logout = () => {
    batch(() => {
      token.set(null)
      user.set(null)
    })
  }

  return { token, user, isAuthenticated, login, logout }
})

// ─── i18n instance ───────────────────────────────────────────────────────────

const i18n = createI18n({
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      nav: { dashboard: "Dashboard", settings: "Settings", logout: "Log Out" },
      dashboard: {
        welcome: "Welcome, {{name}}!",
        stats: "Your Statistics",
      },
    },
    de: {
      nav: { dashboard: "Dashboard", settings: "Einstellungen", logout: "Abmelden" },
      dashboard: {
        welcome: "Willkommen, {{name}}!",
        stats: "Ihre Statistiken",
      },
    },
    ja: {
      nav: { dashboard: "ダッシュボード", settings: "設定", logout: "ログアウト" },
      dashboard: {
        welcome: "ようこそ、{{name}}さん！",
        stats: "あなたの統計",
      },
    },
  },
})

// ─── Sync locale from user preferences ───────────────────────────────────────

function setupLocaleSync() {
  const { store: auth } = useAuthStore()

  effect(() => {
    const userData = auth.user()
    if (userData?.locale) {
      i18n.locale.set(userData.locale)
    }
  })
}

// ─── Authenticated query helper ──────────────────────────────────────────────

function useAuthenticatedQuery<T>(key: string[], url: string) {
  const { store: auth } = useAuthStore()

  return useQuery(() => ({
    queryKey: key,
    queryFn: async (): Promise<T> => {
      const currentToken = auth.token()
      const res = await fetch(url, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      })
      if (res.status === 401) {
        auth.logout()
        throw new Error("Session expired")
      }
      return res.json()
    },
    enabled: auth.isAuthenticated(),
  }))
}

// ─── Dashboard Component ─────────────────────────────────────────────────────

interface Stats {
  projects: number
  tasks: number
  completedTasks: number
}

const Dashboard: ComponentFn = () => {
  const { store: auth } = useAuthStore()
  const { t } = useI18n()
  const { data, isPending } = useAuthenticatedQuery<Stats>(["stats"], "/api/stats")

  return () => {
    const user = auth.user()
    if (!user) return null

    return h("div", {}, [
      h("h1", {}, t("dashboard.welcome", { name: user.name })),
      h("h2", {}, t("dashboard.stats")),

      isPending()
        ? h("div", {}, "...")
        : h("div", { class: "stats-grid" }, [
            h("div", {}, `Projects: ${data()?.projects}`),
            h("div", {}, `Tasks: ${data()?.tasks}`),
            h("div", {}, `Completed: ${data()?.completedTasks}`),
          ]),
    ])
  }
}

// ─── Navigation with i18n ────────────────────────────────────────────────────

const Navigation: ComponentFn = () => {
  const auth = useAuthStore()
  const client = useQueryClient()
  const { t } = useI18n()

  return () =>
    h("nav", {}, [
      h("a", { href: "/dashboard" }, t("nav.dashboard")),
      h("a", { href: "/settings" }, t("nav.settings")),
      h(
        "button",
        {
          onClick: () => {
            auth.store.logout()
            client.clear()
          },
        },
        t("nav.logout"),
      ),
    ])
}

// ─── App with all providers ──────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
})

const App: ComponentFn = () => {
  setupLocaleSync()

  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h(I18nProvider, { instance: i18n }, [
        h(Navigation, {}),
        h(Dashboard, {}),
      ]),
    ])
}
