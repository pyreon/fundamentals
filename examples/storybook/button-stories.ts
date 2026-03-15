/**
 * @pyreon/storybook — Button Component Stories
 *
 * Demonstrates:
 * - Meta and StoryObj type-safe story definitions
 * - Component args with typed inference
 * - Multiple story variants
 * - Custom render functions
 * - Decorators for wrapping stories
 * - Play functions for interaction testing
 */
import { h, signal, computed, effect } from "@pyreon/storybook"
import type { Meta, StoryObj, DecoratorFn } from "@pyreon/storybook"
import type { ComponentFn } from "@pyreon/core"

// ─── Component Definition ────────────────────────────────────────────────────

interface ButtonProps {
  label: string
  variant?: "primary" | "secondary" | "danger"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  onClick?: () => void
}

const Button: ComponentFn<ButtonProps> = (props) => {
  return () =>
    h(
      "button",
      {
        class: `btn btn-${props.variant ?? "primary"} btn-${props.size ?? "md"}`,
        disabled: props.disabled ?? false,
        onClick: props.onClick,
      },
      props.label,
    )
}

// ─── Story Meta ──────────────────────────────────────────────────────────────

const meta = {
  component: Button,
  title: "Components/Button",
  tags: ["autodocs"],
  args: {
    label: "Click me",
    variant: "primary",
    size: "md",
    disabled: false,
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// ─── Stories ─────────────────────────────────────────────────────────────────

// Default story — uses meta.args
export const Default: Story = {}

// Primary variant
export const Primary: Story = {
  args: {
    label: "Primary Button",
    variant: "primary",
  },
}

// Secondary variant
export const Secondary: Story = {
  args: {
    label: "Secondary Button",
    variant: "secondary",
  },
}

// Danger variant
export const Danger: Story = {
  args: {
    label: "Delete Item",
    variant: "danger",
  },
}

// Disabled state
export const Disabled: Story = {
  args: {
    label: "Can't click me",
    disabled: true,
  },
}

// All sizes
export const Sizes: Story = {
  render: (args) =>
    h("div", { style: "display: flex; gap: 8px; align-items: center;" }, [
      h(Button, { ...args, size: "sm", label: "Small" }),
      h(Button, { ...args, size: "md", label: "Medium" }),
      h(Button, { ...args, size: "lg", label: "Large" }),
    ]),
}

// ─── Story with Decorator ────────────────────────────────────────────────────

// Decorator wraps the story in additional context/layout
const withPadding: DecoratorFn<ButtonProps> = (storyFn, context) =>
  h("div", { style: "padding: 24px; background: #f5f5f5; border-radius: 8px;" }, [storyFn()])

export const WithDecorator: Story = {
  decorators: [withPadding],
  args: {
    label: "Decorated Button",
  },
}

// ─── Story with Play Function (Interaction Test) ─────────────────────────────

export const ClickInteraction: Story = {
  args: {
    label: "Click Counter: 0",
  },
  render: (args) => {
    const count = signal(0)
    const label = computed(() => `Click Counter: ${count()}`)

    return h(Button, {
      ...args,
      label: label(),
      onClick: () => count.update((n) => n + 1),
    })
  },
  play: async ({ canvasElement, step }) => {
    await step("Click the button three times", async () => {
      const button = canvasElement.querySelector("button")!
      button.click()
      button.click()
      button.click()
    })

    await step("Verify the count", async () => {
      const button = canvasElement.querySelector("button")!
      console.assert(button.textContent === "Click Counter: 3")
    })
  },
}

// ─── Reactive Story ──────────────────────────────────────────────────────────

export const ReactiveState: Story = {
  render: () => {
    const isLoading = signal(false)
    const label = computed(() => (isLoading() ? "Loading..." : "Submit"))

    return h("div", {}, [
      h(Button, {
        label: label(),
        disabled: isLoading(),
        onClick: async () => {
          isLoading.set(true)
          await new Promise((r) => setTimeout(r, 1500))
          isLoading.set(false)
        },
      }),
    ])
  },
}
