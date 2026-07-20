import zhCN from './locales/zh-CN.js'
import enUS from './locales/en-US.js'

export const locales = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export const defaultLocale = 'zh-CN'

export function getLocale(locale) {
  return locales[locale] || locales[defaultLocale]
}

export function getLocaleName(locale) {
  const names = {
    'zh-CN': '中文',
    'en-US': 'English',
  }
  return names[locale] || locale
}

export function getAvailableLocales() {
  return Object.keys(locales)
}