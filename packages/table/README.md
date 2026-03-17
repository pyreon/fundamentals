# @pyreon/table

Pyreon adapter for TanStack Table. Reactive signal-driven table state with `flexRender` for column templates.

## Install

```bash
bun add @pyreon/table @tanstack/table-core
```

## Quick Start

```ts
import { h } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import {
  useTable, flexRender, createColumnHelper,
  getCoreRowModel, getSortedRowModel,
} from "@pyreon/table"

const columnHelper = createColumnHelper<{ name: string; age: number }>()
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("age", { header: "Age" }),
]

function UserTable() {
  const data = signal([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ])

  const table = useTable(() => ({
    data: data(),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }))

  return () => h("table", null, [
    h("tbody", null, table().getRowModel().rows.map((row) =>
      h("tr", { key: row.id }, row.getVisibleCells().map((cell) =>
        h("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext()))
      ))
    )),
  ])
}
```

## API

- `useTable(options)` — reactive TanStack Table with signal-driven options
- `flexRender(component, props)` — renders column def templates (strings, functions, VNodes)
