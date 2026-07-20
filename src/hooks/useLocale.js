import { useState, useEffect, createContext, useContext } from 'react'
import { getLocale, defaultLocale, getAvailableLocales } from '@/i18n/index.js'

const LocaleContext = createContext(null)

export function LocaleProvider({ children, locale: initialLocale }) {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('pdf-master-locale')
    return saved || initialLocale || defaultLocale
  })

  useEffect(() => {
    localStorage.setItem('pdf-master-locale', locale)
  }, [locale])

  const translations = getLocale(locale)

  const changeLocale = (newLocale) => {
    if (getAvailableLocales().includes(newLocale)) {
      setLocale(newLocale)
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, translations, changeLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export function useTranslations() {
  const { translations } = useLocale()
  return translations
}