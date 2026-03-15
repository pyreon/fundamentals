/**
 * @pyreon/store — Todo App Store
 *
 * Demonstrates:
 * - Complex state with arrays and objects
 * - Computed derived state (filtering, counting)
 * - Async actions
 * - onAction for logging/side effects
 */
import { defineStore, signal, computed, batch } from "@pyreon/store"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: Date
}

type Filter = "all" | "active" | "completed"

// ─── Define the store ────────────────────────────────────────────────────────

const useTodoStore = defineStore("todos", () => {
  const todos = signal<Todo[]>([])
  const filter = signal<Filter>("all")
  const isLoading = signal(false)
  let nextId = 1

  // Computed views
  const filteredTodos = computed(() => {
    const list = todos()
    switch (filter()) {
      case "active":
        return list.filter((t) => !t.completed)
      case "completed":
        return list.filter((t) => t.completed)
      default:
        return list
    }
  })

  const activeCount = computed(() => todos().filter((t) => !t.completed).length)
  const completedCount = computed(() => todos().filter((t) => t.completed).length)
  const allCompleted = computed(() => todos().length > 0 && activeCount() === 0)

  // Actions
  const addTodo = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    todos.update((list) => [
      ...list,
      { id: nextId++, text: trimmed, completed: false, createdAt: new Date() },
    ])
  }

  const toggleTodo = (id: number) => {
    todos.update((list) => list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const removeTodo = (id: number) => {
    todos.update((list) => list.filter((t) => t.id !== id))
  }

  const clearCompleted = () => {
    todos.update((list) => list.filter((t) => !t.completed))
  }

  const toggleAll = () => {
    const allDone = allCompleted()
    todos.update((list) => list.map((t) => ({ ...t, completed: !allDone })))
  }

  const setFilter = (f: Filter) => filter.set(f)

  // Async action — simulates loading todos from an API
  const loadTodos = async () => {
    isLoading.set(true)
    try {
      const response = await fetch("/api/todos")
      const data = (await response.json()) as Todo[]
      todos.set(data)
    } finally {
      isLoading.set(false)
    }
  }

  return {
    todos, filter, isLoading, filteredTodos, activeCount,
    completedCount, allCompleted, addTodo, toggleTodo, removeTodo,
    clearCompleted, toggleAll, setFilter, loadTodos,
  }
})

// ─── Usage ───────────────────────────────────────────────────────────────────

const { store, onAction } = useTodoStore()

// Action listener — logs every action call
const stopListening = onAction((ctx) => {
  console.log(`Action: ${ctx.name}(${ctx.args.join(", ")})`)

  ctx.after((result) => {
    console.log(`  done: ${ctx.name}`)
  })

  ctx.onError((err) => {
    console.error(`  failed: ${ctx.name}:`, err)
  })
})

// Add some todos
store.addTodo("Learn Pyreon signals")
store.addTodo("Build a todo app")
store.addTodo("Deploy to production")

console.log("Active:", store.activeCount()) // 3
console.log("Filtered:", store.filteredTodos().length) // 3

// Toggle and filter
store.toggleTodo(1)
store.setFilter("active")
console.log("Active todos:", store.filteredTodos().length) // 2

// Cleanup
stopListening()
