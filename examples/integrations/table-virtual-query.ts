/**
 * Cross-Package Integration: Table + Virtual + Query
 *
 * Demonstrates:
 * - @pyreon/query for fetching large datasets
 * - @pyreon/table for column definitions, sorting, and filtering
 * - @pyreon/virtual for rendering only visible rows
 * - Combining all three for a high-performance data grid
 */
import { h } from "@pyreon/core"
import type { ComponentFn, VNodeChild } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@pyreon/query"
import {
  useTable,
  flexRender,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@pyreon/table"
import type { SortingState } from "@pyreon/table"
import { useVirtualizer } from "@pyreon/virtual"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  service: string
  message: string
}

// ─── Virtualized Data Table ──────────────────────────────────────────────────

const VirtualizedLogTable: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)
  const sorting = signal<SortingState>([])
  const globalFilter = signal("")

  // Fetch large dataset via query
  const { data, isPending, isError, error } = useQuery(() => ({
    queryKey: ["logs"],
    queryFn: async (): Promise<LogEntry[]> => {
      const res = await fetch("/api/logs?limit=50000")
      return res.json()
    },
  }))

  // Column definitions
  const columnHelper = createColumnHelper<LogEntry>()
  const columns = [
    columnHelper.accessor("id", { header: "ID", size: 80 }),
    columnHelper.accessor("timestamp", {
      header: "Time",
      size: 180,
      cell: (info) => new Date(info.getValue()).toLocaleString(),
    }),
    columnHelper.accessor("level", {
      header: "Level",
      size: 80,
      cell: (info) => {
        const level = info.getValue()
        const colors: Record<string, string> = {
          error: "#ff4444", warn: "#ffaa00", info: "#4488ff", debug: "#888",
        }
        return h("span", { style: `color: ${colors[level]}; font-weight: bold;` }, level.toUpperCase())
      },
    }),
    columnHelper.accessor("service", { header: "Service", size: 120 }),
    columnHelper.accessor("message", { header: "Message" }),
  ]

  // Table instance — processes sorting and filtering
  const table = useTable(() => ({
    data: data() ?? [],
    columns,
    state: {
      sorting: sorting(),
      globalFilter: globalFilter(),
    },
    onSortingChange: (updater) => {
      sorting.set(typeof updater === "function" ? updater(sorting()) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  }))

  // Virtualizer — only renders visible rows from the filtered/sorted result
  const virtualizer = useVirtualizer(() => ({
    count: table().getRowModel().rows.length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 36,
    overscan: 20,
  }))

  return () => {
    if (isPending()) return h("div", {}, "Loading 50,000 log entries...")
    if (isError()) return h("div", { class: "error" }, error()?.message)

    const t = table()
    const rows = t.getRowModel().rows

    return h("div", {}, [
      // Search
      h("div", { style: "margin-bottom: 8px;" }, [
        h("input", {
          placeholder: `Search ${rows.length.toLocaleString()} entries...`,
          value: globalFilter(),
          onInput: (e: Event) => globalFilter.set((e.target as HTMLInputElement).value),
          style: "width: 300px; padding: 6px;",
        }),
        h("span", { style: "margin-left: 12px;" }, `${rows.length.toLocaleString()} results`),
      ]),

      // Scrollable container
      h("div", {
        ref: (el: HTMLElement) => parentRef.set(el),
        style: "height: 600px; overflow-y: auto; border: 1px solid #ddd;",
      }, [
        // Table with fixed header
        h("table", { style: "width: 100%; border-collapse: collapse;" }, [
          // Sticky header
          h("thead", { style: "position: sticky; top: 0; background: white; z-index: 1;" },
            t.getHeaderGroups().map((group) =>
              h("tr", { key: group.id }, group.headers.map((header) =>
                h("th", {
                  key: header.id,
                  style: `width: ${header.getSize()}px; padding: 8px; text-align: left; cursor: pointer; border-bottom: 2px solid #ddd;`,
                  onClick: header.column.getToggleSortingHandler(),
                }, [
                  flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild,
                  header.column.getIsSorted() === "asc" ? " ↑"
                    : header.column.getIsSorted() === "desc" ? " ↓" : "",
                ]),
              )),
            ),
          ),

          // Virtualized body
          h("tbody", {}, [
            // Spacer for total height
            h("tr", {}, [h("td", { colSpan: columns.length, style: `height: ${virtualizer.totalSize()}px; padding: 0;` })]),

            // Only visible rows
            ...virtualizer.virtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              return h("tr", {
                key: row.id,
                style: `
                  position: absolute;
                  top: ${virtualRow.start}px;
                  width: 100%;
                  height: ${virtualRow.size}px;
                  display: table-row;
                `,
              }, row.getVisibleCells().map((cell) =>
                h("td", {
                  key: cell.id,
                  style: `width: ${cell.column.getSize()}px; padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
              ))
            }),
          ]),
        ]),
      ]),
    ])
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient()

const App: ComponentFn = () => {
  return () =>
    h(QueryClientProvider, { client: queryClient }, [
      h("h1", {}, "Log Viewer (50K entries, virtualized)"),
      h(VirtualizedLogTable, {}),
    ])
}
