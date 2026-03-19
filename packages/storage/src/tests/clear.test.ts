import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  _resetRegistry,
  clearStorage,
  removeStorage,
  useSessionStorage,
  useStorage,
} from '../index'

describe('removeStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    _resetRegistry()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    _resetRegistry()
  })

  it('removes a localStorage entry via signal', () => {
    const theme = useStorage('theme', 'light')
    theme.set('dark')

    removeStorage('theme')
    expect(theme()).toBe('light')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('removes a sessionStorage entry', () => {
    const step = useSessionStorage('step', 0)
    step.set(3)

    removeStorage('step', { type: 'session' })
    expect(step()).toBe(0)
    expect(sessionStorage.getItem('step')).toBeNull()
  })

  it('removes raw localStorage even without a signal', () => {
    localStorage.setItem('orphan', 'value')
    removeStorage('orphan')
    expect(localStorage.getItem('orphan')).toBeNull()
  })
})

describe('clearStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    _resetRegistry()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    _resetRegistry()
  })

  it('clears all managed localStorage entries', () => {
    const a = useStorage('a', 1)
    const b = useStorage('b', 2)
    a.set(10)
    b.set(20)

    clearStorage()
    expect(a()).toBe(1)
    expect(b()).toBe(2)
  })

  it('clears all managed sessionStorage entries', () => {
    const a = useSessionStorage('a', 'x')
    const b = useSessionStorage('b', 'y')
    a.set('modified')
    b.set('modified')

    clearStorage('session')
    expect(a()).toBe('x')
    expect(b()).toBe('y')
  })

  it('clears all backends with "all"', () => {
    const local = useStorage('l', 'default')
    const session = useSessionStorage('s', 'default')
    local.set('changed')
    session.set('changed')

    clearStorage('all')
    expect(local()).toBe('default')
    expect(session()).toBe('default')
  })
})
