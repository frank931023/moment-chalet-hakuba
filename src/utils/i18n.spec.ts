// Feature: moment-chalet-booking-system, Property 8: 日期格式依語系調整
// Feature: moment-chalet-booking-system, Property 24: 語系切換持久化
// Feature: moment-chalet-booking-system, Property 25: 貨幣顯示格式

import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import { formatDate } from '@/utils/date'
import { formatCurrency } from '@/utils/currency'
import { setLocale } from '@/i18n/index'
import type { Locale } from '@/i18n/index'

// ── Property 8: 日期格式依語系調整 ────────────────────────────────────────────
// Validates: Requirements 3.5, 14.4

describe('Property 8: 日期格式依語系調整', () => {
  it('zh-TW locale formats date as YYYY/MM/DD', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') }),
        (date) => {
          const result = formatDate(date, 'zh-TW')
          // Must match YYYY/MM/DD
          expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
          const [yyyy, mm, dd] = result.split('/')
          expect(parseInt(yyyy)).toBe(date.getFullYear())
          expect(parseInt(mm)).toBe(date.getMonth() + 1)
          expect(parseInt(dd)).toBe(date.getDate())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('en locale formats date as MM/DD/YYYY', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') }),
        (date) => {
          const result = formatDate(date, 'en')
          // Must match MM/DD/YYYY
          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
          const [mm, dd, yyyy] = result.split('/')
          expect(parseInt(yyyy)).toBe(date.getFullYear())
          expect(parseInt(mm)).toBe(date.getMonth() + 1)
          expect(parseInt(dd)).toBe(date.getDate())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('ja locale formats date as YYYY年MM月DD日', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') }),
        (date) => {
          const result = formatDate(date, 'ja')
          // Must match YYYY年MM月DD日
          expect(result).toMatch(/^\d{4}年\d{2}月\d{2}日$/)
          const match = result.match(/^(\d{4})年(\d{2})月(\d{2})日$/)
          expect(match).not.toBeNull()
          if (match) {
            expect(parseInt(match[1])).toBe(date.getFullYear())
            expect(parseInt(match[2])).toBe(date.getMonth() + 1)
            expect(parseInt(match[3])).toBe(date.getDate())
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 24: 語系切換持久化 ───────────────────────────────────────────────
// Validates: Requirements 14.3

describe('Property 24: 語系切換持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('setLocale persists locale to localStorage', () => {
    const locales: Locale[] = ['zh-TW', 'en', 'ja']

    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        (locale) => {
          setLocale(locale)
          const stored = localStorage.getItem('moment_chalet_locale')
          expect(stored).toBe(locale)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 25: 貨幣顯示格式 ─────────────────────────────────────────────────
// Validates: Requirements 14.5

describe('Property 25: 貨幣顯示格式', () => {
  it('formatCurrency returns valid TWD format for non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        (amount) => {
          const result = formatCurrency(amount)
          // Must start with "TWD "
          expect(result).toMatch(/^TWD /)
          // The part after "TWD " must contain only digits and commas
          const numericPart = result.slice(4)
          expect(numericPart).toMatch(/^[\d,]+$/)
          // Parsed value must equal original amount
          const parsed = parseInt(numericPart.replace(/,/g, ''), 10)
          expect(parsed).toBe(amount)
        }
      ),
      { numRuns: 100 }
    )
  })
})
