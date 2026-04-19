import { createI18n } from 'vue-i18n'
import zhTW from '@/locales/zh-TW.json'
import en from '@/locales/en.json'
import ja from '@/locales/ja.json'

export type Locale = 'zh-TW' | 'en' | 'ja'

const LOCALE_STORAGE_KEY = 'moment_chalet_locale'

function getStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
  if (stored && ['zh-TW', 'en', 'ja'].includes(stored)) {
    return stored
  }
  return 'zh-TW'
}

const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: 'zh-TW',
  messages: {
    'zh-TW': zhTW,
    en,
    ja
  }
})

export function setLocale(locale: Locale) {
  (i18n.global.locale as { value: Locale }).value = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

export default i18n
