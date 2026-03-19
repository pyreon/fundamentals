import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { _resetRegistry, setCookieSource, useCookie } from '../index'

function clearAllCookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (name) {
      // biome-ignore lint/suspicious/noDocumentCookie: test cleanup requires direct cookie access
      document.cookie = `${name}=; max-age=0; path=/`
    }
  }
}

describe('useCookie', () => {
  beforeEach(() => {
    _resetRegistry()
    clearAllCookies()
  })

  afterEach(() => {
    _resetRegistry()
    clearAllCookies()
  })

  it('returns default value when cookie does not exist', () => {
    const locale = useCookie('locale', 'en')
    expect(locale()).toBe('en')
  })

  it('reads existing cookie value', () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup requires direct cookie access
    document.cookie = `locale=${encodeURIComponent(JSON.stringify('de'))}; path=/`
    const locale = useCookie('locale', 'en')
    expect(locale()).toBe('de')
  })

  it('.set() updates signal and writes cookie', () => {
    const locale = useCookie('locale', 'en')
    locale.set('fr')
    expect(locale()).toBe('fr')
    expect(document.cookie).toContain('locale')
  })

  it('.remove() deletes cookie and resets to default', () => {
    const locale = useCookie('locale', 'en')
    locale.set('fr')
    locale.remove()
    expect(locale()).toBe('en')
  })

  it('returns same signal instance for same key', () => {
    const a = useCookie('locale', 'en')
    const b = useCookie('locale', 'en')
    expect(a).toBe(b)
  })

  it('works with objects', () => {
    const prefs = useCookie('prefs', { dark: false })
    prefs.set({ dark: true })
    expect(prefs()).toEqual({ dark: true })
  })

  it('.update() works', () => {
    const count = useCookie('count', 0)
    count.update((n) => n + 1)
    expect(count()).toBe(1)
  })

  it('.peek() reads without subscribing', () => {
    const locale = useCookie('locale', 'en')
    expect(locale.peek()).toBe('en')
  })

  it('respects maxAge option', () => {
    const locale = useCookie('locale', 'en', { maxAge: 3600 })
    locale.set('de')
    expect(document.cookie).toContain('locale')
  })

  it('respects secure option', () => {
    const token = useCookie('token', '', { secure: true })
    token.set('abc123')
    expect(token()).toBe('abc123')
  })
})

describe('setCookieSource (SSR)', () => {
  beforeEach(() => {
    _resetRegistry()
  })

  afterEach(() => {
    _resetRegistry()
    setCookieSource('')
  })

  it('stores server cookie string without throwing', () => {
    setCookieSource('locale=de; theme=dark')
    expect(() => setCookieSource('foo=bar')).not.toThrow()
  })
})
