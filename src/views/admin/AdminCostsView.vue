<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { AzureCostSnapshot, AzureAlert } from '@/types'

// ── State ─────────────────────────────────────────────────────
const snapshots = ref<AzureCostSnapshot[]>([])
const alerts = ref<AzureAlert[]>([])
const isLoading = ref(false)
const fetchError = ref('')

// Budget (USD) — could be made configurable
const BUDGET_USD = 200

// ── Fetch data ────────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  fetchError.value = ''
  try {
    const [snapsRes, alertRes] = await Promise.all([
      supabase
        .from('azure_cost_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false }),
      supabase
        .from('azure_alerts')
        .select('*')
        .order('triggered_at', { ascending: false }),
    ])
    if (snapsRes.error) throw snapsRes.error
    if (alertRes.error) throw alertRes.error
    snapshots.value = snapsRes.data ?? []
    alerts.value = alertRes.data ?? []
  } catch (err: any) {
    fetchError.value = err?.message ?? '載入失敗'
  } finally {
    isLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────
function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastMonthStr(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function thisWeekStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function lastWeekStart(): Date {
  const d = thisWeekStart()
  d.setDate(d.getDate() - 7)
  return d
}

function lastWeekEnd(): Date {
  const d = thisWeekStart()
  d.setDate(d.getDate() - 1)
  return d
}

// ── Computed summaries ────────────────────────────────────────
const currentMonthTotal = computed(() => {
  const cm = currentMonthStr()
  return snapshots.value
    .filter(s => s.snapshot_date.startsWith(cm) && s.period === 'daily')
    .reduce((sum, s) => sum + s.cost_usd, 0)
})

const lastMonthTotal = computed(() => {
  const lm = lastMonthStr()
  return snapshots.value
    .filter(s => s.snapshot_date.startsWith(lm) && s.period === 'daily')
    .reduce((sum, s) => sum + s.cost_usd, 0)
})

// Estimate end-of-month: extrapolate from days elapsed
const estimatedMonthEnd = computed(() => {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  if (dayOfMonth === 0) return currentMonthTotal.value
  return (currentMonthTotal.value / dayOfMonth) * daysInMonth
})

// Budget progress
const budgetPercent = computed(() =>
  Math.min(100, Math.round((currentMonthTotal.value / BUDGET_USD) * 100))
)

const budgetColor = computed(() => {
  if (budgetPercent.value < 50) return 'bg-green-500'
  if (budgetPercent.value < 80) return 'bg-yellow-400'
  return 'bg-red-500'
})

const budgetTextColor = computed(() => {
  if (budgetPercent.value < 50) return 'text-green-700'
  if (budgetPercent.value < 80) return 'text-yellow-700'
  return 'text-red-700'
})

// Cost by service (current month)
const costByService = computed(() => {
  const cm = currentMonthStr()
  const map = new Map<string, number>()
  snapshots.value
    .filter(s => s.snapshot_date.startsWith(cm) && s.period === 'daily')
    .forEach(s => {
      map.set(s.service_name, (map.get(s.service_name) ?? 0) + s.cost_usd)
    })
  const entries = Array.from(map.entries())
    .map(([service, cost]) => ({ service, cost }))
    .sort((a, b) => b.cost - a.cost)
  const maxCost = entries[0]?.cost ?? 1
  return entries.map(e => ({ ...e, barWidth: Math.round((e.cost / maxCost) * 100) }))
})

// Weekly comparison
const thisWeekTotal = computed(() => {
  const start = thisWeekStart()
  return snapshots.value
    .filter(s => {
      const d = new Date(s.snapshot_date)
      return d >= start && s.period === 'daily'
    })
    .reduce((sum, s) => sum + s.cost_usd, 0)
})

const lastWeekTotal = computed(() => {
  const start = lastWeekStart()
  const end = lastWeekEnd()
  return snapshots.value
    .filter(s => {
      const d = new Date(s.snapshot_date)
      return d >= start && d <= end && s.period === 'daily'
    })
    .reduce((sum, s) => sum + s.cost_usd, 0)
})

const weeklyChange = computed(() => {
  if (lastWeekTotal.value === 0) return null
  return ((thisWeekTotal.value - lastWeekTotal.value) / lastWeekTotal.value) * 100
})

function fmtUsd(val: number): string {
  return `$${val.toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW')
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-gray-900">Azure 費用監控</h1>

    <!-- Error -->
    <div
      v-if="fetchError"
      class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ fetchError }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded-xl animate-pulse" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p class="text-xs text-gray-500 mb-1">本月累計費用</p>
          <p class="text-2xl font-bold text-gray-900">{{ fmtUsd(currentMonthTotal) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p class="text-xs text-gray-500 mb-1">上月費用</p>
          <p class="text-2xl font-bold text-gray-900">{{ fmtUsd(lastMonthTotal) }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p class="text-xs text-gray-500 mb-1">預估月底費用</p>
          <p class="text-2xl font-bold text-gray-900">{{ fmtUsd(estimatedMonthEnd) }}</p>
        </div>
      </div>

      <!-- Budget progress -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-gray-700">預算使用進度</p>
          <span class="text-sm font-bold" :class="budgetTextColor">
            {{ budgetPercent }}% ({{ fmtUsd(currentMonthTotal) }} / {{ fmtUsd(BUDGET_USD) }})
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            class="h-3 rounded-full transition-all duration-500"
            :class="budgetColor"
            :style="{ width: budgetPercent + '%' }"
            role="progressbar"
            :aria-valuenow="budgetPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span class="text-yellow-600">50%</span>
          <span class="text-red-600">80%</span>
          <span>100%</span>
        </div>
      </div>

      <!-- Weekly comparison -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">本週 vs 上週費用比較</p>
        <div class="flex gap-6 items-end">
          <div>
            <p class="text-xs text-gray-500 mb-1">本週</p>
            <p class="text-xl font-bold text-gray-900">{{ fmtUsd(thisWeekTotal) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">上週</p>
            <p class="text-xl font-bold text-gray-900">{{ fmtUsd(lastWeekTotal) }}</p>
          </div>
          <div v-if="weeklyChange !== null">
            <p class="text-xs text-gray-500 mb-1">變化</p>
            <p
              class="text-lg font-bold"
              :class="weeklyChange > 0 ? 'text-red-600' : 'text-green-600'"
            >
              {{ weeklyChange > 0 ? '▲' : '▼' }} {{ Math.abs(weeklyChange).toFixed(1) }}%
            </p>
          </div>
        </div>
      </div>

      <!-- Cost by service -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-4">本月費用分類（依服務）</p>
        <div v-if="costByService.length === 0" class="text-sm text-gray-400 py-4 text-center">
          尚無費用資料
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in costByService" :key="item.service" class="flex items-center gap-3">
            <span class="w-40 text-sm text-gray-700 truncate flex-shrink-0">{{ item.service }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                class="h-4 bg-blue-500 rounded-full transition-all duration-500"
                :style="{ width: item.barWidth + '%' }"
              />
            </div>
            <span class="w-16 text-right text-sm font-medium text-gray-700 flex-shrink-0">
              {{ fmtUsd(item.cost) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Alert records -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-4">警示紀錄</p>
        <div v-if="alerts.length === 0" class="text-sm text-gray-400 py-4 text-center">
          尚無警示紀錄
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">觸發時間</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">閾值 (USD)</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">實際費用 (USD)</th>
                <th class="px-4 py-2 text-left font-semibold text-gray-600">訊息</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="alert in alerts" :key="alert.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-gray-600 whitespace-nowrap">{{ fmtDate(alert.triggered_at) }}</td>
                <td class="px-4 py-2 text-gray-700 font-medium">{{ fmtUsd(alert.threshold_usd) }}</td>
                <td class="px-4 py-2 text-red-600 font-medium">{{ fmtUsd(alert.actual_cost_usd) }}</td>
                <td class="px-4 py-2 text-gray-500 text-xs">{{ alert.message ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
