<template>
  <main class="min-h-screen bg-gray-50">
    <!-- Page Header -->
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">{{ t('nav.properties') }}</h1>
      </div>
    </div>

    <!-- Filter Bar -->
    <section class="bg-white shadow-sm sticky top-0 z-10 border-b" aria-label="Filter properties">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Location -->
          <div>
            <label for="filter-location" class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('property.location') }}
            </label>
            <input
              id="filter-location"
              v-model="propertyStore.filters.location"
              type="text"
              :placeholder="t('property.location')"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Check-in -->
          <div>
            <label for="filter-checkin" class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('booking.checkIn') }}
            </label>
            <input
              id="filter-checkin"
              v-model="checkInStr"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Check-out -->
          <div>
            <label for="filter-checkout" class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('booking.checkOut') }}
            </label>
            <input
              id="filter-checkout"
              v-model="checkOutStr"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Guests -->
          <div>
            <label for="filter-guests" class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('booking.guests') }}
            </label>
            <input
              id="filter-guests"
              v-model.number="propertyStore.filters.guests"
              type="number"
              min="1"
              max="20"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Price Range -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('property.from') }} TWD
            </label>
            <div class="flex gap-1 items-center">
              <input
                v-model.number="propertyStore.filters.priceRange[0]"
                type="number"
                min="0"
                :placeholder="t('property.from')"
                class="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Minimum price"
              />
              <span class="text-gray-400 text-xs">–</span>
              <input
                v-model.number="propertyStore.filters.priceRange[1]"
                type="number"
                min="0"
                :placeholder="'max'"
                class="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Maximum price"
              />
            </div>
          </div>
        </div>

        <!-- View Toggle & Reset -->
        <div class="flex items-center justify-between mt-3">
          <button
            class="text-sm text-gray-500 hover:text-gray-700 underline"
            aria-label="Reset all filters"
            @click="propertyStore.resetFilters(); checkInStr = ''; checkOutStr = ''"
          >
            Reset filters
          </button>
          <div class="flex gap-2" role="group" aria-label="View mode">
            <button
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
              :aria-pressed="viewMode === 'list'"
              @click="viewMode = 'list'"
            >
              🗂 List
            </button>
            <button
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
              :aria-pressed="viewMode === 'map'"
              @click="viewMode = 'map'"
            >
              🗺 Map
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Result count -->
      <p class="text-sm text-gray-500 mb-4">
        {{ filteredProperties.length }} {{ filteredProperties.length === 1 ? 'property' : 'properties' }} found
      </p>

      <!-- List Mode -->
      <template v-if="viewMode === 'list'">
        <div
          v-if="filteredProperties.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <article
            v-for="property in filteredProperties"
            :key="property.id"
            class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <img
              :src="property.images[0] || '/images/property-placeholder.jpg'"
              :alt="property.name"
              class="w-full h-48 object-cover"
            />
            <div class="p-4">
              <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ property.name }}</h2>
              <p class="text-sm text-gray-500 mb-3">{{ property.location }}</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700">
                  {{ t('property.from') }}
                  <span class="font-bold text-gray-900">{{ getStartingPrice(property.id) }}</span>
                  {{ t('property.perNight') }}
                </span>
                <RouterLink
                  :to="`/properties/${property.id}`"
                  class="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                >
                  {{ t('property.viewDetail') }}
                </RouterLink>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="text-center text-gray-400 py-16">
          <p class="text-lg">No properties match your filters.</p>
          <button
            class="mt-4 text-blue-600 hover:underline text-sm"
            @click="propertyStore.resetFilters(); checkInStr = ''; checkOutStr = ''"
          >
            Clear filters
          </button>
        </div>
      </template>

      <!-- Map Mode -->
      <template v-else>
        <div class="h-[600px] rounded-xl overflow-hidden shadow-md">
          <PropertyMap
            mode="multi"
            :properties="mapProperties"
            @select="handleMapSelect"
          />
        </div>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { usePropertyStore } from '@/stores/property'
import { formatCurrency } from '@/utils/currency'
import PropertyMap from '@/components/PropertyMap.vue'
import { getPageMeta } from '@/utils/pageMeta'

const { t } = useI18n()
const router = useRouter()
const propertyStore = usePropertyStore()

const meta = getPageMeta('properties')
useHead({
  title: meta.title,
  meta: [{ name: 'description', content: meta.description }]
})

const viewMode = ref<'list' | 'map'>('list')

// Date string bindings that sync to store filters
const checkInStr = ref('')
const checkOutStr = ref('')

watch(checkInStr, (val) => {
  propertyStore.filters.checkIn = val ? new Date(val) : null
})
watch(checkOutStr, (val) => {
  propertyStore.filters.checkOut = val ? new Date(val) : null
})

onMounted(() => {
  propertyStore.fetchProperties()
})

const filteredProperties = computed(() => propertyStore.applyFilters())

function getStartingPrice(propertyId: string): string {
  const roomTypes = propertyStore.roomTypesByProperty[propertyId]
  if (!roomTypes || roomTypes.length === 0) return '—'
  const min = Math.min(...roomTypes.map((rt) => rt.price_per_night))
  return formatCurrency(min)
}

const mapProperties = computed(() =>
  filteredProperties.value
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => {
      const roomTypes = propertyStore.roomTypesByProperty[p.id]
      const minPrice = roomTypes?.length
        ? Math.min(...roomTypes.map((rt) => rt.price_per_night))
        : undefined
      return { id: p.id, name: p.name, lat: p.lat, lng: p.lng, price: minPrice }
    })
)

function handleMapSelect(id: string) {
  router.push(`/properties/${id}`)
}
</script>
