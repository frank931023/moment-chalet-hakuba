<template>
  <main class="min-h-screen bg-gray-50">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <span class="text-gray-400 text-lg">Loading…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-32 gap-4">
      <p class="text-red-500">{{ error }}</p>
      <RouterLink to="/properties" class="text-blue-600 hover:underline text-sm">
        ← Back to properties
      </RouterLink>
    </div>

    <!-- Content -->
    <template v-else-if="property">
      <!-- Image Gallery -->
      <section aria-label="Property images" class="bg-black">
        <div class="max-w-7xl mx-auto">
          <!-- Primary image -->
          <div class="relative h-72 md:h-[480px] overflow-hidden">
            <img
              :src="property.images[activeImage] || '/images/property-placeholder.jpg'"
              :alt="`${property.name} — image ${activeImage + 1}`"
              class="w-full h-full object-cover"
            />
            <!-- Prev / Next -->
            <button
              v-if="property.images.length > 1"
              class="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image"
              @click="prevImage"
            >
              ‹
            </button>
            <button
              v-if="property.images.length > 1"
              class="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image"
              @click="nextImage"
            >
              ›
            </button>
            <!-- Counter -->
            <span
              v-if="property.images.length > 1"
              class="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full"
            >
              {{ activeImage + 1 }} / {{ property.images.length }}
            </span>
          </div>

          <!-- Thumbnail strip -->
          <div
            v-if="property.images.length > 1"
            class="flex gap-2 px-4 py-3 overflow-x-auto"
          >
            <button
              v-for="(img, idx) in property.images"
              :key="idx"
              class="flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              :class="idx === activeImage ? 'border-blue-500' : 'border-transparent'"
              :aria-label="`View image ${idx + 1}`"
              @click="activeImage = idx"
            >
              <img :src="img" :alt="`Thumbnail ${idx + 1}`" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </section>

      <div class="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left column: main info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Property Info -->
          <section>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{{ property.name }}</h1>
            <p class="text-gray-500 flex items-center gap-1 mb-4">
              <span aria-hidden="true">📍</span>
              {{ property.location }}
            </p>
            <p class="text-gray-700 leading-relaxed">{{ property.description }}</p>
          </section>

          <!-- Amenities -->
          <section aria-labelledby="amenities-heading">
            <h2 id="amenities-heading" class="text-xl font-semibold text-gray-900 mb-4">
              {{ t('property.amenities') }}
            </h2>
            <ul class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <li
                v-for="amenity in amenities"
                :key="amenity.label"
                class="flex items-center gap-2 text-sm text-gray-700"
              >
                <span aria-hidden="true" class="text-lg">{{ amenity.icon }}</span>
                {{ amenity.label }}
              </li>
            </ul>
          </section>

          <!-- Room Types -->
          <section aria-labelledby="rooms-heading">
            <h2 id="rooms-heading" class="text-xl font-semibold text-gray-900 mb-4">
              {{ t('property.rooms') }}
            </h2>
            <div v-if="roomTypes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RoomCard
                v-for="rt in roomTypes"
                :key="rt.id"
                :room-type="rt"
                :has-breakfast-option="property.has_breakfast_option"
                :selected="selectedRoomTypeId === rt.id"
                @select="handleRoomSelect"
                @breakfast-change="(val) => handleBreakfastChange(rt.id, val)"
              />
            </div>
            <p v-else class="text-gray-400 text-sm">No room types available.</p>
          </section>

          <!-- Map -->
          <section aria-labelledby="map-heading">
            <h2 id="map-heading" class="text-xl font-semibold text-gray-900 mb-4">
              {{ t('property.location') }}
            </h2>
            <div class="h-72 rounded-xl overflow-hidden shadow-md">
              <PropertyMap
                mode="single"
                :properties="singleMapProperty"
              />
            </div>
          </section>

          <!-- Testimonials -->
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" class="text-xl font-semibold text-gray-900 mb-4">
              {{ t('property.reviews') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <blockquote
                v-for="review in testimonials"
                :key="review.id"
                class="bg-white rounded-xl shadow p-5"
              >
                <div class="flex gap-1 mb-2" aria-label="5 stars">
                  <span v-for="i in 5" :key="i" aria-hidden="true" class="text-yellow-400">★</span>
                </div>
                <p class="text-gray-700 italic text-sm mb-3">"{{ review.text }}"</p>
                <footer class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs"
                    aria-hidden="true"
                  >
                    {{ review.author[0] }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900 text-sm">{{ review.author }}</p>
                    <p class="text-xs text-gray-400">{{ review.date }}</p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </section>
        </div>

        <!-- Right column: sticky booking panel -->
        <aside class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow-md p-6 sticky top-24 space-y-4">
            <div>
              <p class="text-sm text-gray-500">{{ t('property.from') }}</p>
              <p class="text-2xl font-bold text-blue-600">
                {{ startingPrice }}
                <span class="text-sm font-normal text-gray-500">{{ t('property.perNight') }}</span>
              </p>
            </div>

            <div v-if="selectedRoomTypeId" class="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
              <p class="font-medium text-blue-800 mb-1">Selected room:</p>
              <p>{{ selectedRoomTypeName }}</p>
            </div>

            <button
              class="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!selectedRoomTypeId"
              @click="handleBookNow"
            >
              Book Now
            </button>

            <p v-if="!selectedRoomTypeId" class="text-xs text-gray-400 text-center">
              Select a room type above to continue
            </p>
          </div>
        </aside>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@vueuse/head'
import { usePropertyStore } from '@/stores/property'
import { useBookingStore } from '@/stores/booking'
import { formatCurrency } from '@/utils/currency'
import PropertyMap from '@/components/PropertyMap.vue'
import RoomCard from '@/components/RoomCard.vue'
import type { RoomType } from '@/types'
import { getPageMeta } from '@/utils/pageMeta'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const propertyStore = usePropertyStore()
const bookingStore = useBookingStore()

// Dynamic head — updated once property loads
const _defaultMeta = getPageMeta('property-detail')
const headTitle = ref(_defaultMeta.title)
const headDesc = ref(_defaultMeta.description)
useHead({
  title: headTitle,
  meta: [{ name: 'description', content: headDesc }]
})

const loading = ref(true)
const error = ref<string | null>(null)
const activeImage = ref(0)
const selectedRoomTypeId = ref<string | null>(null)
const breakfastByRoom = ref<Record<string, boolean>>({})

const property = computed(() => propertyStore.currentProperty)
const roomTypes = computed<RoomType[]>(() => {
  if (!property.value) return []
  return propertyStore.roomTypesByProperty[property.value.id] ?? []
})

const startingPrice = computed(() => {
  if (roomTypes.value.length === 0) return '—'
  const min = Math.min(...roomTypes.value.map((rt) => rt.price_per_night))
  return formatCurrency(min)
})

const selectedRoomTypeName = computed(() => {
  if (!selectedRoomTypeId.value) return ''
  return roomTypes.value.find((rt) => rt.id === selectedRoomTypeId.value)?.name ?? ''
})

const singleMapProperty = computed(() => {
  if (!property.value) return []
  return [{ id: property.value.id, name: property.value.name, lat: property.value.lat, lng: property.value.lng }]
})

// Static amenities list (placeholder icons)
const amenities = [
  { icon: '🛁', label: 'Private bathroom' },
  { icon: '🌡️', label: 'Heating' },
  { icon: '❄️', label: 'Air conditioning' },
  { icon: '📶', label: 'Free Wi-Fi' },
  { icon: '🅿️', label: 'Free parking' },
  { icon: '🍳', label: 'Kitchen' },
  { icon: '🧺', label: 'Washer' },
  { icon: '🏔️', label: 'Mountain view' },
  { icon: '🔥', label: 'Fireplace' },
]

// Static testimonials
const testimonials = [
  {
    id: 1,
    text: 'An absolutely magical stay in Hakuba. The chalet was cozy, beautifully designed, and the mountain views were breathtaking.',
    author: 'Sarah M.',
    date: '2024-02'
  },
  {
    id: 2,
    text: '白馬村最棒的住宿體驗！民宿設計精緻，服務周到，非常推薦給想體驗日本山村風情的旅客。',
    author: '陳小明',
    date: '2024-01'
  },
  {
    id: 3,
    text: '白馬での滞在は最高でした。シャレーは清潔で快適、スタッフも親切でまた来たいと思います。',
    author: '田中 花子',
    date: '2023-12'
  },
  {
    id: 4,
    text: 'Perfect location for skiing. The chalet had everything we needed and the host was incredibly helpful.',
    author: 'James T.',
    date: '2024-01'
  }
]

onMounted(async () => {
  const id = route.params.id as string
  try {
    // Ensure properties (and room types) are loaded
    if (propertyStore.properties.length === 0) {
      await propertyStore.fetchProperties()
    }
    await propertyStore.fetchPropertyById(id)

    if (property.value) {
      headTitle.value = `${property.value.name} — Moment Chalet Hakuba`
      headDesc.value = property.value.description || headDesc.value
    }
  } catch (e) {
    error.value = 'Failed to load property. Please try again.'
  } finally {
    loading.value = false
  }
})

function prevImage() {
  if (!property.value) return
  const len = property.value.images.length
  activeImage.value = (activeImage.value - 1 + len) % len
}

function nextImage() {
  if (!property.value) return
  const len = property.value.images.length
  activeImage.value = (activeImage.value + 1) % len
}

function handleRoomSelect(id: string) {
  selectedRoomTypeId.value = id
}

function handleBreakfastChange(roomId: string, val: boolean) {
  breakfastByRoom.value[roomId] = val
}

function handleBookNow() {
  if (!selectedRoomTypeId.value || !property.value) return
  const roomType = roomTypes.value.find((rt) => rt.id === selectedRoomTypeId.value)
  if (!roomType) return

  bookingStore.selectedProperty = property.value
  bookingStore.selectedRoomType = roomType
  bookingStore.includeBreakfast = breakfastByRoom.value[selectedRoomTypeId.value] ?? false
  bookingStore.setStep(1)

  router.push('/booking')
}
</script>
