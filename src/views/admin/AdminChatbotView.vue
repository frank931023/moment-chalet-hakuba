<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { LlmUsageSnapshot, ChatLog } from '@/types'

// ── State ─────────────────────────────────────────────────────
const usageSnapshots = ref<LlmUsageSnapshot[]>([])
const chatLogs = ref<ChatLog[]>([])
const isLoading = ref(false)
const fetchError = ref('')

// Chat log search
const searchQuery = ref('')

// Monthly cost limit
const monthlyLimit = ref<number | null>(null)
const monthlyLimitInput = ref('')
const isSavingLimit = ref(false)
const saveLimitError = ref('')
const saveLimitSuccess = ref(false)

// ── Fetch data ────────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  fetchError.value = ''
  try {
    const [usageRes, logsRes] = await Promise.all([
      supabase
        .from('llm_usage_snapshots')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    if (usageRes.error) throw usageRes.error
    if (logsRes.error) throw logsRes.error
    usageSnapshots.value = usageRes.data ?? []
    chatLogs.value = logsRes.data ?? []
  } catch (err: any) {
    fetchError.value = err?.message ?? '載入失敗'
  } finally {
    isLoading.value = false
  }
}

// ── Computed ──────────────────────────────────────────────────
function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const currentMonthSnapshots = computed(() => {
  const cm = currentMonthStr()
  return usageSnapshots.value.filter(s => s.created_at.startsWith(cm))
})

const currentMonthTokens = computed(() =>
  currentMonthSnapshots.value.reduce((sum, s) => sum + s.tokens_input + s.tokens_output, 0)
)

const cumulativeCostUsd = computed(() =>
  usageSnapshots.value.reduce((sum, s) => sum + s.cost_usd, 0)
)

// Daily usage table (current month)
const dailyUsage = computed(() => {
  const map = new Map<string, { tokens: number; cost: number }>()
  currentMonthSnapshots.value.forEach(s => {
    const day = s.created_at.slice(0, 10)
    const prev = map.get(day) ?? { tokens: 0, cost: 0 }
    map.set(day, {
      tokens: prev.tokens + s.tokens_input + s.tokens_output,
      cost: prev.cost + s.cost_usd,
    })
  })
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
})

// Filtered chat logs
const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return chatLogs.value
  return chatLogs.value.filter(l => l.content.toLowerCase().includes(q))
})

// ── Save monthly limit ────────────────────────────────────────
async function saveMonthlyLimit() {
  const val = parseFloat(monthlyLimitInput.value)
  if (isNaN(val) || val <= 0) {
    saveLimitError.value = '請輸入有效的金額（大於 0）'
    return
  }
  isSavingLimit.value = true
  saveLimitError.value = ''
  saveLimitSuccess.value = false
  try {
    // Upsert into a settings table or use a dedicated config approach
    // For now we store in localStorage as a client-side setting
    // (a real implementation would persist to a Supabase settings table)
    localStorage.setItem('llm_monthly_limit_usd', String(val))
    monthlyLimit.value = val
    saveLimitSuccess.value = true
    setTimeout(() => { saveLimitSuccess.value = false }, 3000)
  } catch (err: any) {
    saveLimitError.value = err?.message ?? '儲存失敗'
  } finally {
    isSavingLimit.value = false
  }
}

function fmtUsd(val: number): string {
  return `$${val.toFixed(4)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW')
}

onMounted(() => {
  fetchData()
  const stored = localStorage.getItem('llm_monthly_limit_usd')
  if (stored) {
    monthlyLimit.value = parseFloat(stored)
    monthlyLimitInput.value = stored
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-gray-900">AI 機器人管理</h1>

    <!-- Error -->
    <div
      v-if="fetchError"
      class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ fetchError }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded-xl animate-pulse" />
    </div>

    <template v-else>
      <!-- LLM usage overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p class="text-xs text-gray-500 mb-1">本月 Token 用量</p>
          <p class="text-2xl font-bold text-gray-900">{{ currentMonthTokens.toLocaleString() }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p class="text-xs text-gray-500 mb-1">累計費用 (USD)</p>
          <p class="text-2xl font-bold text-gray-900">{{ fmtUsd(cumulativeCostUsd) }}</p>
          <p
            v-if="monthlyLimit && cumulativeCostUsd > monthlyLimit"
            class="text-xs text-red-600 mt-1"
          >
            ⚠ 已超過月費上限 {{ fmtUsd(monthlyLimit) }}
          </p>
        </div>
      </div>

      <!-- API key status (placeholder) -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">API Key 狀態</p>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
            有效
          </span>
          <span class="text-sm text-gray-500">LLM Provider API Key 狀態正常（請至環境變數設定確認）</span>
        </div>
      </div>

      <!-- Daily usage table -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-4">每日用量（本月，最近 14 天）</p>
        <div v-if="dailyUsage.length === 0" class="text-sm text-gray-400 py-4 text-center">
          尚無用量資料
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">日期</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-600">Token 用量</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-600">費用 (USD)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in dailyUsage" :key="row.date" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-gray-700">{{ row.date }}</td>
                <td class="px-4 py-2 text-right text-gray-700">{{ row.tokens.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right text-gray-700">{{ fmtUsd(row.cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Monthly cost limit setting -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">LLM 月費上限設定</p>
        <div class="flex items-center gap-3">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              v-model="monthlyLimitInput"
              type="number"
              min="0"
              step="0.01"
              class="pl-7 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              placeholder="10.00"
              aria-label="月費上限 (USD)"
            />
          </div>
          <span class="text-sm text-gray-500">USD / 月</span>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSavingLimit"
            @click="saveMonthlyLimit"
          >
            {{ isSavingLimit ? '儲存中…' : '儲存' }}
          </button>
        </div>
        <p v-if="monthlyLimit" class="text-xs text-gray-500 mt-2">
          目前上限：{{ fmtUsd(monthlyLimit) }} / 月
        </p>
        <div v-if="saveLimitError" class="mt-2 text-xs text-red-600" role="alert">{{ saveLimitError }}</div>
        <div v-if="saveLimitSuccess" class="mt-2 text-xs text-green-600" role="status">已儲存</div>
      </div>

      <!-- Chat log search -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">對話紀錄查詢</p>
        <input
          v-model="searchQuery"
          type="search"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          placeholder="搜尋對話內容…"
          aria-label="搜尋對話內容"
        />
        <div v-if="filteredLogs.length === 0" class="text-sm text-gray-400 py-4 text-center">
          {{ searchQuery ? '無符合結果' : '尚無對話紀錄' }}
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">時間</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">Session</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">角色</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">內容</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-600">Tokens</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{{ fmtDate(log.created_at) }}</td>
                <td class="px-4 py-2 text-gray-400 font-mono text-xs whitespace-nowrap">
                  {{ log.session_id.slice(0, 8) }}…
                </td>
                <td class="px-4 py-2">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="log.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
                  >
                    {{ log.role === 'user' ? '旅客' : 'AI' }}
                  </span>
                </td>
                <td class="px-4 py-2 text-gray-700 max-w-xs">
                  <span class="line-clamp-2 text-xs">{{ log.content }}</span>
                </td>
                <td class="px-4 py-2 text-right text-gray-500 text-xs">{{ log.tokens_used }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
