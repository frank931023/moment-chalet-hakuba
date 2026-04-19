<template>
  <div
    class="rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 bg-white shadow-sm hover:shadow-md"
    :class="selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'"
    @click="emit('select', roomType.id)"
  >
    <!-- Image -->
    <div class="relative h-48 bg-gray-100 overflow-hidden">
      <img
        :src="roomType.images[0] || '/placeholder-room.jpg'"
        :alt="roomType.name"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- Name & Capacity -->
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-semibold text-gray-900">{{ roomType.name }}</h3>
        <span class="text-sm text-gray-500 whitespace-nowrap">
          {{ $t('roomCard.capacity', { n: roomType.capacity }) }}
        </span>
      </div>

      <!-- Amenities -->
      <ul v-if="roomType.amenities.length" class="flex flex-wrap gap-1">
        <li
          v-for="amenity in roomType.amenities"
          :key="amenity"
          class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
        >
          {{ amenity }}
        </li>
      </ul>

      <!-- Price -->
      <div class="text-right">
        <span class="text-xl font-bold text-blue-600">{{ formatCurrency(roomType.price_per_night) }}</span>
        <span class="text-sm text-gray-500 ml-1">/ {{ $t('roomCard.perNight') }}</span>
      </div>

      <!-- Breakfast toggle -->
      <div
        v-if="hasBreakfastOption"
        class="border-t pt-3"
        @click.stop
      >
        <p class="text-sm font-medium text-gray-700 mb-2">{{ $t('roomCard.breakfastOption') }}</p>
        <div class="flex gap-3">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              :name="`breakfast-${roomType.id}`"
              :value="false"
              :checked="!breakfastSelected"
              class="accent-blue-500"
              @change="emit('breakfast-change', false)"
            />
            <span class="text-sm text-gray-700">{{ $t('roomCard.noBreakfast') }}</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              :name="`breakfast-${roomType.id}`"
              :value="true"
              :checked="breakfastSelected"
              class="accent-blue-500"
              @change="emit('breakfast-change', true)"
            />
            <span class="text-sm text-gray-700">
              {{ $t('roomCard.withBreakfast') }}
              <span class="text-gray-500">(+{{ formatCurrency(roomType.breakfast_price) }})</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RoomType } from '@/types'
import { formatCurrency } from '@/utils/currency'

const props = defineProps<{
  roomType: RoomType
  hasBreakfastOption: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'breakfast-change', value: boolean): void
}>()

const breakfastSelected = ref(false)
</script>
