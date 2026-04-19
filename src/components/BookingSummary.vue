<template>
  <div class="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
    <h2 class="text-lg font-semibold text-gray-900 border-b pb-3">{{ $t('bookingSummary.title') }}</h2>

    <dl class="space-y-2 text-sm">
      <!-- Property -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.property') }}</dt>
        <dd class="font-medium text-gray-900">{{ propertyName }}</dd>
      </div>

      <!-- Room type -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.roomType') }}</dt>
        <dd class="font-medium text-gray-900">{{ roomTypeName }}</dd>
      </div>

      <!-- Check-in -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.checkIn') }}</dt>
        <dd class="font-medium text-gray-900">{{ formattedCheckIn }}</dd>
      </div>

      <!-- Check-out -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.checkOut') }}</dt>
        <dd class="font-medium text-gray-900">{{ formattedCheckOut }}</dd>
      </div>

      <!-- Nights -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.nights') }}</dt>
        <dd class="font-medium text-gray-900">{{ nights }}</dd>
      </div>

      <!-- Breakfast -->
      <div class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.breakfast') }}</dt>
        <dd class="font-medium" :class="includeBreakfast ? 'text-green-600' : 'text-gray-500'">
          {{ includeBreakfast ? $t('bookingSummary.included') : $t('bookingSummary.notIncluded') }}
        </dd>
      </div>

      <!-- Breakfast fee -->
      <div v-if="includeBreakfast" class="flex justify-between">
        <dt class="text-gray-500">{{ $t('bookingSummary.breakfastFee') }}</dt>
        <dd class="font-medium text-gray-900">{{ formatCurrency(breakfastPrice * nights) }}</dd>
      </div>
    </dl>

    <!-- Total -->
    <div class="border-t pt-3 flex justify-between items-center">
      <span class="font-semibold text-gray-900">{{ $t('bookingSummary.total') }}</span>
      <span class="text-xl font-bold text-blue-600">{{ formatCurrency(totalAmount) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'

const props = defineProps<{
  propertyName: string
  roomTypeName: string
  checkIn: Date
  checkOut: Date
  includeBreakfast: boolean
  pricePerNight: number
  breakfastPrice: number
}>()

const { locale } = useI18n()

const nights = computed(() => {
  const ms = props.checkOut.getTime() - props.checkIn.getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
})

const totalAmount = computed(() => {
  const nightly = props.pricePerNight + (props.includeBreakfast ? props.breakfastPrice : 0)
  return nightly * nights.value
})

const formattedCheckIn = computed(() => formatDate(props.checkIn, locale.value))
const formattedCheckOut = computed(() => formatDate(props.checkOut, locale.value))
</script>
