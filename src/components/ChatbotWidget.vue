<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'

const store = useChatStore()
const inputText = ref('')
const messagesEndRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  store.loadFromSession()
})

async function scrollToBottom() {
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.isLoading) return
  inputText.value = ''
  await store.sendMessage(text)
  scrollToBottom()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <!-- Floating toggle button -->
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <!-- Chat window -->
    <div
      v-if="store.isOpen"
      class="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
      style="height: 480px"
    >
      <!-- Header -->
      <div class="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">🤖</span>
          <span class="font-semibold text-sm">Moment Chalet Assistant</span>
        </div>
        <button
          class="text-white hover:text-indigo-200 transition-colors"
          aria-label="Close chat"
          @click="store.toggleWidget()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        <div
          v-for="(msg, idx) in store.messages"
          :key="idx"
          :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
        >
          <div
            :class="[
              'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
            ]"
          >
            <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
            <p :class="['text-xs mt-1', msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400']">
              {{ formatTime(msg.timestamp) }}
            </p>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="store.isLoading" class="flex justify-start">
          <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <div class="flex gap-1 items-center">
              <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
              <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
              <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
            </div>
          </div>
        </div>

        <div ref="messagesEndRef" />
      </div>

      <!-- Input -->
      <div class="px-3 py-3 border-t border-gray-200 bg-white flex gap-2 items-end">
        <textarea
          v-model="inputText"
          rows="1"
          placeholder="Type a message..."
          aria-label="Chat message input"
          class="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-h-24"
          :disabled="store.isLoading"
          @keydown="handleKeydown"
        />
        <button
          class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl p-2 transition-colors flex-shrink-0"
          :disabled="store.isLoading || !inputText.trim()"
          aria-label="Send message"
          @click="handleSend"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Toggle button -->
    <button
      class="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      aria-label="Toggle chat"
      @click="store.toggleWidget()"
    >
      <svg v-if="!store.isOpen" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
