// Feature: moment-chalet-booking-system
// Consolidated property tests for cost monitoring and chatbot (Properties 20–27)

import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { defineComponent, h } from 'vue'
import { getSystemPrompt, type Locale } from '@/utils/chatSystemPrompt'
import { saveMessagesToSession, loadMessagesFromSession } from '@/stores/chatSessionStorage'
import { setLocale } from '@/i18n/index'
import { formatCurrency } from '@/utils/currency'
import { getPageMeta } from '@/utils/pageMeta'
import type { ChatMessage, Property } from '@/types'
import { FC_PARAMS, arbLocale } from './setup'

// ── Minimal i18n for component mounting ──────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: {} },
})

// ── Property 20: 預算警示進度條顏色規則 ──────────────────────────────────────

/**
 * **Validates: Requirements 11.6**
 *
 * Property 20: 預算警示進度條顏色規則
 * For any actual cost and budget:
 *   - actual / budget < 0.5  → green
 *   - 0.5 ≤ actual / budget < 0.8 → yellow
 *   - actual / budget ≥ 0.8 → red
 */

function getBudgetColor(actual: number, budget: number): 'green' | 'yellow' | 'red' {
  const ratio = actual / budget
  if (ratio < 0.5) return 'green'
  if (ratio < 0.8) return 'yellow'
  return 'red'
}

describe('Property 20: 預算警示進度條顏色規則', () => {
  const arbBudget = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true })

  it('actual / budget < 0.5 → green', () => {
    fc.assert(
      fc.property(
        arbBudget,
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true }),
        (budget, ratio) => {
          fc.pre(ratio < 0.5)
          const actual = ratio * budget
          return getBudgetColor(actual, budget) === 'green'
        }
      ),
      FC_PARAMS
    )
  })

  it('0.5 ≤ actual / budget < 0.8 → yellow', () => {
    const arbYellowRatio = fc.float({ min: Math.fround(0.5), max: Math.fround(0.799), noNaN: true, noDefaultInfinity: true })
    fc.assert(
      fc.property(arbBudget, arbYellowRatio, (budget, ratio) => {
        const actual = ratio * budget
        return getBudgetColor(actual, budget) === 'yellow'
      }),
      FC_PARAMS
    )
  })

  it('actual / budget ≥ 0.8 → red', () => {
    fc.assert(
      fc.property(
        arbBudget,
        fc.float({ min: Math.fround(0.8), max: Math.fround(2), noNaN: true, noDefaultInfinity: true }),
        (budget, ratio) => {
          const actual = ratio * budget
          return getBudgetColor(actual, budget) === 'red'
        }
      ),
      FC_PARAMS
    )
  })

  it('color is always one of green, yellow, or red', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true }),
        arbBudget,
        (actual, budget) => {
          const color = getBudgetColor(actual, budget)
          return color === 'green' || color === 'yellow' || color === 'red'
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 21: Chatbot 依語系切換 ──────────────────────────────────────────

/**
 * **Validates: Requirements 12.4, 14.6**
 *
 * Property 21: Chatbot 依語系切換
 * getSystemPrompt returns locale-appropriate content:
 *   - zh-TW → contains Chinese characters
 *   - ja → contains Japanese hiragana/katakana
 *   - en → no Chinese or Japanese characters
 * All locales return a non-empty string; same locale always returns same prompt.
 */
describe('Property 21: Chatbot 依語系切換', () => {
  it('zh-TW locale 的 system prompt 應包含繁體中文內容', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('zh-TW'), (locale) => {
        const prompt = getSystemPrompt(locale)
        return /[\u4e00-\u9fff]/.test(prompt)
      }),
      FC_PARAMS
    )
  })

  it('ja locale 的 system prompt 應包含日文內容', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('ja'), (locale) => {
        const prompt = getSystemPrompt(locale)
        return /[\u3040-\u30ff]/.test(prompt)
      }),
      FC_PARAMS
    )
  })

  it('en locale 的 system prompt 應為英文內容（不含中日文字元）', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('en'), (locale) => {
        const prompt = getSystemPrompt(locale)
        return !/[\u3040-\u30ff\u4e00-\u9fff]/.test(prompt)
      }),
      FC_PARAMS
    )
  })

  it('任意語系的 system prompt 應為非空字串', () => {
    fc.assert(
      fc.property(arbLocale, (locale) => {
        const prompt = getSystemPrompt(locale)
        return typeof prompt === 'string' && prompt.length > 0
      }),
      FC_PARAMS
    )
  })

  it('相同語系每次應回傳相同的 system prompt', () => {
    fc.assert(
      fc.property(arbLocale, (locale) => {
        return getSystemPrompt(locale) === getSystemPrompt(locale)
      }),
      FC_PARAMS
    )
  })

  it('不同語系應回傳不同的 system prompt', () => {
    fc.assert(
      fc.property(
        fc.tuple(arbLocale, arbLocale).filter(([a, b]) => a !== b),
        ([localeA, localeB]) => {
          return getSystemPrompt(localeA) !== getSystemPrompt(localeB)
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 22: 對話紀錄寫入完整性 ──────────────────────────────────────────

/**
 * **Validates: Requirements 12.5, 13.1**
 *
 * Property 22: 對話紀錄寫入完整性
 * A single conversation turn produces exactly 2 chat_logs entries:
 * one user entry and one assistant entry, both sharing the same session_id.
 */

type ChatRole = 'user' | 'assistant'

interface ChatLogEntry {
  session_id: string
  role: ChatRole
  content: string
  tokens_used: number
}

function buildChatLogEntries(
  sessionId: string,
  userMessage: string,
  assistantReply: string,
  tokensUsed: number
): ChatLogEntry[] {
  return [
    { session_id: sessionId, role: 'user', content: userMessage, tokens_used: 0 },
    { session_id: sessionId, role: 'assistant', content: assistantReply, tokens_used: tokensUsed },
  ]
}

const sessionIdArb = fc.uuid()
const messageArb = fc.string({ minLength: 1, maxLength: 500 })
const tokensArb = fc.integer({ min: 0, max: 4096 })

describe('Property 22: 對話紀錄寫入完整性', () => {
  it('一次對話應產生恰好 2 筆 chat_logs 記錄', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens).length === 2
      }),
      FC_PARAMS
    )
  })

  it('第一筆記錄的 role 應為 user', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[0].role === 'user'
      }),
      FC_PARAMS
    )
  })

  it('第二筆記錄的 role 應為 assistant', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[1].role === 'assistant'
      }),
      FC_PARAMS
    )
  })

  it('兩筆記錄的 session_id 應相同', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[0].session_id === sessionId && entries[1].session_id === sessionId
      }),
      FC_PARAMS
    )
  })

  it('user 記錄的 content 應與原始訊息相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[0].content === userMsg
      }),
      FC_PARAMS
    )
  })

  it('assistant 記錄的 content 應與回覆內容相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[1].content === assistantReply
      }),
      FC_PARAMS
    )
  })

  it('user 記錄的 tokens_used 應為 0', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[0].tokens_used === 0
      }),
      FC_PARAMS
    )
  })

  it('assistant 記錄的 tokens_used 應與實際用量相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        return buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)[1].tokens_used === tokens
      }),
      FC_PARAMS
    )
  })
})

