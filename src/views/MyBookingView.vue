<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDate } from '@/utils/date'
import { formatCurrency } from '@/utils/currency'
import { getPageMeta } from '@/utils/pageMeta'
import type { Booking, BookingStatus } from '@/types'

const { t, locale } = useI18n()

const meta = getPageMeta('my-booking')
useHead({
  title: meta.title,
  meta: [{ name: 'description', content: meta.description }]
})

// ── Form state ───────────────────────────────────────────────
const emailInput = ref('')
const bookingIdInput = ref('')
const isSearching = ref(false)
const searchError = ref('')

// ── Result state ─────────────────────────────────────────────
interface BookingResult extends Booking {
  room_type_name?: string
  property_name?: string
}

const result = ref<BookingResult | null>(null)
const notFound = ref(false)

// ── Refund state ─────────────────────────────────────────────
const showRefundDialog = ref(false)
const isRefunding = ref(false)
const refundError = ref('')
const refundSuccess = ref(false)

// ── Helpers ──────────────────────────────────────────────────
const REFUND_DAYS = 7 // refund allowed within 7 days before check-in

function isRefundEligible(booking: BookingResult): boolean {
  if (booking.status !== 'confirmed') return false
  const checkInDate = new Date(booking.check_in)
  const now = new Date()
  const diffDays = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  // Check-in must be in the future and within the refund window
  return diffDays > 0 && diffDays <= REFUND_DAYS
}

function fmtDate(dateStr: string): string {
  return formatDate(new Date(dateStr), locale.value)
}

