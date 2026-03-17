import { z } from 'zod'
import * as v from 'valibot'
import { type } from 'arktype'
import { h } from '@pyreon/core'
import { mount } from '@pyreon/runtime-dom'
import { useForm } from '@pyreon/form'
import { zodSchema, zodField } from '../zod'
import { valibotSchema, valibotField } from '../valibot'
import { arktypeSchema, arktypeField } from '../arktype'
import { issuesToRecord } from '../utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mountWith<T>(fn: () => T): { result: T; unmount: () => void } {
  let result: T | undefined
  const el = document.createElement('div')
  document.body.appendChild(el)
  const unmount = mount(
    h(() => {
      result = fn()
      return null
    }, null),
    el,
  )
  return {
    result: result!,
    unmount: () => {
      unmount()
      el.remove()
    },
  }
}

// ─── issuesToRecord ──────────────────────────────────────────────────────────

describe('issuesToRecord', () => {
  it('converts issues to a flat record', () => {
    const result = issuesToRecord([
      { path: 'email', message: 'Required' },
      { path: 'password', message: 'Too short' },
    ])
    expect(result).toEqual({ email: 'Required', password: 'Too short' })
  })

  it('first error per field wins', () => {
    const result = issuesToRecord([
      { path: 'email', message: 'Required' },
      { path: 'email', message: 'Invalid format' },
    ])
    expect(result).toEqual({ email: 'Required' })
  })

  it('returns empty object for no issues', () => {
    expect(issuesToRecord([])).toEqual({})
  })
})

// ─── Zod Adapter ─────────────────────────────────────────────────────────────

describe('zodSchema', () => {
  const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Min 8 chars'),
  })

  it('returns empty record for valid data', async () => {
    const validate = zodSchema(schema)
    const result = await validate({ email: 'a@b.com', password: '12345678' })
    expect(result).toEqual({})
  })

  it('returns field errors for invalid data', async () => {
    const validate = zodSchema(schema)
    const result = await validate({ email: 'bad', password: 'short' })
    expect(result.email).toBe('Invalid email')
    expect(result.password).toBe('Min 8 chars')
  })

  it('returns error for single invalid field', async () => {
    const validate = zodSchema(schema)
    const result = await validate({ email: 'a@b.com', password: 'short' })
    expect(result.email).toBeUndefined()
    expect(result.password).toBe('Min 8 chars')
  })
})

describe('zodField', () => {
  it('returns undefined for valid value', async () => {
    const validate = zodField(z.string().email('Invalid email'))
    expect(await validate('a@b.com', {})).toBeUndefined()
  })

  it('returns error message for invalid value', async () => {
    const validate = zodField(z.string().email('Invalid email'))
    expect(await validate('bad', {})).toBe('Invalid email')
  })

  it('works with number schemas', async () => {
    const validate = zodField(z.number().min(0, 'Must be positive'))
    expect(await validate(-1, {})).toBe('Must be positive')
    expect(await validate(5, {})).toBeUndefined()
  })
})

describe('zod + useForm integration', () => {
  it('validates form with zod schema', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
      password: z.string().min(8, 'Min 8 chars'),
    })

    const { result: form, unmount } = mountWith(() =>
      useForm({
        initialValues: { email: '', password: '' },
        schema: zodSchema(schema),
        onSubmit: () => {
          /* noop */
        },
      }),
    )

    const valid = await form.validate()
    expect(valid).toBe(false)
    expect(form.fields.email.error()).toBe('Invalid email')
    expect(form.fields.password.error()).toBe('Min 8 chars')
    unmount()
  })

  it('validates with field-level zod validators', async () => {
    const { result: form, unmount } = mountWith(() =>
      useForm({
        initialValues: { email: '', age: 0 },
        validators: {
          email: zodField(z.string().email('Invalid')),
          age: zodField(z.number().min(18, 'Must be 18+')),
        },
        onSubmit: () => {
          /* noop */
        },
      }),
    )

    const valid = await form.validate()
    expect(valid).toBe(false)
    expect(form.fields.email.error()).toBe('Invalid')
    expect(form.fields.age.error()).toBe('Must be 18+')
    unmount()
  })
})

// ─── Valibot Adapter ─────────────────────────────────────────────────────────

