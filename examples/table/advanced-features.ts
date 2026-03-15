/**
 * @pyreon/table — Advanced Features
 *
 * Demonstrates:
 * - Column grouping with nested headers
 * - Column pinning (sticky left/right)
 * - Row expanding with sub-rows
 * - Aggregation (sum, count, average)
 * - Column resizing
 */
import { h } from "@pyreon/core"
import type { ComponentFn, VNodeChild } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import {
  useTable,
  flexRender,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getFilteredRowModel,
} from "@pyreon/table"
import type { ExpandedState, GroupingState, ColumnPinningState } from "@pyreon/table"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SalesRecord {
  id: number
  product: string
  category: string
  region: string
  quantity: number
  revenue: number
  date: string
  subRows?: SalesRecord[]
}

// ─── Sample data with sub-rows ───────────────────────────────────────────────

const salesData: SalesRecord[] = [
  {
    id: 1,
    product: "Widget Pro",
    category: "Electronics",
    region: "North",
    quantity: 150,
    revenue: 15000,
    date: "2024-01-15",
    subRows: [
      { id: 11, product: "Widget Pro (Q1)", category: "Electronics", region: "North", quantity: 80, revenue: 8000, date: "2024-01-15" },
      { id: 12, product: "Widget Pro (Q2)", category: "Electronics", region: "North", quantity: 70, revenue: 7000, date: "2024-04-15" },
    ],
  },
  { id: 2, product: "Gadget X", category: "Electronics", region: "South", quantity: 200, revenue: 20000, date: "2024-02-20" },
  { id: 3, product: "Tool Kit", category: "Hardware", region: "North", quantity: 50, revenue: 2500, date: "2024-03-10" },
  { id: 4, product: "Part Set", category: "Hardware", region: "East", quantity: 300, revenue: 9000, date: "2024-04-05" },
  { id: 5, product: "Sensor V2", category: "Electronics", region: "West", quantity: 120, revenue: 18000, date: "2024-05-18" },
]

// ─── Column grouping with nested headers ─────────────────────────────────────

