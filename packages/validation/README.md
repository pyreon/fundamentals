# @pyreon/validation

Schema adapters for `@pyreon/form`. Supports Zod, Valibot, and ArkType.

## Install

```bash
bun add @pyreon/validation
```

## Quick Start

```ts
import { z } from "zod"
import { useForm } from "@pyreon/form"
import { zodSchema, zodField } from "@pyreon/validation"

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(13),
})

const form = useForm({
  initialValues: { email: "", age: 0 },
  schema: zodSchema(schema),
  onSubmit: async (values) => console.log(values),
})
```

## Adapters

- `zodSchema(schema)` / `zodField(schema)` — Zod (duck-typed, works with v3 and v4)
- `valibotSchema(schema, safeParse)` / `valibotField(schema, safeParse)` — Valibot
- `arktypeSchema(schema)` / `arktypeField(schema)` — ArkType

Each adapter is also available via subpath import: `@pyreon/validation/zod`, `@pyreon/validation/valibot`, `@pyreon/validation/arktype`.
