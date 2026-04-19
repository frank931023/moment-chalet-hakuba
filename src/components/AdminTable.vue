<template>
  <div class="w-full">
    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-10 bg-gray-200 rounded animate-pulse" />
    </div>

    <template v-else>
      <!-- Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                :class="col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''"
                @click="col.sortable ? toggleSort(col.key) : undefined"
              >
                <span class="flex items-center gap-1">
                  {{ col.label }}
                  <span v-if="col.sortable" class="text-gray-400">
                    <span v-if="sortKey === col.key && sortDir === 'asc'">↑</span>
                    <span v-else-if="sortKey === col.key && sortDir === 'desc'">↓</span>
                    <span v-else class="opacity-40">↕</span>
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="pagedRows.length === 0">
              <td :colspan="columns.length" class="px-4 py-8 text-center text-gray-400 text-sm">
                No data
              </td>
            </tr>
            <tr
              v-for="(row, idx) in pagedRows"
              :key="idx"
              class="hover:bg-gray-50 transition-colors"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 px-1">
        <span class="text-sm text-gray-500">
          {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, sortedData.length) }}
          / {{ sortedData.length }}
        </span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ← Prev
          </button>
          <button
            class="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            Next →
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
}

const props = defineProps<{
  columns: Column[]
  data: Record<string, unknown>[]
  loading?: boolean
}>()

const emit = defineEmits<{
  sort: [{ key: string; direction: 'asc' | 'desc' }]
}>()

const PAGE_SIZE = 10

const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

// Reset page when data changes
watch(() => props.data, () => { currentPage.value = 1 })

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
  emit('sort', { key: sortKey.value!, direction: sortDir.value })
}

const sortedData = computed(() => {
  if (!sortKey.value) return props.data
  return [...props.data].sort((a, b) => {
    const av = a[sortKey.value!]
    const bv = b[sortKey.value!]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedData.value.length / PAGE_SIZE)))

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedData.value.slice(start, start + PAGE_SIZE)
})
</script>
