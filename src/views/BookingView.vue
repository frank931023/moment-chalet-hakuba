<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { useBookingStore } from '@/stores/booking'
import DateRangePicker from '@/components/DateRangePicker.vue'
import BookingSummary from '@/components/BookingSummary.vue'
import PayPalButton from '@/components/PayPalButton.vue'
import type { BookingFormData } from '@/types'
import { getPageMeta } from '@/utils/pageMeta'

const { t } = useI18n()
const router = useRouter()
const bookingStore = useBookingStore()

const meta = getPageMeta('booking')
useHead({
  title: meta.title,
  meta: [{ name: 'description', content: meta.description }]
})

// ── Redirect if no room type selected ───────────────────────
onMounted(() => {
  if (!bookingStore.selectedRoomType) {
    router.replace('/properties')
  }
})

// ── Step navigation ──────────────────────────────────────────
const currentStep = computed(() => bookingStore.step)

function goToStep2() {
  if (bookingStore.isStep1Complete) {
    bookingStore.calculateTotal()
    bookingStore.setStep(2)
  }
}

function goToStep3() {
  if (bookingStore.isStep2Complete) {
    bookingStore.setStep(3)
  }
}

function goBack() {
  if (currentStep.value === 2) bookingStore.setStep(1)
  else if (currentStep.value === 3) bookingStore.setStep(2)
}

// ── Step 1: date range binding ───────────────────────────────
const dateRange = computed({
  get() {
    return {
      checkIn: bookingStore.checkIn,
      checkOut: bookingStore.checkOut
    }
  },
  set(val: { checkIn: Date | null; checkOut: Date | null }) {
    bookingStore.checkIn = val.checkIn
    bookingStore.checkOut = val.checkOut
  }
})

// ── Step 2: form validation ──────────────────────────────────
const nameError = ref('')
const emailError = ref('')
const phoneError = ref('')

function validateStep2(): boolean {
  nameError.value = ''
  emailError.value = ''
  phoneError.value = ''

  let valid = true
  if (!bookingStore.guestName.trim()) {
    nameError.value = t('error.required')
    valid = false
  }
  if (!bookingStore.guestEmail.trim()) {
    emailError.value = t('error.required')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingStore.guestEmail)) {
    emailError.value = t('error.invalidEmail')
    valid = false
  }
  if (!bookingStore.guestPhone.trim()) {
    phoneError.value = t('error.required')
    valid = false
  }
  return valid
}

function handleNextFromStep2() {
  if (validateStep2()) {
    goToStep3()
  }
}

// ── Step 3: PayPal events ────────────────────────────────────
const paymentError = ref('')
const paymentCancelled = ref(false)

function handlePaymentSuccess(_orderId: string) {
  bookingStore.reset()
  router.push('/booking/confirmation')
}

function handlePaymentError(message: string) {
  paymentError.value = message
  paymentCancelled.value = false
}

function handlePaymentCancel() {
  paymentCancelled.value = true
  paymentError.value = ''
}

// ── BookingFormData for PayPal ───────────────────────────────
const bookingFormData = computed<BookingFormData>(() => ({
  room_type_id: bookingStore.selectedRoomType?.id ?? '',
  guest_name: bookingStore.guestName,
  guest_email: bookingStore.guestEmail,
  guest_phone: bookingStore.guestPhone,
  check_in: bookingStore.checkIn?.toISOString().split('T')[0] ?? '',
  check_out: bookingStore.checkOut?.toISOString().split('T')[0] ?? '',
  include_breakfast: bookingStore.includeBreakfast,
  total_amount: bookingStore.totalAmount,
  special_requests: bookingStore.specialRequests || undefined
}))

