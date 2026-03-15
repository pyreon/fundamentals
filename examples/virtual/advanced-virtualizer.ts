/**
 * @pyreon/virtual — Advanced Virtualization
 *
 * Demonstrates:
 * - Dynamic measurement with measureElement
 * - scrollToIndex for programmatic scrolling
 * - Horizontal-only virtual list
 * - Reactive options (dynamic count)
 * - onChange callback for scroll position tracking
 */
import { h } from "@pyreon/core"
import type { ComponentFn } from "@pyreon/core"
import { signal, computed } from "@pyreon/reactivity"
import { useVirtualizer, useWindowVirtualizer, measureElement } from "@pyreon/virtual"

// ─── Dynamic measurement with measureElement ─────────────────────────────────
// When items have unknown/variable heights, the virtualizer measures them
// after initial render for accurate positioning.

const DynamicMeasuredList: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)

  const messages = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    author: `User ${(i % 5) + 1}`,
    // Variable length messages
    text: "This is a message. ".repeat(Math.floor(Math.random() * 8) + 1).trim(),
    hasImage: i % 7 === 0,
  }))

  const virtualizer = useVirtualizer(() => ({
    count: messages.length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 80, // Initial estimate — will be corrected by measurement
    overscan: 5,
    // measureElement enables dynamic height measurement
    // The virtualizer calls this to measure actual rendered size
    measureElement:
      typeof window !== "undefined"
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  }))

  return () =>
    h("div", {}, [
      // Scroll-to controls
      h("div", { class: "controls" }, [
        h(
          "button",
          { onClick: () => virtualizer.instance.scrollToIndex(0, { align: "start" }) },
          "Scroll to Top",
        ),
        h(
          "button",
          { onClick: () => virtualizer.instance.scrollToIndex(499, { align: "center" }) },
          "Scroll to Middle",
        ),
        h(
          "button",
          { onClick: () => virtualizer.instance.scrollToIndex(messages.length - 1, { align: "end" }) },
          "Scroll to Bottom",
        ),
        // Scroll to specific index
        h(
          "button",
          {
            onClick: () => {
              const idx = parseInt(prompt("Scroll to index?") || "0")
              virtualizer.instance.scrollToIndex(idx, { align: "center", behavior: "smooth" })
            },
          },
          "Go to Index...",
        ),
      ]),

      // Scroll container
      h(
        "div",
        {
          ref: (el: HTMLElement) => parentRef.set(el),
          style: "height: 500px; overflow-y: auto;",
        },
        [
          h(
            "div",
            { style: `height: ${virtualizer.totalSize()}px; width: 100%; position: relative;` },
            virtualizer.virtualItems().map((virtualRow) => {
              const msg = messages[virtualRow.index]
              return h(
                "div",
                {
                  key: virtualRow.key,
                  // data-index is required for measureElement to work
                  "data-index": virtualRow.index,
                  ref: (el: HTMLElement) => virtualizer.instance.measureElement(el),
                  style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    transform: translateY(${virtualRow.start}px);
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                  `,
                },
                [
                  h("div", { style: "font-weight: bold; margin-bottom: 4px;" }, msg.author),
                  h("div", {}, msg.text),
                  msg.hasImage
                    ? h("div", { style: "height: 100px; background: #ddd; margin-top: 8px; border-radius: 4px;" }, "[Image]")
                    : null,
                ],
              )
            }),
          ),
        ],
      ),

      // Status
      h("div", {}, [
        virtualizer.isScrolling() ? "Scrolling..." : "Idle",
        ` | Rendered: ${virtualizer.virtualItems().length} / ${messages.length}`,
      ]),
    ])
}

// ─── Horizontal Virtual List ─────────────────────────────────────────────────
// Useful for image carousels, timelines, horizontal scrollers.

const HorizontalList: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)

  const items = Array.from({ length: 500 }, (_, i) => ({
    id: i,
    label: `Card ${i + 1}`,
    color: `hsl(${(i * 7) % 360}, 70%, 80%)`,
    width: 150 + Math.floor(Math.random() * 100), // Variable widths
  }))

  const virtualizer = useVirtualizer(() => ({
    count: items.length,
    getScrollElement: () => parentRef(),
    estimateSize: (index) => items[index].width,
    horizontal: true, // Enable horizontal mode
    overscan: 3,
  }))

  return () =>
    h(
      "div",
      {
        ref: (el: HTMLElement) => parentRef.set(el),
        style: "width: 100%; overflow-x: auto; white-space: nowrap;",
      },
      [
        h(
          "div",
          {
            style: `
              width: ${virtualizer.totalSize()}px;
              height: 200px;
              position: relative;
            `,
          },
          virtualizer.virtualItems().map((virtualCol) => {
            const item = items[virtualCol.index]
            return h(
              "div",
              {
                key: virtualCol.key,
                style: `
                  position: absolute;
                  top: 8px;
                  left: 0;
                  height: calc(100% - 16px);
                  width: ${virtualCol.size}px;
                  transform: translateX(${virtualCol.start}px);
                  background: ${item.color};
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  margin-right: 8px;
                `,
              },
              item.label,
            )
          }),
        ),
      ],
    )
}

// ─── Reactive count — items change over time ─────────────────────────────────

const DynamicCountList: ComponentFn = () => {
  const parentRef = signal<HTMLElement | null>(null)
  const items = signal<string[]>(["Initial item"])

  const { virtualItems, totalSize } = useVirtualizer(() => ({
    count: items().length, // Reactive — re-evaluates when items change
    getScrollElement: () => parentRef(),
    estimateSize: () => 40,
  }))

  return () =>
    h("div", {}, [
      h("div", {}, [
        h("button", { onClick: () => items.update((list) => [...list, `Item ${list.length + 1}`]) }, "Add Item"),
        h(
          "button",
          { onClick: () => items.update((list) => list.slice(0, -1)), disabled: items().length === 0 },
          "Remove Last",
        ),
        h("span", {}, ` ${items().length} items`),
      ]),

      h(
        "div",
        {
          ref: (el: HTMLElement) => parentRef.set(el),
          style: "height: 300px; overflow-y: auto; border: 1px solid #ddd;",
        },
        [
          h(
            "div",
            { style: `height: ${totalSize()}px; position: relative;` },
            virtualItems().map((vItem) =>
              h(
                "div",
                {
                  key: vItem.key,
                  style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${vItem.size}px;
                    transform: translateY(${vItem.start}px);
                    padding: 8px;
                    border-bottom: 1px solid #f0f0f0;
                  `,
                },
                items()[vItem.index],
              ),
            ),
          ),
        ],
      ),
    ])
}
