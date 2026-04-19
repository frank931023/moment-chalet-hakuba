<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase, IS_MOCK_MODE } from '@/lib/supabase'
import AdminTable from '@/components/AdminTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDate } from '@/utils/date'
import { formatCurrency } from '@/utils/currency'
import type { Booking, BookingStatus } from '@/types'
import { MOCK_BOOKINGS } from '@/mock/data'

const { t, locale } = useI18n()

// ── Types ────────────────────────────────────────────────────
interface BookingRow extends Booking {
  property_name?: string
}

// ── State ────────────────────────────────────────────────────
const bookings = ref<BookingRow[]>([])
const isLoading = ref(false)
const fetchError = ref('')

const statusFilter = ref<BookingStatus | 'all'>('all')
const keyword = ref('')

// ── Refund state ─────────────────────────────────────────────
const selectedBooking = ref<BookingRow | null>(null)
const showRefundDialog = ref(false)
const isRefunding = ref(false)
const refundError = ref('')

// ── Table columns ─────────────────────────────────────────────
const columns = [
  { key: 'id', label: t('confirmation.bookingId'), sortable: false },
  { key: 'guest_name', label: t('booking.guestName'), sortable: true },
  { key: 'guest_email', label: t('booking.email'), sortable: true },
  { key: 'check_in', label: t('booking.checkIn'), sortable: true },
  { key: 'check_out', label: t('booking.checkOut'), sortable: true },
  { key: 'total_amount', label: t('bookingSummary.total'), sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: '', sortable: false },
]

// ── Status filter options ─────────────────────────────────────
const statusOptions: Array<{ value: BookingStatus | 'all'; label: string }> = [
  { value: 'all', label: t('admin.allStatuses') },
  { value: 'pending', label: t('status.pending') },
  { value: 'confirmed', label: t('status.confirmed') },
  { value: 'cancelled', label: t('status.cancelled') },
  { value: 'refunded', label: t('status.refunded') },
]

// ── Filtered data ─────────────────────────────────────────────
const filteredBookings = computed(() => {
  let list = bookings.value

  if (statusFilter.value !== 'all') {
    list = list.filter(b => b.status === statusFilter.value)
  }

  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(b =>
      b.guest_name.toLowerCase().includes(kw) ||
      b.guest_email.toLowerCase().includes(kw)
    )
  }

  return list
})

// ── Table data (flatten for AdminTable) ───────────────────────
const tableData = computed(() =>
  filteredBookings.value.map(b => ({ ...b } as Record<string, unknown>))
)

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(dateStr: string): string {
  return formatDate(new Date(dateStr), locale.value)
}

function shortId(id: string): string {
  return id.slice(0, 8) + '…'
}

// ── Fetch bookings ────────────────────────────────────────────
async function fetchBookings() {
  isLoading.value = true
  fetchError.value = ''
  try {
    if (IS_MOCK_MODE) {
      bookings.value = MOCK_BOOKINGS as BookingRow[]
      return
    }

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
      .order('created_at', { ascending: false })

    if (error) throw error

    bookings.value = (data ?? []).map((row: any) => ({
      ...row,
      property_name: row.room_types?.properties?.name ?? undefined,
    })) as BookingRow[]
  } catch (err: any) {
    fetchError.value = err?.message ?? t('error.networkError')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchBookings)

// ── Refund ────────────────────────────────────────────────────
function openRefund(booking: BookingRow) {
  selectedBooking.value = booking
  refundError.value = ''
  showRefundDialog.value = true
}

function cancelRefund() {
  showRefundDialog.value = false
  selectedBooking.value = null
}

async function confirmRefund() {
  const booking = selectedBooking.value
  if (!booking?.paypal_capture_id) {
    refundError.value = t('error.networkError')
    return
  }

  isRefunding.value = true
  refundError.value = ''

  try {
    const { error } = await supabase.functions.invoke('paypal-refund', {
      body: {
        booking_id: booking.id,
        paypal_capture_id: booking.paypal_capture_id,
      },
    })

    if (error) throw error

    // Update local status
    const idx = bookings.value.findIndex(b => b.id === booking.id)
    if (idx !== -1) {
      bookings.value[idx] = { ...bookings.value[idx], status: 'refunded' as BookingStatus }
    }

    showRefundDialog.value = false
    selectedBooking.value = null
  } catch (err: any) {
    refundError.value = err?.message ?? t('error.networkError')
  } finally {
    isRefunding.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page title -->
    <h1 class="text-xl font-bold text-gray-900">{{ $t('admin.bookings') }}</h1>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Status filter -->
      <select
        v-model="statusFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Filter by status"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- Keyword search -->
      <input
        v-model="keyword"
        type="search"
        class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        :placeholder="$t('admin.searchBookings')"
        aria-label="Search by guest name or email"
      />
    </div>

    <!-- Fetch error -->
    <div
      v-if="fetchError"
      class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ fetchError }}
    </div>

    <!-- Table -->
    <AdminTable :columns="columns" :data="tableData" :loading="isLoading">
      <!-- Booking ID -->
      <template #cell-id="{ value }">
        <span class="font-mono text-xs text-gray-500" :title="String(value)">
          {{ shortId(String(value)) }}
        </span>
      </template>

      <!-- Check-in -->
      <template #cell-check_in="{ value }">
        {{ fmtDate(String(value)) }}
      </template>

      <!-- Check-out -->
      <template #cell-check_out="{ value }">
        {{ fmtDate(String(value)) }}
      </template>

      <!-- Total amount -->
      <template #cell-total_amount="{ value }">
        {{ formatCurrency(Number(value)) }}
      </template>

      <!-- Status badge -->
      <template #cell-status="{ value }">
        <StatusBadge :status="value as BookingStatus" />
      </template>

      <!-- Actions -->
      <template #cell-actions="{ row }">
        <button
          v-if="(row as BookingRow).status === 'confirmed'"
          type="button"
          class="rounded px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          @click="openRefund(row as BookingRow)"
        >
          {{ $t('admin.refund') }}
        </button>
      </template>
    </AdminTable>
  </div>

  <!-- Refund confirmation dialog -->
  <Teleport to="body">
    <div
      v-if="showRefundDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-refund-dialog-title"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <h2 id="admin-refund-dialog-title" class="text-base font-bold text-gray-900 mb-2">
          {{ $t('admin.refundConfirm') }}
        </h2>

        <p v-if="selectedBooking" class="text-sm text-gray-600 mb-1">
          {{ selectedBooking.guest_name }} ({{ selectedBooking.guest_email }})
        </p>
        <p class="text-sm text-gray-500 mb-6">
          {{ $t('admin.refundConfirmDesc') }}
        </p>

        <!-- Error -->
        <div
          v-if="refundError"
          class="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
          role="alert"
        >
          {{ refundError }}
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            :disabled="isRefunding"
            @click="cancelRefund"
          >
            {{ $t('booking.back') }}
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
            <span v-else>{{ $t('admin.refund') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