// Recalculate total when breakfast toggle changes
watch(() => bookingStore.includeBreakfast, () => {
  bookingStore.calculateTotal()
})
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-2xl mx-auto">

      <!-- Step indicator -->
      <nav aria-label="Booking steps" class="mb-8">
        <ol class="flex items-center justify-center gap-0">
          <li
            v-for="n in [1, 2, 3]"
            :key="n"
            class="flex items-center"
          >
            <div class="flex flex-col items-center">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors"
                :class="
                  currentStep === n
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : currentStep > n
                      ? 'bg-blue-100 border-blue-400 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-400'
                "
                :aria-current="currentStep === n ? 'step' : undefined"
              >
                {{ n }}
              </div>
              <span
                class="mt-1 text-xs hidden sm:block"
                :class="currentStep === n ? 'text-blue-600 font-medium' : 'text-gray-400'"
              >
                {{ t(`booking.step${n}`) }}
              </span>
            </div>
            <div
              v-if="n < 3"
              class="w-16 sm:w-24 h-0.5 mx-1 mb-4"
              :class="currentStep > n ? 'bg-blue-400' : 'bg-gray-200'"
              aria-hidden="true"
            />
          </li>
        </ol>
      </nav>

      <!-- ── Step 1: Date & Room ── -->
      <section v-if="currentStep === 1" aria-labelledby="step1-heading">
        <h1 id="step1-heading" class="text-xl font-bold text-gray-900 mb-6">
          {{ t('booking.step1') }}
        </h1>

        <!-- No room selected fallback -->
        <div
          v-if="!bookingStore.selectedRoomType"
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm mb-6"
          role="alert"
        >
          {{ t('booking.noRoomSelected', '請先返回民宿頁面選擇房型。') }}
          <RouterLink to="/properties" class="ml-2 underline font-medium text-yellow-900 hover:text-yellow-700">
            {{ t('nav.properties') }}
          </RouterLink>
        </div>

        <!-- Selected room info -->
        <div
          v-else
          class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6"
        >
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {{ t('booking.summary') }}
          </h2>
          <div class="flex justify-between items-start gap-4">
            <div>
              <p class="font-semibold text-gray-900">{{ bookingStore.selectedRoomType.name }}</p>
              <p class="text-sm text-gray-500 mt-0.5">
                {{ t('roomCard.capacity', { n: bookingStore.selectedRoomType.capacity }) }}
              </p>
            </div>
            <p class="text-blue-600 font-bold whitespace-nowrap">
              TWD {{ bookingStore.selectedRoomType.price_per_night.toLocaleString() }}
              <span class="text-xs font-normal text-gray-500">/ {{ t('property.perNight').replace('/ ', '') }}</span>
            </p>
          </div>

          <!-- Breakfast toggle (if property has breakfast option) -->
          <div
            v-if="bookingStore.selectedProperty?.has_breakfast_option"
            class="mt-4 flex items-center gap-3"
          >
            <span class="text-sm text-gray-700">{{ t('roomCard.breakfastOption') }}</span>
            <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                type="button"
                class="px-3 py-1.5 transition-colors"
                :class="bookingStore.includeBreakfast ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
                @click="bookingStore.includeBreakfast = true"
              >
                {{ t('booking.includeBreakfast') }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 transition-colors"
                :class="!bookingStore.includeBreakfast ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
                @click="bookingStore.includeBreakfast = false"
              >
                {{ t('booking.excludeBreakfast') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Date range picker -->
        <div v-if="bookingStore.selectedRoomType" class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <DateRangePicker
            :property-id="bookingStore.selectedProperty?.id ?? bookingStore.selectedRoomType.property_id"
            v-model="dateRange"
          />
        </div>

        <!-- Next button -->
        <div class="flex justify-end">
          <button
            type="button"
            class="px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="bookingStore.isStep1Complete
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
            :disabled="!bookingStore.isStep1Complete"
            @click="goToStep2"
          >
            {{ t('booking.next') }}
          </button>
        </div>
      </section>

      <!-- ── Step 2: Guest Details ── -->
      <section v-else-if="currentStep === 2" aria-labelledby="step2-heading">
        <h1 id="step2-heading" class="text-xl font-bold text-gray-900 mb-6">
          {{ t('booking.step2') }}
        </h1>

        <form class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5" novalidate @submit.prevent="handleNextFromStep2">

          <!-- Guest name -->
          <div>
            <label for="guest-name" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('booking.guestName') }} <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="guest-name"
              v-model="bookingStore.guestName"
              type="text"
              autocomplete="name"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              :class="nameError ? 'border-red-400 bg-red-50' : 'border-gray-300'"
              :aria-describedby="nameError ? 'name-error' : undefined"
              :aria-invalid="!!nameError"
              @input="nameError = ''"
            />
            <p v-if="nameError" id="name-error" class="mt-1 text-xs text-red-600" role="alert">{{ nameError }}</p>
          </div>

          <!-- Email -->
          <div>
            <label for="guest-email" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('booking.email') }} <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="guest-email"
              v-model="bookingStore.guestEmail"
              type="email"
              autocomplete="email"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              :class="emailError ? 'border-red-400 bg-red-50' : 'border-gray-300'"
              :aria-describedby="emailError ? 'email-error' : undefined"
              :aria-invalid="!!emailError"
              @input="emailError = ''"
            />
            <p v-if="emailError" id="email-error" class="mt-1 text-xs text-red-600" role="alert">{{ emailError }}</p>
          </div>

          <!-- Phone -->
          <div>
            <label for="guest-phone" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('booking.phone') }} <span class="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="guest-phone"
              v-model="bookingStore.guestPhone"
              type="tel"
              autocomplete="tel"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              :class="phoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'"
              :aria-describedby="phoneError ? 'phone-error' : undefined"
              :aria-invalid="!!phoneError"
              @input="phoneError = ''"
            />
            <p v-if="phoneError" id="phone-error" class="mt-1 text-xs text-red-600" role="alert">{{ phoneError }}</p>
          </div>

          <!-- Special requests -->
          <div>
            <label for="special-requests" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('booking.specialRequests') }}
            </label>
            <textarea
              id="special-requests"
              v-model="bookingStore.specialRequests"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-between pt-2">
            <button
              type="button"
              class="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              @click="goBack"
            >
              {{ t('booking.back') }}
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="bookingStore.isStep2Complete
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
              :disabled="!bookingStore.isStep2Complete"
            >
              {{ t('booking.next') }}
            </button>
          </div>
        </form>
      </section>

      <!-- ── Step 3: Payment ── -->
      <section v-else-if="currentStep === 3" aria-labelledby="step3-heading">
        <h1 id="step3-heading" class="text-xl font-bold text-gray-900 mb-6">
          {{ t('booking.step3') }}
        </h1>

        <!-- Booking summary -->
        <div class="mb-6">
          <BookingSummary
            v-if="bookingStore.selectedProperty && bookingStore.selectedRoomType && bookingStore.checkIn && bookingStore.checkOut"
            :property-name="bookingStore.selectedProperty.name"
            :room-type-name="bookingStore.selectedRoomType.name"
            :check-in="bookingStore.checkIn"
            :check-out="bookingStore.checkOut"
            :include-breakfast="bookingStore.includeBreakfast"
            :price-per-night="bookingStore.selectedRoomType.price_per_night"
            :breakfast-price="bookingStore.selectedRoomType.breakfast_price"
          />
        </div>

        <!-- Payment error -->
        <div
          v-if="paymentError"
          class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
          role="alert"
        >
          {{ paymentError }}
        </div>

        <!-- Payment cancelled -->
        <div
          v-if="paymentCancelled"
          class="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800"
          role="status"
        >
          {{ t('booking.paymentCancelled', '付款已取消，您可以重新嘗試付款。') }}
        </div>

        <!-- PayPal button -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <PayPalButton
            :amount="bookingStore.totalAmount"
            currency="TWD"
            :booking-data="bookingFormData"
            @success="handlePaymentSuccess"
            @error="handlePaymentError"
            @cancel="handlePaymentCancel"
          />
        </div>

        <!-- Back button -->
        <div class="flex justify-start">
          <button
            type="button"
            class="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            @click="goBack"
          >
            {{ t('booking.back') }}
          </button>
        </div>
      </section>

    </div>
  </main>
</template>