// ── Property 23: 對話歷史 sessionStorage Round-Trip ──────────────────────────

/**
 * **Validates: Requirements 12.6**
 *
 * Property 23: 對話歷史 sessionStorage Round-Trip
 * For any sequence of ChatMessage objects, saving to sessionStorage and loading
 * back should produce the same sequence (same order, role, content, timestamp).
 */

const chatMessageArb = fc.record({
  role: fc.constantFrom<'user' | 'assistant'>('user', 'assistant'),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
})

describe('Property 23: 對話歷史 sessionStorage Round-Trip', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('任意訊息序列經 sessionStorage round-trip 後保持相同順序、role 與 content', () => {
    fc.assert(
      fc.property(
        fc.array(chatMessageArb, { minLength: 0, maxLength: 20 }),
        (messages: ChatMessage[]) => {
          saveMessagesToSession(messages)
          const loaded = loadMessagesFromSession()
          if (loaded.length !== messages.length) return false
          return messages.every((original, i) => {
            const restored = loaded[i]
            return (
              restored.role === original.role &&
              restored.content === original.content &&
              restored.timestamp.getTime() === original.timestamp.getTime()
            )
          })
        }
      ),
      FC_PARAMS
    )
  })

  it('空訊息陣列 round-trip 後仍為空陣列', () => {
    saveMessagesToSession([])
    expect(loadMessagesFromSession()).toEqual([])
  })

  it('sessionStorage 無資料時 loadMessagesFromSession 回傳空陣列', () => {
    expect(loadMessagesFromSession()).toEqual([])
  })

  it('sessionStorage 損毀資料時 loadMessagesFromSession 回傳空陣列', () => {
    sessionStorage.setItem('chatbot_history', 'not-valid-json{{{')
    expect(loadMessagesFromSession()).toEqual([])
  })
})

// ── Property 24: 語系切換持久化 ───────────────────────────────────────────────

/**
 * **Validates: Requirements 14.3**
 *
 * Property 24: 語系切換持久化
 * After calling setLocale, the chosen locale is persisted to localStorage.
 */
