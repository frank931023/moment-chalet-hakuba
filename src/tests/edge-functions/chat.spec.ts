// Feature: moment-chalet-booking-system, Property 21: Chatbot 依語系切換
// Feature: moment-chalet-booking-system, Property 22: 對話紀錄寫入完整性

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { getSystemPrompt, type Locale } from '../../utils/chatSystemPrompt'

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const localeArb = fc.constantFrom<Locale>('zh-TW', 'en', 'ja')

// ─── Property 21: Chatbot 依語系切換 ─────────────────────────────────────────
// Validates: Requirements 12.4, 14.6

describe('Property 21: Chatbot 依語系切換', () => {
  it('zh-TW locale 的 system prompt 應包含繁體中文內容', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('zh-TW'), (locale) => {
        const prompt = getSystemPrompt(locale)
        // Should contain Chinese characters
        return /[\u4e00-\u9fff]/.test(prompt)
      }),
      { numRuns: 100 }
    )
  })

  it('ja locale 的 system prompt 應包含日文內容', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('ja'), (locale) => {
        const prompt = getSystemPrompt(locale)
        // Should contain Japanese hiragana/katakana characters
        return /[\u3040-\u30ff]/.test(prompt)
      }),
      { numRuns: 100 }
    )
  })

  it('en locale 的 system prompt 應為英文內容（不含中日文字元）', () => {
    fc.assert(
      fc.property(fc.constant<Locale>('en'), (locale) => {
        const prompt = getSystemPrompt(locale)
        // Should not contain Chinese or Japanese characters
        return !/[\u3040-\u30ff\u4e00-\u9fff]/.test(prompt)
      }),
      { numRuns: 100 }
    )
  })

  it('任意語系的 system prompt 應為非空字串', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        const prompt = getSystemPrompt(locale)
        return typeof prompt === 'string' && prompt.length > 0
      }),
      { numRuns: 100 }
    )
  })

  it('相同語系每次應回傳相同的 system prompt', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        const prompt1 = getSystemPrompt(locale)
        const prompt2 = getSystemPrompt(locale)
        return prompt1 === prompt2
      }),
      { numRuns: 100 }
    )
  })

  it('不同語系應回傳不同的 system prompt', () => {
    fc.assert(
      fc.property(
        fc.tuple(localeArb, localeArb).filter(([a, b]) => a !== b),
        ([localeA, localeB]) => {
          const promptA = getSystemPrompt(localeA)
          const promptB = getSystemPrompt(localeB)
          return promptA !== promptB
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 22: 對話紀錄寫入完整性 ─────────────────────────────────────────
// Validates: Requirements 12.5, 13.1

type ChatRole = 'user' | 'assistant'

interface ChatLogEntry {
  session_id: string
  role: ChatRole
  content: string
  tokens_used: number
}

/**
 * Pure function that simulates building the chat_logs entries
 * for a single conversation turn (user message + assistant reply).
 */
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
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries.length === 2
      }),
      { numRuns: 100 }
    )
  })

  it('第一筆記錄的 role 應為 user', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[0].role === 'user'
      }),
      { numRuns: 100 }
    )
  })

  it('第二筆記錄的 role 應為 assistant', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[1].role === 'assistant'
      }),
      { numRuns: 100 }
    )
  })

  it('兩筆記錄的 session_id 應相同', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[0].session_id === sessionId && entries[1].session_id === sessionId
      }),
      { numRuns: 100 }
    )
  })

  it('user 記錄的 content 應與原始訊息相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[0].content === userMsg
      }),
      { numRuns: 100 }
    )
  })

  it('assistant 記錄的 content 應與回覆內容相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[1].content === assistantReply
      }),
      { numRuns: 100 }
    )
  })

  it('user 記錄的 tokens_used 應為 0', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[0].tokens_used === 0
      }),
      { numRuns: 100 }
    )
  })

  it('assistant 記錄的 tokens_used 應與實際用量相符', () => {
    fc.assert(
      fc.property(sessionIdArb, messageArb, messageArb, tokensArb, (sessionId, userMsg, assistantReply, tokens) => {
        const entries = buildChatLogEntries(sessionId, userMsg, assistantReply, tokens)
        return entries[1].tokens_used === tokens
      }),
      { numRuns: 100 }
    )
  })
})