// ── Search ───────────────────────────────────────────────────
async function handleSearch() {
  searchError.value = ''
  result.value = null
  notFound.value = false
  refundSuccess.value = false
  refundError.value = ''

  const email = emailInput.value.trim()
  const id = bookingIdInput.value.trim()

  if (!email || !id) {
    searchError.value = t('error.required')
    return
  }

  isSearching.value = true
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        room_types (
          name,
          properties (
            name
          )
        )
      `)
      .eq('guest_email', email)
      .eq('id', id)
      .single()

    if (error || !data) {
      notFound.value = true
      return
    }

    // Flatten joined names
    const roomType = (data as any).room_types
    result.value = {
      ...data,
      room_type_name: roomType?.name ?? undefined,
      property_name: roomType?.properties?.name ?? undefined,
    } as BookingResult
  } catch {
    notFound.value = true
  } finally {
    isSearching.value = false
  }
}

// ── Refund ───────────────────────────────────────────────────
function openRefundDialog() {
  showRefundDialog.value = true
  refundError.value = ''
}

function cancelRefund() {
  showRefundDialog.value = false
}

async function confirmRefund() {
  if (!result.value?.paypal_capture_id) {
    refundError.value = t('error.networkError')
    return
  }

  isRefunding.value = true
  refundError.value = ''

  try {
    const { error } = await supabase.functions.invoke('paypal-refund', {
      body: {
        paypal_capture_id: result.value.paypal_capture_id,
        booking_id: result.value.id,
      }
    })

    if (error) throw error

    refundSuccess.value = true
    showRefundDialog.value = false
    // Update local status
    if (result.value) {
      result.value = { ...result.value, status: 'refunded' as BookingStatus }
    }
  } catch {
    refundError.value = t('error.networkError')
  } finally {
    isRefunding.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-lg mx-auto">

      <h1 class="text-2xl font-bold text-gray-900 mb-8 text-center">
        {{ t('myBooking.title') }}
      </h1>

      <!-- Search form -->
      <form
        class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 mb-6"
        novalidate
        @submit.prevent="handleSearch"
      >
        <!-- Email -->
        <div>
          <label for="lookup-email" class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('myBooking.emailLabel') }}
          </label>
          <input
            id="lookup-email"
            v-model="emailInput"
            type="email"
            autocomplete="email"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            :placeholder="t('myBooking.emailLabel')"
          />
        </div>

        <!-- Booking ID -->
        <div>
          <label for="lookup-booking-id" class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('myBooking.bookingIdLabel') }}
          </label>
          <input
            id="lookup-booking-id"
            v-model="bookingIdInput"
            type="text"
            autocomplete="off"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            :placeholder="t('myBooking.bookingIdLabel')"
          />
        </div>

        <!-- Validation error -->
        <p v-if="searchError" class="text-xs text-red-600" role="alert">{{ searchError }}</p>

        <!-- Search button -->
        <button
          type="submit"
          class="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSearching"
        >
          <span v-if="isSearching" class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {{ t('myBooking.search') }}
          </span>
          <span v-else>{{ t('myBooking.search') }}</span>
        </button>
      </form>

      <!-- Not found -->
      <div
        v-if="notFound"
        class="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800"
        role="alert"
      >
        {{ t('myBooking.notFound') }}
      </div>

      <!-- Booking result -->
      <div v-if="result" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <!-- Header with status -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span class="text-sm font-semibold text-gray-700">{{ t('confirmation.bookingId') }}</span>
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-gray-500 break-all">{{ result.id }}</span>
            <StatusBadge :status="result.status" />
          </div>
        </div>

        <!-- Details -->
        <dl class="divide-y divide-gray-100">
          <div v-if="result.property_name" class="flex justify-between px-6 py-3 text-sm">
            <dt class="text-gray-500">{{ t('bookingSummary.property') }}</dt>
            <dd class="font-medium text-gray-900 text-right ml-4">{{ result.property_name }}</dd>
          </div>

          <div v-if="result.room_type_name" class="flex justify-between px-6 py-3 text-sm">
            <dt class="text-gray-500">{{ t('bookingSummary.roomType') }}</dt>
            <dd class="font-medium text-gray-900 text-right ml-4">{{ result.room_type_name }}</dd>
          </div>

          <div class="flex justify-between px-6 py-3 text-sm">
            <dt class="text-gray-500">{{ t('bookingSummary.checkIn') }}</dt>
            <dd class="font-medium text-gray-900">{{ fmtDate(result.check_in) }}</dd>
          </div>

          <div class="flex justify-between px-6 py-3 text-sm">
            <dt class="text-gray-500">{{ t('bookingSummary.checkOut') }}</dt>
            <dd class="font-medium text-gray-900">{{ fmtDate(result.check_out) }}</dd>
          </div>

          <div class="flex justify-between px-6 py-3 text-sm">
            <dt class="text-gray-500">{{ t('bookingSummary.total') }}</dt>
            <dd class="font-bold text-blue-600">{{ formatCurrency(result.total_amount) }}</dd>
          </div>
        </dl>

        <!-- Refund success notice -->
        <div
          v-if="refundSuccess"
          class="mx-6 mb-4 mt-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800"
          role="status"
        >
          {{ t('status.refunded') }}
        </div>

        <!-- Refund error -->
        <div
          v-if="refundError"
          class="mx-6 mb-4 mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {{ refundError }}
        </div>

        <!-- Refund button -->
        <div v-if="isRefundEligible(result)" class="px-6 pb-5 pt-2">
          <button
            type="button"
            class="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            @click="openRefundDialog"
          >
            {{ t('myBooking.requestRefund') }}
          </button>
        </div>
      </div>

    </div>

    <!-- Refund confirmation dialog -->
    <Teleport to="body">
      <div
        v-if="showRefundDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-dialog-title"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
          <h2 id="refund-dialog-title" class="text-base font-bold text-gray-900 mb-2">
            {{ t('myBooking.requestRefund') }}
          </h2>
          <p class="text-sm text-gray-600 mb-6">
            {{ t('myBooking.refundConfirm') }}
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              :disabled="isRefunding"
              @click="cancelRefund"
            >
              {{ t('booking.back') }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isRefunding"
              @click="confirmRefund"
            >
              <span v-if="isRefunding" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </span>
              <span v-else>{{ t('myBooking.requestRefund') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </main>
</template>
