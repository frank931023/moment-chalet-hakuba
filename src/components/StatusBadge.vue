<template>
  <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colorClass]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BookingStatus } from '@/types'

const props = defineProps<{
  status: BookingStatus
}>()

const { t } = useI18n()

const colorClass = computed(() => {
  const map: Record<BookingStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-blue-100 text-blue-800',
  }
  return map[props.status]
})

const label = computed(() => t(`status.${props.status}`))
</script>
