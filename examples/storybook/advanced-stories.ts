/**
 * @pyreon/storybook — Advanced Story Patterns
 *
 * Demonstrates:
 * - defaultRender() usage
 * - renderToCanvas() direct usage for custom renderers
 * - Fragment stories (multiple root elements)
 * - Composed decorators (multiple layers)
 * - Re-exported Pyreon utilities (signal, computed, effect, mount)
 * - Type inference with InferProps
 */
import { h, Fragment, signal, computed, effect, mount, defaultRender } from "@pyreon/storybook"
import type { Meta, StoryObj, DecoratorFn, StoryFn, StoryContext, InferProps } from "@pyreon/storybook"
import type { ComponentFn, VNodeChild } from "@pyreon/core"

// ─── Components ──────────────────────────────────────────────────────────────

interface CardProps {
  title: string
  description?: string
  variant?: "default" | "elevated" | "outlined"
}

const Card: ComponentFn<CardProps> = (props) => {
  return () =>
    h("div", { class: `card card-${props.variant ?? "default"}` }, [
      h("h3", {}, props.title),
      props.description ? h("p", {}, props.description) : null,
    ])
}

interface AlertProps {
  message: string
  severity: "info" | "warning" | "error"
  dismissible?: boolean
}

const Alert: ComponentFn<AlertProps> = (props) => {
  const visible = signal(true)

  return () => {
    if (!visible()) return null
    return h("div", { class: `alert alert-${props.severity}` }, [
      h("span", {}, props.message),
      props.dismissible ? h("button", { onClick: () => visible.set(false) }, "×") : null,
    ])
  }
}

// ─── defaultRender — the framework's default render function ─────────────────
// When no custom `render` is provided, Storybook calls defaultRender.
// It simply does h(component, args).

// You can use it explicitly:
const element = defaultRender(Card, { title: "Hello", variant: "elevated" })
// Equivalent to: h(Card, { title: "Hello", variant: "elevated" })

// ─── Fragment stories — multiple root elements ───────────────────────────────

const alertMeta = {
  component: Alert,
  title: "Components/Alert",
  args: {
    message: "Something happened",
    severity: "info",
    dismissible: false,
  },
} satisfies Meta<typeof Alert>

type AlertStory = StoryObj<typeof alertMeta>

// Render multiple alerts using Fragment
const AllSeverities: AlertStory = {
  render: (args) =>
    h(Fragment, {}, [
      h(Alert, { ...args, severity: "info", message: "Info: This is informational" }),
      h(Alert, { ...args, severity: "warning", message: "Warning: Check this out" }),
      h(Alert, { ...args, severity: "error", message: "Error: Something went wrong" }),
    ]),
}

// Fragment for layout comparison
const CardVariants: StoryObj<Meta<typeof Card>> = {
  render: (args) =>
    h(Fragment, {}, [
      h("div", { style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;" }, [
        h(Card, { ...args, title: "Default", variant: "default" }),
        h(Card, { ...args, title: "Elevated", variant: "elevated" }),
        h(Card, { ...args, title: "Outlined", variant: "outlined" }),
      ]),
    ]),
}

// ─── Composed decorators — multiple layers ───────────────────────────────────

// Decorator 1: Add padding
const withPadding: DecoratorFn<CardProps> = (storyFn) =>
  h("div", { style: "padding: 24px;" }, [storyFn()])

// Decorator 2: Add background
const withBackground: DecoratorFn<CardProps> = (storyFn) =>
  h("div", { style: "background: #f5f5f5; border-radius: 8px;" }, [storyFn()])

// Decorator 3: Add theme context
const withTheme: DecoratorFn<CardProps> = (storyFn, context) =>
  h("div", { "data-theme": "light", class: "theme-provider" }, [storyFn()])

// Decorators compose — outermost first
const DecoratedCard: StoryObj<Meta<typeof Card>> = {
  args: { title: "Fully Decorated", description: "Three layers of decoration" },
  decorators: [withPadding, withBackground, withTheme],
  // Renders as: withPadding(withBackground(withTheme(story)))
}

// ─── InferProps type utility ─────────────────────────────────────────────────
// Extracts the props type from a ComponentFn.

type CardInferred = InferProps<typeof Card>
// CardInferred = CardProps = { title: string; description?: string; variant?: ... }

type AlertInferred = InferProps<typeof Alert>
// AlertInferred = AlertProps = { message: string; severity: ...; dismissible?: boolean }

// Useful in generic story helpers
function createStoryVariants<T extends ComponentFn<any>>(
  component: T,
  variants: Record<string, Partial<InferProps<T>>>,
): StoryObj<Meta<T>> {
  return {
    render: (args) =>
      h(
        "div",
        { style: "display: flex; gap: 16px; flex-wrap: wrap;" },
        Object.entries(variants).map(([name, overrides]) =>
          h("div", { key: name }, [
            h("h4", {}, name),
            h(component, { ...args, ...overrides }),
          ]),
        ),
      ),
  }
}

// ─── Reactive stories with full signal lifecycle ─────────────────────────────

const InteractiveCard: StoryObj<Meta<typeof Card>> = {
  render: () => {
    const clickCount = signal(0)
    const title = computed(() => `Clicked ${clickCount()} times`)
    const variant = computed<CardProps["variant"]>(() =>
      clickCount() > 5 ? "elevated" : "default",
    )

    // effect() for side effects — auto-disposes when story unmounts
    effect(() => {
      if (clickCount() === 10) {
        console.log("Achievement unlocked: 10 clicks!")
      }
    })

    return h("div", { onClick: () => clickCount.update((n) => n + 1) }, [
      h(Card, {
        title: title(),
        variant: variant(),
        description: "Click me to increment the counter",
      }),
    ])
  },
}

// ─── mount() — for testing stories outside Storybook ─────────────────────────
// The re-exported mount() lets you render Pyreon VNodes to the DOM
// directly in play functions or tests.

const WithPlayFunction: StoryObj<Meta<typeof Alert>> = {
  args: { message: "Dismissible alert", severity: "warning", dismissible: true },
  play: async ({ canvasElement, step }) => {
    await step("Verify alert is visible", async () => {
      const alert = canvasElement.querySelector(".alert")
      console.assert(alert !== null, "Alert should be visible")
    })

    await step("Dismiss the alert", async () => {
      const dismissBtn = canvasElement.querySelector(".alert button")!
      ;(dismissBtn as HTMLButtonElement).click()
      // Wait for reactive update
      await new Promise((r) => setTimeout(r, 10))
    })

    await step("Verify alert is dismissed", async () => {
      const alert = canvasElement.querySelector(".alert")
      console.assert(alert === null, "Alert should be dismissed")
    })
  },
}
