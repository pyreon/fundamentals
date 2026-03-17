# @pyreon/virtual

Pyreon adapter for TanStack Virtual. Efficient rendering of large lists with reactive `virtualItems`, `totalSize`, and `isScrolling` signals.

## Install

```bash
bun add @pyreon/virtual @tanstack/virtual-core
```

## Quick Start

```ts
import { h } from "@pyreon/core"
import { signal } from "@pyreon/reactivity"
import { useVirtualizer } from "@pyreon/virtual"

function VirtualList() {
  const parentRef = signal<HTMLElement | null>(null)
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`)

  const { virtualItems, totalSize } = useVirtualizer(() => ({
    count: items.length,
    getScrollElement: () => parentRef(),
    estimateSize: () => 40,
    overscan: 5,
  }))

  return () =>
    h("div", { ref: (el) => parentRef.set(el), style: "height: 400px; overflow-y: auto;" }, [
      h("div", { style: `height: ${totalSize()}px; position: relative;` },
        virtualItems().map((row) =>
          h("div", {
            key: row.key,
            style: `position: absolute; top: 0; width: 100%; height: ${row.size}px; transform: translateY(${row.start}px);`,
          }, items[row.index])
        )
      ),
    ])
}
```

## API

- `useVirtualizer(options)` — element-scoped virtualizer
- `useWindowVirtualizer(options)` — window-scoped virtualizer
