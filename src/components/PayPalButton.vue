<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import type { BookingFormData } from '@/types'

const props = defineProps<{
  amount: number
  currency: 'TWD'
  bookingData: BookingFormData
}>()

const emit = defineEmits<{
  success: [paypalOrderId: string]
  error: [message: string]
  cancel: []
}>()

const isLoading = ref(true)
const containerRef = ref<HTMLDivElement | null>(null)

const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL
const paypalClientId = (import.meta as unknown as { env: Record<string, string> }).env.VITE_PAYPAL_CLIENT_ID

async function createBookingAndOrder(): Promise<string> {
  // Create pending booking first
  const bookingRes = await axios.post<{ booking_id: string }>(
    `${supabaseUrl}/functions/v1/bookings`,
    props.bookingData
  )
  const bookingId = bookingRes.data.booking_id

  // Create PayPal order
  const orderRes = await axios.post<{ paypal_order_id: string }>(
    `${supabaseUrl}/functions/v1/paypal-create-order`,
    { booking_id: bookingId, amount: props.amount, currency: props.currency }
  )

  // Store booking_id for capture step
  currentBookingId.value = bookingId
  return orderRes.data.paypal_order_id
}

const currentBookingId = ref<string>('')

function renderPayPalButtons() {
  if (!containerRef.value) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paypal = (window as any).paypal
  if (!paypal) {
    emit('error', 'PayPal SDK failed to load')
    return
  }

  paypal.Buttons({
    createOrder: async () => {
      try {
        return await createBookingAndOrder()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create order'
        emit('error', msg)
        throw err
      }
    },
    onApprove: async (data: { orderID: string }) => {
      try {
        await axios.post(`${supabaseUrl}/functions/v1/paypal-capture-order`, {
          booking_id: currentBookingId.value,
          paypal_order_id: data.orderID
        })
        emit('success', data.orderID)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to capture payment'
        emit('error', msg)
      }
    },
    onError: (err: Error) => {
      emit('error', err?.message ?? 'PayPal error')
    },
    onCancel: () => {
      emit('cancel')
    }
  }).render(containerRef.value)
}

onMounted(() => {
  const script = document.createElement('script')
  script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=${props.currency}`
  script.onload = () => {
    isLoading.value = false
    renderPayPalButtons()
  }
  script.onerror = () => {
    isLoading.value = false
    emit('error', 'Failed to load PayPal SDK')
  }
  document.head.appendChild(script)
})
</script>

<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center py-4 text-gray-500">
      <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>Loading PayPal...</span>
    </div>
    <div ref="containerRef" />
  </div>
</template>
