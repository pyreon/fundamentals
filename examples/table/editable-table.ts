/**
 * @pyreon/table — Editable Table with Selection
 *
 * Demonstrates:
 * - Row selection with checkbox column
 * - Inline cell editing
 * - Column visibility toggling
 * - Dynamic data updates with signals
 */
import { h } from "@pyreon/core"
import type { ComponentFn, VNodeChild } from "@pyreon/core"
import { signal, batch } from "@pyreon/reactivity"
import {
  useTable,
  flexRender,
  createColumnHelper,
  getCoreRowModel,
} from "@pyreon/table"
import type { RowSelectionState, VisibilityState } from "@pyreon/table"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
}

// ─── Component ───────────────────────────────────────────────────────────────

const EditableProductTable: ComponentFn = () => {
  const data = signal<Product[]>([
    { id: 1, name: "Widget A", price: 9.99, stock: 150, category: "Electronics" },
    { id: 2, name: "Gadget B", price: 24.99, stock: 75, category: "Electronics" },
    { id: 3, name: "Tool C", price: 14.5, stock: 200, category: "Hardware" },
    { id: 4, name: "Part D", price: 3.25, stock: 500, category: "Hardware" },
  ])

  const rowSelection = signal<RowSelectionState>({})
  const columnVisibility = signal<VisibilityState>({})

  // Helper to update a cell value
  const updateCell = (rowIndex: number, field: keyof Product, value: unknown) => {
    data.update((items) => items.map((item, i) => (i === rowIndex ? { ...item, [field]: value } : item)))
  }

  const columnHelper = createColumnHelper<Product>()

  const columns = [
    // Checkbox selection column
    columnHelper.display({
      id: "select",
      header: ({ table }) =>
        h("input", {
          type: "checkbox",
          checked: table.getIsAllRowsSelected(),
          onChange: table.getToggleAllRowsSelectedHandler(),
        }),
      cell: ({ row }) =>
        h("input", {
          type: "checkbox",
          checked: row.getIsSelected(),
          onChange: row.getToggleSelectedHandler(),
        }),
    }),

    columnHelper.accessor("name", {
      header: "Product Name",
      cell: ({ getValue, row }) =>
        h("input", {
          value: getValue(),
          onInput: (e: Event) => updateCell(row.index, "name", (e.target as HTMLInputElement).value),
        }),
    }),

    columnHelper.accessor("price", {
      header: "Price",
      cell: ({ getValue, row }) =>
        h("input", {
          type: "number",
          step: "0.01",
          value: getValue(),
          onInput: (e: Event) =>
            updateCell(row.index, "price", parseFloat((e.target as HTMLInputElement).value) || 0),
        }),
    }),

    columnHelper.accessor("stock", {
      header: "Stock",
      cell: ({ getValue, row }) =>
        h("input", {
          type: "number",
          value: getValue(),
          onInput: (e: Event) =>
            updateCell(row.index, "stock", parseInt((e.target as HTMLInputElement).value) || 0),
        }),
    }),

    columnHelper.accessor("category", { header: "Category" }),
  ]

  const table = useTable(() => ({
    data: data(),
    columns,
    state: {
      rowSelection: rowSelection(),
      columnVisibility: columnVisibility(),
    },
    onRowSelectionChange: (updater) => {
      rowSelection.set(typeof updater === "function" ? updater(rowSelection()) : updater)
    },
    onColumnVisibilityChange: (updater) => {
      columnVisibility.set(typeof updater === "function" ? updater(columnVisibility()) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  }))

  return () => {
    const t = table()

    return h("div", {}, [
      // Column visibility toggles
      h("div", { class: "column-toggles" }, [
        h("span", {}, "Columns: "),
        ...t.getAllLeafColumns().map((column) =>
          column.id !== "select"
            ? h("label", { key: column.id }, [
                h("input", {
                  type: "checkbox",
                  checked: column.getIsVisible(),
                  onChange: column.getToggleVisibilityHandler(),
                }),
                ` ${column.id}`,
              ])
            : null,
        ),
      ]),

      // Selected rows count
      h("div", {}, `${Object.keys(rowSelection()).length} row(s) selected`),

      // Table
      h("table", {}, [
        h(
          "thead",
          {},
          t.getHeaderGroups().map((group) =>
            h(
              "tr",
              { key: group.id },
              group.headers.map((header) =>
                h("th", { key: header.id }, flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild),
              ),
            ),
          ),
        ),
        h(
          "tbody",
          {},
          t.getRowModel().rows.map((row) =>
            h(
              "tr",
              { key: row.id, class: row.getIsSelected() ? "selected" : "" },
              row.getVisibleCells().map((cell) =>
                h("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
              ),
            ),
          ),
        ),
      ]),

      // Bulk actions on selected rows
      h("div", { class: "actions" }, [
        h(
          "button",
          {
            disabled: Object.keys(rowSelection()).length === 0,
            onClick: () => {
              const selectedIds = new Set(
                Object.keys(rowSelection()).map((i) => data()[Number(i)].id),
              )
              data.update((items) => items.filter((item) => !selectedIds.has(item.id)))
              rowSelection.set({})
            },
          },
          "Delete Selected",
        ),
      ]),
    ])
  }
}
