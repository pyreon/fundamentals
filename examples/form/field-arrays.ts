/**
 * @pyreon/form — Dynamic Field Arrays
 *
 * Demonstrates:
 * - useFieldArray() for dynamic lists of fields
 * - Stable keys for efficient rendering
 * - append, prepend, insert, remove, move, swap operations
 * - Combining with useForm for complex nested forms
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { useFieldArray } from "@pyreon/form"

// ─── Dynamic Tag Input ───────────────────────────────────────────────────────

const TagInput: ComponentFn = () => {
  const tags = useFieldArray<string>(["typescript", "pyreon"])

  return () =>
    h("div", {}, [
      h("h3", {}, `Tags (${tags.length()})`),

      // Render each tag with its stable key
      ...tags.items().map((item) =>
        h("div", { key: item.key }, [
          h("span", {}, item.value),
          h("button", { onClick: () => tags.remove(tags.items().indexOf(item)) }, "×"),
        ]),
      ),

      // Add new tag
      h(
        "button",
        {
          onClick: () => {
            const name = prompt("Tag name?")
            if (name) tags.append(name)
          },
        },
        "Add Tag",
      ),

      // Get current values as plain array
      h("pre", {}, JSON.stringify(tags.values(), null, 2)),
    ])
}

// ─── Sortable Todo List ──────────────────────────────────────────────────────

interface TodoItem {
  text: string
  done: boolean
}

const SortableTodos: ComponentFn = () => {
  const todos = useFieldArray<TodoItem>([
    { text: "Learn Pyreon", done: false },
    { text: "Build something", done: false },
  ])

  return () =>
    h("div", {}, [
      h("h3", {}, "Sortable Todos"),

      ...todos.items().map((item, index) =>
        h("div", { key: item.key, class: "todo-item" }, [
          // Toggle completion
          h("input", {
            type: "checkbox",
            checked: item.value.done,
            onChange: () => todos.update(index, { ...item.value, done: !item.value.done }),
          }),

          h("span", { class: item.value.done ? "done" : "" }, item.value.text),

          // Move up/down
          h("button", { onClick: () => todos.move(index, Math.max(0, index - 1)), disabled: index === 0 }, "↑"),
          h(
            "button",
            {
              onClick: () => todos.move(index, Math.min(todos.length() - 1, index + 1)),
              disabled: index === todos.length() - 1,
            },
            "↓",
          ),

          // Swap with next
          index < todos.length() - 1
            ? h("button", { onClick: () => todos.swap(index, index + 1) }, "⇄")
            : null,

          // Remove
          h("button", { onClick: () => todos.remove(index) }, "×"),
        ]),
      ),

      // Insert at specific position
      h("div", {}, [
        h(
          "button",
          { onClick: () => todos.prepend({ text: "New first item", done: false }) },
          "Add to Start",
        ),
        h(
          "button",
          { onClick: () => todos.append({ text: "New last item", done: false }) },
          "Add to End",
        ),
        h(
          "button",
          {
            onClick: () => {
              const mid = Math.floor(todos.length() / 2)
              todos.insert(mid, { text: "Inserted in middle", done: false })
            },
          },
          "Insert in Middle",
        ),
      ]),

      // Replace entire list
      h(
        "button",
        {
          onClick: () =>
            todos.replace([
              { text: "Fresh start", done: false },
              { text: "New beginning", done: false },
            ]),
        },
        "Reset List",
      ),
    ])
}
