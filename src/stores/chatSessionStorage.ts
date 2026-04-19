import type { ChatMessage } from '@/types'

const SESSION_STORAGE_KEY = 'chatbot_history'

export function saveMessagesToSession(messages: ChatMessage[]): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages))
}

export function loadMessagesFromSession(): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Array<{ role: string; content: string; timestamp: string }>
    return parsed.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(m.timestamp),
    }))
  } catch {
    return []
  }
}
