<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/types'

// ── Types ─────────────────────────────────────────────────────
interface IcalRow extends Property {
  last_sync_at: string | null
  sync_status: 'ok' | 'error' | 'never'
  sync_error: string | null
  isSyncing: boolean
}

// ── State ─────────────────────────────────────────────────────
const rows = ref<IcalRow[]>([])
const isLoading = ref(false)
const fetchError = ref('')
const isSyncingAll = ref(false)
const syncAllError = ref('')
const syncAllSuccess = ref(false)

// ── Fetch properties ──────────────────────────────────────────
async function fetchProperties() {
  isLoading.value = true
  fetchError.value = ''
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error

    rows.value = (data ?? []).map((p: Property) => ({
      ...p,
      last_sync_at: null,
      sync_status: 'never' as const,
      sync_error: null,
      isSyncing: false,
    }))

    // Fetch latest sync info from blocked_dates metadata if available
    // (best-effort: check properties table for any sync metadata columns)
    // Properties table may have last_synced_at / sync_error columns added later
    // For now we display what we have
  } catch (err: any) {
    fetchError.value = err?.message ?? '載入失敗'
  } finally {
    isLoading.value = false
  }
}

// ── Sync single property ──────────────────────────────────────
async function syncProperty(row: IcalRow) {
  row.isSyncing = true
  row.sync_error = null
  try {
    const { error } = await supabase.functions.invoke('ical-sync', {
      body: { property_id: row.id },
    })
    if (error) throw error
    row.sync_status = 'ok'
    row.last_sync_at = new Date().toISOString()
  } catch (err: any) {
    row.sync_status = 'error'
    row.sync_error = err?.message ?? '同步失敗'
  } finally {
    row.isSyncing = false
  }
}

// ── Sync all properties ───────────────────────────────────────
async function syncAll() {
  isSyncingAll.value = true
  syncAllError.value = ''
  syncAllSuccess.value = false
  try {
    const { error } = await supabase.functions.invoke('ical-sync', {
      body: { property_id: null },
    })
    if (error) throw error
    const now = new Date().toISOString()
    rows.value.forEach(r => {
      r.sync_status = 'ok'
      r.last_sync_at = now
      r.sync_error = null
    })
    syncAllSuccess.value = true
    setTimeout(() => { syncAllSuccess.value = false }, 3000)
  } catch (err: any) {
    syncAllError.value = err?.message ?? '全部同步失敗'
  } finally {
    isSyncingAll.value = false
  }
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-TW')
}

onMounted(fetchProperties)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">iCal 同步管理</h1>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSyncingAll || isLoading"
        @click="syncAll"
      >
        <svg v-if="isSyncingAll" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>{{ isSyncingAll ? '同步中…' : '全部同步' }}</span>
      </button>
    </div>

    <!-- Success banner -->
    <div
      v-if="syncAllSuccess"
      class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
      role="status"
    >
      全部同步完成
    </div>

    <!-- Errors -->
    <div
      v-if="fetchError"
      class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ fetchError }}
    </div>
    <div
      v-if="syncAllError"
      class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ syncAllError }}
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 bg-gray-200 rounded animate-pulse" />
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">民宿名稱</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">iCal URL</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">最後同步時間</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">狀態</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">錯誤訊息</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="rows.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-gray-400">尚無民宿資料</td>
          </tr>
          <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50 transition-colors">
            <!-- Name -->
            <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{{ row.name }}</td>

            <!-- iCal URL -->
            <td class="px-4 py-3 max-w-xs">
              <span v-if="row.ical_url" class="text-xs text-blue-600 truncate block" :title="row.ical_url">
                {{ row.ical_url }}
              </span>
              <span v-else class="text-xs text-gray-400">未設定</span>
            </td>

            <!-- Last sync -->
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
              {{ formatSyncTime(row.last_sync_at) }}
            </td>

            <!-- Status badge -->
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-700': row.sync_status === 'ok',
                  'bg-red-100 text-red-700': row.sync_status === 'error',
                  'bg-gray-100 text-gray-500': row.sync_status === 'never',
                }"
              >
                {{ row.sync_status === 'ok' ? '成功' : row.sync_status === 'error' ? '錯誤' : '未同步' }}
              </span>
            </td>

            <!-- Error message -->
            <td class="px-4 py-3 text-xs text-red-600 max-w-xs">
              <span v-if="row.sync_error" :title="row.sync_error" class="truncate block">
                {{ row.sync_error }}
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>

            <!-- Sync button -->
            <td class="px-4 py-3 text-right">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="row.isSyncing || !row.ical_url"
                @click="syncProperty(row)"
              >
                <svg v-if="row.isSyncing" class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {{ row.isSyncing ? '同步中…' : '同步' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
