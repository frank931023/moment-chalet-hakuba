import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'
import type { ChatMessage } from '@/types'
import { saveMessagesToSession, loadMessagesFromSession } from './chatSessionStorage'
import { supabase, IS_MOCK_MODE } from '@/lib/supabase'

const MOCK_REPLIES: Record<string, string> = {
  'zh-TW': '您好！我是 Moment Chalet Hakuba 的客服助理。這是示範模式，實際上線後我可以回答關於民宿設施、預訂流程、入退房時間等問題。請問有什麼可以幫您的嗎？',
  'en': 'Hello! I\'m the Moment Chalet Hakuba assistant. This is demo mode — once live, I can answer questions about facilities, booking procedures, check-in times, and more. How can I help you?',
  'ja': 'こんにちは！Moment Chalet Hakuba のアシスタントです。これはデモモードです。本番環境では、施設・予約・チェックインなどのご質問にお答えできます。何かお手伝いできることはありますか？',
}

export const useChatStore = defineStore('chat', () => {
  const isOpen = ref(false)
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const sessionId = ref(crypto.randomUUID())

  function toggleWidget() {
    isOpen.value = !isOpen.value
  }

  function loadFromSession() {
    messages.value = loadMessagesFromSession()
  }

  function saveToSession() {
    saveMessagesToSession(messages.value)
  }

  async function sendMessage(content: string): Promise<void> {
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() }
    messages.value.push(userMsg)

    isLoading.value = true
    try {
      if (IS_MOCK_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        const locale = i18n.global.locale.value as string
        const reply = MOCK_REPLIES[locale] ?? MOCK_REPLIES['en']
        messages.value.push({ role: 'assistant', content: reply, timestamp: new Date() })
        saveToSession()
        return
      }

      const locale = i18n.global.locale.value

      const { data, error } = await supabase.functions.invoke<{ reply: string; tokens_used: number }>(
        'chat',
        { body: { session_id: sessionId.value, message: content, locale } }
      )
      if (error) throw error

      messages.value.push({
        role: 'assistant',
        content: data?.reply ?? '',
        timestamp: new Date()
      })
    } catch {
      messages.value.push({
        role: 'assistant',
        content: '暫時無法回覆，請稍後再試',
        timestamp: new Date()
      })
    } finally {
      isLoading.value = false
      saveToSession()
    }
  }

  return {
    isOpen,
    messages,
    isLoading,
    sessionId,
    toggleWidget,
    loadFromSession,
    sendMessage
  }
})
