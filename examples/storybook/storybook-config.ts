/**
 * @pyreon/storybook — Storybook Configuration
 *
 * Demonstrates how to configure Storybook to use the Pyreon renderer.
 * These files go in your .storybook/ directory.
 */

// ─── .storybook/main.ts ─────────────────────────────────────────────────────

export const mainConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@pyreon/storybook",
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
}

// ─── .storybook/preview.ts ───────────────────────────────────────────────────
// Optional — customize global decorators, parameters, etc.

/*
import type { DecoratorFn } from "@pyreon/storybook"
import { h } from "@pyreon/storybook"

// Global decorator — wraps every story
const withThemeProvider: DecoratorFn<Record<string, unknown>> = (storyFn) =>
  h("div", { class: "theme-provider", "data-theme": "light" }, [storyFn()])

export const decorators = [withThemeProvider]

export const parameters = {
  layout: "centered",
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
}
*/

// ─── Writing Stories — Quick Reference ───────────────────────────────────────

/*
// my-component.stories.ts

import type { Meta, StoryObj } from "@pyreon/storybook"
import { h, signal, computed } from "@pyreon/storybook"
import { MyComponent } from "./MyComponent"

// 1. Define meta with component and default args
const meta = {
  component: MyComponent,
  title: "Components/MyComponent",
  args: { ... },
} satisfies Meta<typeof MyComponent>

export default meta
type Story = StoryObj<typeof meta>

// 2. Define stories as variations
export const Default: Story = {}

export const WithCustomArgs: Story = {
  args: { prop: "value" },
}

// 3. Custom render for complex layouts
export const CustomRender: Story = {
  render: (args) => h("div", {}, [
    h(MyComponent, { ...args }),
    h("p", {}, "Additional content"),
  ]),
}

// 4. Decorators for wrapping
export const Decorated: Story = {
  decorators: [
    (storyFn) => h("div", { style: "padding: 20px" }, [storyFn()]),
  ],
}

// 5. Play functions for interaction testing
export const Interactive: Story = {
  play: async ({ canvasElement, step }) => {
    await step("Do something", async () => {
      canvasElement.querySelector("button")!.click()
    })
  },
}

// 6. Reactive stories with signals
export const Reactive: Story = {
  render: () => {
    const count = signal(0)
    return h(MyComponent, {
      value: count(),
      onIncrement: () => count.update(n => n + 1),
    })
  },
}
*/
