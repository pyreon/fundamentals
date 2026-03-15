/**
 * @pyreon/virtual — Basic Virtualization
 *
 * Demonstrates:
 * - useVirtualizer() for element-scoped virtual scrolling
 * - useWindowVirtualizer() for window-scoped virtual scrolling
 * - Reactive virtualItems, totalSize, and isScrolling signals
 * - Fixed and variable row heights
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import { useVirtualizer, useWindowVirtualizer } from "@pyreon/virtual"

// ─── Fixed-Height Virtual List (Element-Scoped) ─────────────────────────────
// Renders 10,000 items but only the visible ones exist in the DOM.

const FixedHeightList: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    text: `Item ${i + 1}`,
  }))

  const { virtualItems, totalSize, isScrolling } = useVirtualizer(() => ({
    count: items.length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 40, // Fixed 40px rows
    overscan: 5, // Render 5 extra items above/below viewport
  }))

  return () =>
    h("div", {}, [
      h("h3", {}, [
        "Fixed-Height List (10,000 items)",
        isScrolling() ? h("span", {}, " — scrolling...") : null,
      ]),

      // Scrollable container
      h(
        "div",
        {
          ref: (el: HTMLElement) => parentRef.set(el),
          style: "height: 400px; overflow-y: auto;",
        },
        [
          // Inner spacer div with total height
          h(
            "div",
            {
              style: `height: ${totalSize()}px; width: 100%; position: relative;`,
            },
            // Only render visible items
            virtualItems().map((virtualRow) =>
              h(
                "div",
                {
                  key: virtualRow.key,
                  style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${virtualRow.size}px;
                    transform: translateY(${virtualRow.start}px);
                  `,
                },
                items[virtualRow.index].text,
              ),
            ),
          ),
        ],
      ),
    ])
}

// ─── Variable-Height Virtual List ────────────────────────────────────────────
// Items have different heights based on content.

const VariableHeightList: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)
  const items = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    text: `Item ${i + 1}`,
    // Simulate varying content lengths
    description: "Lorem ipsum ".repeat(Math.floor(Math.random() * 5) + 1).trim(),
  }))

  const { virtualItems, totalSize } = useVirtualizer(() => ({
    count: items.length,
    getScrollElement: () => parentRef(),
    // Estimate — actual measurement happens after render
    estimateSize: () => 60,
    overscan: 3,
  }))

  return () =>
    h(
      "div",
      {
        ref: (el: HTMLElement) => parentRef.set(el),
        style: "height: 500px; overflow-y: auto;",
      },
      [
        h(
          "div",
          { style: `height: ${totalSize()}px; width: 100%; position: relative;` },
          virtualItems().map((virtualRow) => {
            const item = items[virtualRow.index]
            return h(
              "div",
              {
                key: virtualRow.key,
                // data-index is needed for dynamic measurement
                "data-index": virtualRow.index,
                style: `
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  transform: translateY(${virtualRow.start}px);
                  padding: 8px;
                  border-bottom: 1px solid #eee;
                `,
              },
              [h("strong", {}, item.text), h("p", {}, item.description)],
            )
          }),
        ),
      ],
    )
}

// ─── Window-Scoped Virtualizer ───────────────────────────────────────────────
// Uses the browser window as the scroll container.

const WindowVirtualList: ComponentFn = () => {
  const items = Array.from({ length: 20000 }, (_, i) => `Window Item ${i + 1}`)

  const { virtualItems, totalSize } = useWindowVirtualizer(() => ({
    count: items.length,
    estimateSize: () => 36,
    overscan: 10,
  }))

  return () =>
    h("div", { style: `height: ${totalSize()}px; width: 100%; position: relative;` }, [
      ...virtualItems().map((virtualRow) =>
        h(
          "div",
          {
            key: virtualRow.key,
            style: `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: ${virtualRow.size}px;
              transform: translateY(${virtualRow.start}px);
              display: flex;
              align-items: center;
              padding: 0 16px;
              border-bottom: 1px solid #f0f0f0;
            `,
          },
          items[virtualRow.index],
        ),
      ),
    ])
}

// ─── Virtual Grid (Columns + Rows) ──────────────────────────────────────────

const VirtualGrid: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)
  const rows = 1000
  const cols = 50

  const rowVirtualizer = useVirtualizer(() => ({
    count: rows,
    getScrollElement: () => parentRef(),
    estimateSize: () => 40,
    overscan: 5,
  }))

  const colVirtualizer = useVirtualizer(() => ({
    count: cols,
    getScrollElement: () => parentRef(),
    estimateSize: () => 120,
    horizontal: true,
    overscan: 3,
  }))

  return () =>
    h(
      "div",
      {
        ref: (el: HTMLElement) => parentRef.set(el),
        style: "height: 500px; width: 100%; overflow: auto;",
      },
      [
        h(
          "div",
          {
            style: `
              height: ${rowVirtualizer.totalSize()}px;
              width: ${colVirtualizer.totalSize()}px;
              position: relative;
            `,
          },
          rowVirtualizer.virtualItems().flatMap((virtualRow) =>
            colVirtualizer.virtualItems().map((virtualCol) =>
              h(
                "div",
                {
                  key: `${virtualRow.index}-${virtualCol.index}`,
                  style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${virtualCol.size}px;
                    height: ${virtualRow.size}px;
                    transform: translateX(${virtualCol.start}px) translateY(${virtualRow.start}px);
                    border: 1px solid #ddd;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `,
                },
                `R${virtualRow.index} C${virtualCol.index}`,
              ),
            ),
          ),
        ),
      ],
    )
}
