/**
 * @pyreon/state-tree — Nested Model Composition
 *
 * Demonstrates:
 * - Composing models by using ModelDefinition as state fields
 * - Nested snapshots and snapshot restoration
 * - Deep reactivity across model boundaries
 */
import { computed } from "@pyreon/reactivity"
import { model, getSnapshot, applySnapshot } from "@pyreon/state-tree"

// ─── Define child models ─────────────────────────────────────────────────────

const Address = model({
  state: {
    street: "",
    city: "",
    zip: "",
  },

  views: (self) => ({
    formatted: computed(() => {
      const street = self.street()
      const city = self.city()
      const zip = self.zip()
      if (!street && !city) return "(no address)"
      return `${street}, ${city} ${zip}`.trim()
    }),
  }),

  actions: (self) => ({
    update: (data: { street?: string; city?: string; zip?: string }) => {
      if (data.street !== undefined) self.street.set(data.street)
      if (data.city !== undefined) self.city.set(data.city)
      if (data.zip !== undefined) self.zip.set(data.zip)
    },
  }),
})

// ─── Define parent model with nested children ────────────────────────────────

const User = model({
  state: {
    name: "",
    email: "",
    // Nested model — Address becomes a model instance on the User
    address: Address,
  },

  views: (self) => ({
    displayName: computed(() => {
      const name = self.name()
      const email = self.email()
      return name || email || "(anonymous)"
    }),
  }),

  actions: (self) => ({
    setProfile: (name: string, email: string) => {
      self.name.set(name)
      self.email.set(email)
    },
  }),
})

// ─── Usage ───────────────────────────────────────────────────────────────────

const user = User.create({
  name: "Alice",
  email: "alice@example.com",
  address: {
    street: "123 Main St",
    city: "Springfield",
    zip: "62701",
  },
})

// Access nested model state
console.log(user.name()) // "Alice"
console.log(user.address().street()) // "123 Main St"
console.log(user.address().formatted()) // "123 Main St, Springfield 62701"

// Modify nested model via its actions
user.address().update({ city: "Shelbyville", zip: "62702" })
console.log(user.address().formatted()) // "123 Main St, Shelbyville 62702"

// ─── Nested snapshots ────────────────────────────────────────────────────────

const snapshot = getSnapshot(user)
console.log(snapshot)
// {
//   name: "Alice",
//   email: "alice@example.com",
//   address: { street: "123 Main St", city: "Shelbyville", zip: "62702" }
// }

// Restore from snapshot
applySnapshot(user, {
  name: "Bob",
  email: "bob@example.com",
  address: { street: "456 Oak Ave", city: "Portland", zip: "97201" },
})

console.log(user.name()) // "Bob"
console.log(user.address().formatted()) // "456 Oak Ave, Portland 97201"