const GroupedHeaderTable: ComponentFn = () => {
  const columnHelper = createColumnHelper<SalesRecord>()

  const columns = [
    columnHelper.accessor("product", { header: "Product" }),
    // Grouped column header
    columnHelper.group({
      header: "Details",
      columns: [
        columnHelper.accessor("category", { header: "Category" }),
        columnHelper.accessor("region", { header: "Region" }),
        columnHelper.accessor("date", { header: "Date" }),
      ],
    }),
    // Another group
    columnHelper.group({
      header: "Metrics",
      columns: [
        columnHelper.accessor("quantity", {
          header: "Qty",
          aggregatedCell: ({ getValue }) => `Total: ${getValue()}`,
          aggregationFn: "sum",
        }),
        columnHelper.accessor("revenue", {
          header: "Revenue",
          cell: (info) => `$${info.getValue().toLocaleString()}`,
          aggregatedCell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
          aggregationFn: "sum",
        }),
      ],
    }),
  ]

  const grouping = signal<GroupingState>([])

  const table = useTable(() => ({
    data: salesData,
    columns,
    state: { grouping: grouping() },
    onGroupingChange: (updater) => {
      grouping.set(typeof updater === "function" ? updater(grouping()) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }))

  return () => {
    const t = table()
    return h("div", {}, [
      // Grouping controls
      h("div", {}, [
        h("span", {}, "Group by: "),
        h("button", { onClick: () => grouping.set(["category"]) }, "Category"),
        h("button", { onClick: () => grouping.set(["region"]) }, "Region"),
        h("button", { onClick: () => grouping.set([]) }, "None"),
      ]),

      h("table", {}, [
        h("thead", {}, t.getHeaderGroups().map((group) =>
          h("tr", { key: group.id }, group.headers.map((header) =>
            h("th", {
              key: header.id,
              colSpan: header.colSpan,
              style: header.colSpan > 1 ? "text-align: center; border-bottom: 2px solid #333;" : "",
            }, header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild),
          )),
        )),
        h("tbody", {}, t.getRowModel().rows.map((row) =>
          h("tr", { key: row.id }, row.getVisibleCells().map((cell) =>
            h("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
          )),
        )),
      ]),
    ])
  }
}

// ─── Column pinning ──────────────────────────────────────────────────────────

const PinnedColumnsTable: ComponentFn = () => {
  const columnHelper = createColumnHelper<SalesRecord>()

  const columns = [
    columnHelper.accessor("id", { header: "ID", size: 60 }),
    columnHelper.accessor("product", { header: "Product", size: 200 }),
    columnHelper.accessor("category", { header: "Category", size: 150 }),
    columnHelper.accessor("region", { header: "Region", size: 120 }),
    columnHelper.accessor("quantity", { header: "Quantity", size: 100 }),
    columnHelper.accessor("revenue", {
      header: "Revenue",
      size: 120,
      cell: (info) => `$${info.getValue().toLocaleString()}`,
    }),
    columnHelper.accessor("date", { header: "Date", size: 120 }),
  ]

  const columnPinning = signal<ColumnPinningState>({
    left: ["id", "product"], // Pin these columns to the left
    right: ["revenue"], // Pin revenue to the right
  })

  const table = useTable(() => ({
    data: salesData,
    columns,
    state: { columnPinning: columnPinning() },
    onColumnPinningChange: (updater) => {
      columnPinning.set(typeof updater === "function" ? updater(columnPinning()) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
  }))

  return () => {
    const t = table()

    return h("div", { style: "overflow-x: auto; max-width: 600px;" }, [
      h("table", { style: "width: 1000px;" }, [
        h("thead", {}, t.getHeaderGroups().map((group) =>
          h("tr", { key: group.id }, group.headers.map((header) =>
            h("th", {
              key: header.id,
              style: `
                width: ${header.getSize()}px;
                ${header.column.getIsPinned() ? `position: sticky; ${header.column.getIsPinned()}: 0; background: white; z-index: 1;` : ""}
              `,
            }, flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild),
          )),
        )),
        h("tbody", {}, t.getRowModel().rows.map((row) =>
          h("tr", { key: row.id }, row.getVisibleCells().map((cell) =>
            h("td", {
              key: cell.id,
              style: cell.column.getIsPinned()
                ? `position: sticky; ${cell.column.getIsPinned()}: 0; background: white;`
                : "",
            }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
          )),
        )),
      ]),
    ])
  }
}

// ─── Expanding rows with sub-rows ────────────────────────────────────────────

const ExpandableTable: ComponentFn = () => {
  const columnHelper = createColumnHelper<SalesRecord>()

  const columns = [
    columnHelper.display({
      id: "expand",
      header: () => null,
      cell: ({ row }) =>
        row.getCanExpand()
          ? h(
              "button",
              { onClick: row.getToggleExpandedHandler(), style: "cursor: pointer;" },
              row.getIsExpanded() ? "▼" : "▶",
            )
          : null,
      size: 40,
    }),
    columnHelper.accessor("product", { header: "Product" }),
    columnHelper.accessor("category", { header: "Category" }),
    columnHelper.accessor("quantity", { header: "Qty" }),
    columnHelper.accessor("revenue", {
      header: "Revenue",
      cell: (info) => `$${info.getValue().toLocaleString()}`,
    }),
  ]

  const expanded = signal<ExpandedState>({})

  const table = useTable(() => ({
    data: salesData,
    columns,
    state: { expanded: expanded() },
    onExpandedChange: (updater) => {
      expanded.set(typeof updater === "function" ? updater(expanded()) : updater)
    },
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  }))

  return () => {
    const t = table()
    return h("table", {}, [
      h("thead", {}, t.getHeaderGroups().map((group) =>
        h("tr", { key: group.id }, group.headers.map((header) =>
          h("th", { key: header.id }, flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild),
        )),
      )),
      h("tbody", {}, t.getRowModel().rows.map((row) =>
        h("tr", {
          key: row.id,
          style: row.depth > 0 ? "background: #f9f9f9; font-size: 0.9em;" : "",
        }, row.getVisibleCells().map((cell) =>
          h("td", {
            key: cell.id,
            style: cell.column.id === "product" ? `padding-left: ${row.depth * 24 + 8}px;` : "",
          }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
        )),
      )),
    ])
  }
}
