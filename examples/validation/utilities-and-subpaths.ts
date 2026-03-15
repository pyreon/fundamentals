/**
 * @pyreon/validation — Utilities & Subpath Imports
 *
 * Demonstrates:
 * - issuesToRecord() for converting validation issues to error records
 * - Subpath imports (@pyreon/validation/zod, /valibot, /arktype)
 * - Custom schema adapters using the adapter interfaces
 * - Mixing multiple validation libraries
 */
import { useForm } from "@pyreon/form"
import type { SchemaValidateFn, ValidateFn, ValidationError } from "@pyreon/validation"
import { issuesToRecord } from "@pyreon/validation"

// ─── Subpath imports ─────────────────────────────────────────────────────────
// Each adapter is available as its own subpath — tree-shakeable.

import { zodSchema, zodField } from "@pyreon/validation/zod"
import { valibotSchema, valibotField } from "@pyreon/validation/valibot"
import { arktypeSchema, arktypeField } from "@pyreon/validation/arktype"

// ─── issuesToRecord() ────────────────────────────────────────────────────────
// Converts an array of validation issues into a Record<string, string>.
// Useful when building custom adapters or processing API error responses.

import type { ValidationIssue } from "@pyreon/validation"

const issues: ValidationIssue[] = [
  { path: "email", message: "Invalid email address" },
  { path: "password", message: "Too short" },
  { path: "password", message: "Must contain a number" }, // second error for same field
  { path: "name", message: "Required" },
]

const errors = issuesToRecord(issues)
console.log(errors)
// {
//   email: "Invalid email address",
//   password: "Too short",  ← first error wins per field
//   name: "Required"
// }

// ─── Custom schema adapter ───────────────────────────────────────────────────
// Implement SchemaValidateFn<T> for any validation library.

interface MyCustomSchema {
  validate(data: unknown): { valid: boolean; errors: { field: string; msg: string }[] }
}

function customSchemaAdapter<TValues extends Record<string, unknown>>(
  schema: MyCustomSchema,
): SchemaValidateFn<TValues> {
  return async (values: TValues) => {
    const result = schema.validate(values)
    if (result.valid) return {}
    // Convert custom format to Record<field, error>
    const record: Partial<Record<keyof TValues, ValidationError>> = {}
    for (const err of result.errors) {
      if (!(err.field in record)) {
        record[err.field as keyof TValues] = err.msg
      }
    }
    return record
  }
}

// ─── Custom field adapter ────────────────────────────────────────────────────

function customFieldValidator(minLength: number): ValidateFn<string> {
  return (value: string) => {
    if (value.length < minLength) return `Must be at least ${minLength} characters`
    return undefined
  }
}

// ─── Mixing adapters in one form ─────────────────────────────────────────────
// Field validators can use different libraries per field.

import { z } from "zod"
import * as v from "valibot"
import { type } from "arktype"

const mixedForm = useForm({
  initialValues: {
    email: "",
    username: "",
    age: 0,
    bio: "",
  },
  validators: {
    // Zod for email
    email: zodField(z.string().email("Invalid email")),
    // Valibot for username
    username: valibotField(v.pipe(v.string(), v.minLength(3, "Too short")), v.safeParse),
    // ArkType for age
    age: arktypeField(type("number >= 13")),
    // Custom for bio
    bio: customFieldValidator(10),
  },
  onSubmit: async (values) => {
    console.log("Mixed validation passed:", values)
  },
})