describe('valibotSchema', () => {
  const schema = v.object({
    email: v.pipe(v.string(), v.email('Invalid email')),
    password: v.pipe(v.string(), v.minLength(8, 'Min 8 chars')),
  })

  it('returns empty record for valid data', async () => {
    const validate = valibotSchema(schema, v.safeParseAsync)
    const result = await validate({ email: 'a@b.com', password: '12345678' })
    expect(result).toEqual({})
  })

  it('returns field errors for invalid data', async () => {
    const validate = valibotSchema(schema, v.safeParseAsync)
    const result = await validate({ email: 'bad', password: 'short' })
    expect(result.email).toBe('Invalid email')
    expect(result.password).toBe('Min 8 chars')
  })

  it('works with sync safeParse', async () => {
    const validate = valibotSchema(
      schema,
      v.safeParse as typeof v.safeParseAsync,
    )
    const result = await validate({ email: 'bad', password: 'short' })
    expect(result.email).toBe('Invalid email')
  })

  it('handles issues without path', async () => {
    // Simulate a safeParse function that returns issues without path
    const mockSafeParse = async () => ({
      success: false as const,
      issues: [{ message: 'Schema-level error' }],
    })
    const validate = valibotSchema({}, mockSafeParse as any)
    const result = await validate({})
    // Issue without path maps to empty string key
    expect(result['' as keyof typeof result]).toBe('Schema-level error')
  })

  it('handles result with undefined issues array', async () => {
    const mockSafeParse = async () => ({
      success: false as const,
      // issues is undefined
    })
    const validate = valibotSchema({}, mockSafeParse as any)
    const result = await validate({})
    expect(result).toEqual({})
  })
})

describe('valibotField', () => {
  it('returns undefined for valid value', async () => {
    const validate = valibotField(
      v.pipe(v.string(), v.email('Invalid email')),
      v.safeParseAsync,
    )
    expect(await validate('a@b.com', {})).toBeUndefined()
  })

  it('returns error message for invalid value', async () => {
    const validate = valibotField(
      v.pipe(v.string(), v.email('Invalid email')),
      v.safeParseAsync,
    )
    expect(await validate('bad', {})).toBe('Invalid email')
  })

  it('handles result with undefined issues', async () => {
    const mockSafeParse = async () => ({
      success: false as const,
    })
    const validate = valibotField({}, mockSafeParse as any)
    expect(await validate('x', {})).toBeUndefined()
  })
})

describe('valibot + useForm integration', () => {
  it('validates form with valibot schema', async () => {
    const schema = v.object({
      email: v.pipe(v.string(), v.email('Invalid email')),
      password: v.pipe(v.string(), v.minLength(8, 'Min 8 chars')),
    })

    const { result: form, unmount } = mountWith(() =>
      useForm({
        initialValues: { email: '', password: '' },
        schema: valibotSchema(schema, v.safeParseAsync),
        onSubmit: () => {
          /* noop */
        },
      }),
    )

    const valid = await form.validate()
    expect(valid).toBe(false)
    expect(form.fields.email.error()).toBe('Invalid email')
    expect(form.fields.password.error()).toBe('Min 8 chars')
    unmount()
  })
})

// ─── ArkType Adapter ─────────────────────────────────────────────────────────

describe('arktypeSchema', () => {
  const schema = type({
    email: 'string.email',
    password: 'string >= 8',
  })

  it('returns empty record for valid data', async () => {
    const validate = arktypeSchema(schema as any)
    const result = await validate({ email: 'a@b.com', password: '12345678' })
    expect(result).toEqual({})
  })

  it('returns field errors for invalid data', async () => {
    const validate = arktypeSchema(schema as any)
    const result = await validate({ email: 'bad', password: 'short' })
    expect(result.email).toBeDefined()
    expect(result.password).toBeDefined()
  })
})

describe('arktypeField', () => {
  it('returns undefined for valid value', async () => {
    const validate = arktypeField(type('string.email') as any)
    expect(await validate('a@b.com', {})).toBeUndefined()
  })

  it('returns error message for invalid value', async () => {
    const validate = arktypeField(type('string.email') as any)
    const result = await validate('bad', {})
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

describe('arktype + useForm integration', () => {
  it('validates form with arktype schema', async () => {
    const schema = type({
      email: 'string.email',
      password: 'string >= 8',
    })

    const { result: form, unmount } = mountWith(() =>
      useForm({
        initialValues: { email: '', password: '' },
        schema: arktypeSchema(schema as any),
        onSubmit: () => {
          /* noop */
        },
      }),
    )

    const valid = await form.validate()
    expect(valid).toBe(false)
    expect(form.fields.email.error()).toBeDefined()
    expect(form.fields.password.error()).toBeDefined()
    unmount()
  })
})
