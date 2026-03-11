import type { InterpolationValues } from './types'

const INTERPOLATION_RE = /\{\{(\s*\w+\s*)\}\}/g

/**
 * Replace `{{key}}` placeholders in a string with values from the given record.
 * Supports optional whitespace inside braces: `{{ name }}` works too.
 * Unmatched placeholders are left as-is.
 */
export function interpolate(
  template: string,
  values?: InterpolationValues,
): string {
  if (!values || !template.includes('{{')) return template
  return template.replace(INTERPOLATION_RE, (_, key: string) => {
    const trimmed = key.trim()
    const value = values[trimmed]
    return value !== undefined ? String(value) : `{{${trimmed}}}`
  })
}
