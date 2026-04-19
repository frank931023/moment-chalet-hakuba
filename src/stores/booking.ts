import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Property, RoomType, BookingStep } from '@/types'

// Pure function for testability
export function calculateBookingTotal(params: {
  pricePerNight: number
  breakfastPrice: number
  checkIn: Date
  checkOut: Date
  includeBreakfast: boolean
}): number {
  const { pricePerNight, breakfastPrice, checkIn, checkOut, includeBreakfast } = params
  const diff = checkOut.getTime() - checkIn.getTime()
  const nights = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  if (nights === 0) return 0
  return includeBreakfast
    ? (pricePerNight + breakfastPrice) * nights
    : pricePerNight * nights
}

export const useBookingStore = defineStore('booking', () => {
  const step = ref<BookingStep>(1)
  const selectedProperty = ref<Property | null>(null)
  const selectedRoomType = ref<RoomType | null>(null)
  const checkIn = ref<Date | null>(null)
  const checkOut = ref<Date | null>(null)
  const includeBreakfast = ref(false)
  const guestName = ref('')
  const guestEmail = ref('')
  const guestPhone = ref('')
  const specialRequests = ref('')
  const totalAmount = ref(0)

  const isStep1Complete = computed(() =>
    checkIn.value !== null &&
    checkOut.value !== null &&
    checkOut.value > checkIn.value &&
    selectedRoomType.value !== null
  )

  const isStep2Complete = computed(() =>
    guestName.value.trim() !== '' &&
    guestEmail.value.trim() !== '' &&
    guestPhone.value.trim() !== ''
  )

  function setStep(s: BookingStep) {
    step.value = s
  }

  function calculateTotal(): number {
    if (!selectedRoomType.value || !checkIn.value || !checkOut.value) {
      totalAmount.value = 0
      return 0
    }
    const amount = calculateBookingTotal({
      pricePerNight: selectedRoomType.value.price_per_night,
      breakfastPrice: selectedRoomType.value.breakfast_price,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      includeBreakfast: includeBreakfast.value,
    })
    totalAmount.value = amount
    return amount
  }

  function reset() {
    step.value = 1
    selectedProperty.value = null
    selectedRoomType.value = null
    checkIn.value = null
    checkOut.value = null
    includeBreakfast.value = false
    guestName.value = ''
    guestEmail.value = ''
    guestPhone.value = ''
    specialRequests.value = ''
    totalAmount.value = 0
  }

  return {
    step,
    selectedProperty,
    selectedRoomType,
    checkIn,
    checkOut,
    includeBreakfast,
    guestName,
    guestEmail,
    guestPhone,
    specialRequests,
    totalAmount,
    isStep1Complete,
    isStep2Complete,
    setStep,
    calculateTotal,
    reset,
  }
})
