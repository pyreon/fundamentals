# @pyreon/storybook

Storybook renderer for Pyreon components. Mount, render, and interact with Pyreon components in Storybook.

## Install

```bash
bun add @pyreon/storybook
```

## Setup

```ts
// .storybook/main.ts
export default {
  stories: ["../src/**/*.stories.ts"],
  framework: "@pyreon/storybook",
}
```

## Quick Start

```ts
import type { Meta, StoryObj } from "@pyreon/storybook"
import { Button } from "./Button"

const meta = {
  component: Button,
  args: { label: "Click me" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: "primary" },
}

export const AllVariants: Story = {
  render: (args) =>
    h("div", { style: "display: flex; gap: 8px;" }, [
      h(Button, { ...args, variant: "primary" }),
      h(Button, { ...args, variant: "secondary" }),
    ]),
}
```

## API

- `Meta<TComponent>` / `StoryObj<TMeta>` — typed story definitions with props inference
- `DecoratorFn<TArgs>` — story decorators
- `renderToCanvas(context, canvasElement)` — core renderer with cleanup lifecycle
- `defaultRender(component, args)` — default `h(component, args)` render
- Re-exports: `h`, `Fragment`, `signal`, `computed`, `effect`, `mount`
