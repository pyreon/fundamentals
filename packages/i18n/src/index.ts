export { createI18n } from './create-i18n'
export { interpolate } from './interpolation'
export { resolvePluralCategory } from './pluralization'
export { I18nProvider, useI18n, I18nContext } from './context'
export { Trans, parseRichText } from './trans'

export type {
  I18nInstance,
  I18nOptions,
  TranslationDictionary,
  TranslationMessages,
  NamespaceLoader,
  InterpolationValues,
  PluralRules,
} from './types'

export type { I18nProviderProps } from './context'
export type { TransProps } from './trans'
