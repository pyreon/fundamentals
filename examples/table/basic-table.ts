/**
 * @pyreon/table — Basic Data Table
 *
 * Demonstrates:
 * - useTable() with reactive options
 * - flexRender() for column templates
 * - Column definitions with accessors
 * - Sorting, filtering, and pagination
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
  getFilteredRowModel,
  getPaginationRowModel,
} from "@pyreon/table"
import type { SortingState, ColumnFiltersState } from "@pyreon/table"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: number
  name: string
  department: string
  salary: number
  startDate: string
}

// ─── Sample data ─────────────────────────────────────────────────────────────

const employees: Employee[] = [
  { id: 1, name: "Alice Johnson", department: "Engineering", salary: 120000, startDate: "2021-03-15" },
  { id: 2, name: "Bob Smith", department: "Marketing", salary: 95000, startDate: "2020-06-01" },
  { id: 3, name: "Carol Williams", department: "Engineering", salary: 135000, startDate: "2019-01-10" },
  { id: 4, name: "David Brown", department: "Sales", salary: 88000, startDate: "2022-09-20" },
  { id: 5, name: "Eve Davis", department: "Engineering", salary: 115000, startDate: "2023-02-28" },
]

// ─── Column definitions ──────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Employee>()

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("department", {
    header: "Department",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("salary", {
    header: "Salary",
    cell: (info) => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor("startDate", {
    header: "Start Date",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
]

// ─── Table Component ─────────────────────────────────────────────────────────

const EmployeeTable: ComponentFn = () => {
  const data = signal(employees)
  const sorting = signal<SortingState>([])
  const columnFilters = signal<ColumnFiltersState>([])
  const globalFilter = signal("")

  // useTable returns a Computed<Table> — reactive to option changes
  const table = useTable(() => ({
    data: data(),
    columns,
    state: {
      sorting: sorting(),
      columnFilters: columnFilters(),
      globalFilter: globalFilter(),
    },
    onSortingChange: (updater) => {
      sorting.set(typeof updater === "function" ? updater(sorting()) : updater)
    },
    onColumnFiltersChange: (updater) => {
      columnFilters.set(typeof updater === "function" ? updater(columnFilters()) : updater)
    },
    onGlobalFilterChange: (updater) => {
      globalFilter.set(typeof updater === "function" ? updater(globalFilter()) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  }))

  return () => {
    const t = table()

    return h("div", {}, [
      // Global search
      h("input", {
        placeholder: "Search all columns...",
        value: globalFilter(),
        onInput: (e: Event) => globalFilter.set((e.target as HTMLInputElement).value),
      }),

      // Table
      h("table", {}, [
        // Header
        h(
          "thead",
          {},
          t.getHeaderGroups().map((headerGroup) =>
            h(
              "tr",
              { key: headerGroup.id },
              headerGroup.headers.map((header) =>
                h(
                  "th",
                  {
                    key: header.id,
                    onClick: header.column.getToggleSortingHandler(),
                    style: "cursor: pointer",
                  },
                  [
                    // flexRender handles string, function, or VNode column templates
                    flexRender(header.column.columnDef.header, header.getContext()) as VNodeChild,
                    // Sort indicator
                    header.column.getIsSorted() === "asc"
                      ? " ↑"
                      : header.column.getIsSorted() === "desc"
                        ? " ↓"
                        : "",
                  ],
                ),
              ),
            ),
          ),
        ),

        // Body
        h(
          "tbody",
          {},
          t.getRowModel().rows.map((row) =>
            h(
              "tr",
              { key: row.id },
              row.getVisibleCells().map((cell) =>
                h("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext()) as VNodeChild),
              ),
            ),
          ),
        ),
      ]),

      // Pagination controls
      h("div", { class: "pagination" }, [
        h("button", { onClick: () => t.previousPage(), disabled: !t.getCanPreviousPage() }, "Previous"),
        h("span", {}, `Page ${t.getState().pagination.pageIndex + 1} of ${t.getPageCount()}`),
        h("button", { onClick: () => t.nextPage(), disabled: !t.getCanNextPage() }, "Next"),
      ]),

      // Row count
      h("div", {}, `${t.getFilteredRowModel().rows.length} of ${employees.length} rows`),
    ])
  }
}
