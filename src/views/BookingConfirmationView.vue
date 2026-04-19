<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { useBookingStore } from '@/stores/booking'
import { formatDate } from '@/utils/date'
import { formatCurrency } from '@/utils/currency'
import { getPageMeta } from '@/utils/pageMeta'

const { t, locale } = useI18n()
const route = useRoute()
const bookingStore = useBookingStore()

const meta = getPageMeta('booking-confirmation')
useHead({
  title: meta.title,
  meta: [{ name: 'description', content: meta.description }]
})

const bookingId = computed(() => route.query.bookingId as string | undefined)

const propertyName = computed(() => bookingStore.selectedProperty?.name ?? null)
const roomTypeName = computed(() => bookingStore.selectedRoomType?.name ?? null)
const checkIn = computed(() => bookingStore.checkIn)
const checkOut = computed(() => bookingStore.checkOut)
const totalAmount = computed(() => bookingStore.totalAmount)

const hasDetails = computed(() =>
  !!(bookingId.value || propertyName.value || roomTypeName.value)
)

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return formatDate(d, locale.value)
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 flex items-center justify-center py-16 px-4">
    <div class="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">

      <!-- Success icon -->
      <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100" aria-hidden="true">
        <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 mb-2">
        {{ t('confirmation.title') }}
      </h1>

      <!-- Email sent notice -->
      <p class="text-sm text-gray-500 mb-6">
        {{ t('confirmation.emailSent') }}
      </p>

      <!-- Booking details (when available) -->
      <div v-if="hasDetails" class="text-left rounded-xl bg-gray-50 border border-gray-200 divide-y divide-gray-200 mb-6">

        <!-- Booking ID -->
        <div v-if="bookingId" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('confirmation.bookingId') }}</span>
          <span class="font-mono font-semibold text-gray-900 break-all text-right ml-4">{{ bookingId }}</span>
        </div>

        <!-- Property -->
        <div v-if="propertyName" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('bookingSummary.property') }}</span>
          <span class="font-medium text-gray-900 text-right ml-4">{{ propertyName }}</span>
        </div>

        <!-- Room type -->
        <div v-if="roomTypeName" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('bookingSummary.roomType') }}</span>
          <span class="font-medium text-gray-900 text-right ml-4">{{ roomTypeName }}</span>
        </div>

        <!-- Check-in -->
        <div v-if="checkIn" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('bookingSummary.checkIn') }}</span>
          <span class="font-medium text-gray-900">{{ fmtDate(checkIn) }}</span>
        </div>

        <!-- Check-out -->
        <div v-if="checkOut" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('bookingSummary.checkOut') }}</span>
          <span class="font-medium text-gray-900">{{ fmtDate(checkOut) }}</span>
        </div>

        <!-- Total amount -->
        <div v-if="totalAmount > 0" class="flex justify-between px-4 py-3 text-sm">
          <span class="text-gray-500">{{ t('bookingSummary.total') }}</span>
          <span class="font-bold text-blue-600">{{ formatCurrency(totalAmount) }}</span>
        </div>
      </div>

      <!-- Generic success message when no details available -->
      <div v-else class="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        {{ t('confirmation.title') }}
      </div>

      <!-- Back to home -->
      <RouterLink
        to="/"
        class="inline-block w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {{ t('confirmation.backHome') }}
      </RouterLink>

    </div>
  </main>
</template>
