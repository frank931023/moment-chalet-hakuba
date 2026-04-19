// Feature: moment-chalet-booking-system, Property 23: 對話歷史 sessionStorage Round-Trip
import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import type { ChatMessage } from '@/types'
import { saveMessagesToSession, loadMessagesFromSession } from './chatSessionStorage'

/**
 * Validates: Requirements 12.6
 *
 * Property 23: 對話歷史 sessionStorage Round-Trip
 * For any sequence of ChatMessage objects, saving to sessionStorage and loading back
 * should produce the same sequence (same order, same role, same content).
 */

// Arbitrary for a single ChatMessage
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
      { numRuns: 100 }
    )
  })

  it('空訊息陣列 round-trip 後仍為空陣列', () => {
    saveMessagesToSession([])
    const loaded = loadMessagesFromSession()
    expect(loaded).toEqual([])
  })

  it('sessionStorage 無資料時 loadMessagesFromSession 回傳空陣列', () => {
    const loaded = loadMessagesFromSession()
    expect(loaded).toEqual([])
  })

  it('sessionStorage 損毀資料時 loadMessagesFromSession 回傳空陣列', () => {
    sessionStorage.setItem('chatbot_history', 'not-valid-json{{{')
    const loaded = loadMessagesFromSession()
    expect(loaded).toEqual([])
  })
})