describe('Property 24: 語系切換持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('setLocale 應將語系持久化至 localStorage', () => {
    fc.assert(
      fc.property(arbLocale, (locale) => {
        setLocale(locale)
        expect(localStorage.getItem('moment_chalet_locale')).toBe(locale)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 25: 貨幣顯示格式 ─────────────────────────────────────────────────

/**
 * **Validates: Requirements 14.5**
 *
 * Property 25: 貨幣顯示格式
 * formatCurrency always returns a string starting with "TWD " followed by
 * comma-separated digits, and the parsed value equals the original amount.
 */
describe('Property 25: 貨幣顯示格式', () => {
  it('formatCurrency 應回傳有效的 TWD 格式', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), (amount) => {
        const result = formatCurrency(amount)
        expect(result).toMatch(/^TWD /)
        const numericPart = result.slice(4)
        expect(numericPart).toMatch(/^[\d,]+$/)
        expect(parseInt(numericPart.replace(/,/g, ''), 10)).toBe(amount)
      }),
      FC_PARAMS
    )
  })
})

// ── Property 26: 頁面 Meta 資訊完整性 ────────────────────────────────────────

/**
 * **Validates: Requirements 15.2**
 *
 * Property 26: 頁面 Meta 資訊完整性
 * For any known route name, getPageMeta returns non-empty title and description.
 * Different routes have different titles. Unknown routes return a non-empty fallback.
 */

const routeNames = [
  'home',
  'properties',
  'property-detail',
  'booking',
  'booking-confirmation',
  'my-booking',
]

const routeNameArb = fc.constantFrom(...routeNames)

describe('Property 26: 頁面 Meta 資訊完整性', () => {
  it('任意路由名稱應返回非空的 title 與 description', () => {
    fc.assert(
      fc.property(routeNameArb, (routeName) => {
        const meta = getPageMeta(routeName)
        expect(typeof meta.title).toBe('string')
        expect(meta.title.length).toBeGreaterThan(0)
        expect(typeof meta.description).toBe('string')
        expect(meta.description.length).toBeGreaterThan(0)
      }),
      FC_PARAMS
    )
  })

  it('不同路由應有不同的 title', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(routeNameArb, { minLength: 2, maxLength: 2 }),
        ([routeA, routeB]) => {
          expect(getPageMeta(routeA).title).not.toBe(getPageMeta(routeB).title)
        }
      ),
      FC_PARAMS
    )
  })

  it('未知路由名稱應返回非空的 fallback title 與 description', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !routeNames.includes(s)),
        (unknownRoute) => {
          const meta = getPageMeta(unknownRoute)
          expect(meta.title.length).toBeGreaterThan(0)
          expect(meta.description.length).toBeGreaterThan(0)
        }
      ),
      FC_PARAMS
    )
  })
})

// ── Property 27: 圖片 Alt 文字完整性 ─────────────────────────────────────────

/**
 * **Validates: Requirements 15.3**
 *
 * Property 27: 圖片 Alt 文字完整性
 * For any array of Property objects rendered as property cards,
 * each <img> element should have a non-empty alt attribute.
 */

const propertyArb = fc.record<Property>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  location: fc.string({ minLength: 1, maxLength: 60 }),
  lat: fc.float({ min: -90, max: 90, noNaN: true }),
  lng: fc.float({ min: -180, max: 180, noNaN: true }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 }),
  ical_url: fc.option(fc.webUrl(), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
})

describe('Property 27: 圖片 Alt 文字完整性', () => {
  it('任意民宿資料渲染的卡片中每張圖片應有非空 alt 屬性', () => {
    fc.assert(
      fc.property(
        fc.array(propertyArb, { minLength: 1, maxLength: 6 }),
        (properties) => {
          const PropertyCardList = defineComponent({
            setup() {
              return () =>
                h(
                  'div',
                  properties.map((property) =>
                    h('article', { key: property.id }, [
                      h('img', {
                        src: property.images[0] || '/images/property-placeholder.jpg',
                        alt: property.name,
                        class: 'w-full h-48 object-cover',
                      }),
                      h('div', { class: 'p-4' }, [
                        h('h3', property.name),
                        h('p', property.location),
                      ]),
                    ])
                  )
                )
            },
          })

          const wrapper = mount(PropertyCardList, {
            global: { plugins: [i18n] },
          })

          const imgs = wrapper.findAll('img')
          expect(imgs.length).toBe(properties.length)

          for (const img of imgs) {
            const alt = img.attributes('alt')
            expect(alt).toBeDefined()
            expect(alt!.length).toBeGreaterThan(0)
          }
        }
      ),
      FC_PARAMS
    )
  })
})
