/**
 * Format a Date according to the active locale.
 * - zh-TW: YYYY/MM/DD
 * - en:    MM/DD/YYYY
 * - ja:    YYYY年MM月DD日
 */
export function formatDate(date: Date, locale: string): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  switch (locale) {
    case 'en':
      return `${mm}/${dd}/${yyyy}`
    case 'ja':
      return `${yyyy}年${mm}月${dd}日`
    case 'zh-TW':
    default:
      return `${yyyy}/${mm}/${dd}`
  }
}
