<template>
  <div>
    <!-- Hero Banner -->
    <section
      class="relative min-h-screen flex items-center justify-center bg-gray-900 bg-cover bg-center"
      style="background-image: url('/images/hero-placeholder.jpg')"
      aria-label="Hero banner"
    >
      <div class="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div class="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
        <h1 class="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
          {{ t('home.title') }}
        </h1>
        <p class="text-lg md:text-2xl mb-2 drop-shadow">{{ t('home.subtitle') }}</p>
        <p class="text-base md:text-lg mb-8 text-white/80 drop-shadow">{{ t('home.description') }}</p>
        <RouterLink
          to="/properties"
          class="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        >
          {{ t('home.bookNow') }}
        </RouterLink>
      </div>
    </section>

    <!-- Property Grid -->
    <section class="py-16 px-4 max-w-7xl mx-auto">
      <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
        {{ t('home.viewAll') }}
      </h2>

      <div
        v-if="displayProperties.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <article
          v-for="property in displayProperties"
          :key="property.id"
          class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        >
          <img
            :src="property.images[0] || '/images/property-placeholder.jpg'"
            :alt="property.name"
            class="w-full h-48 object-cover"
          />
          <div class="p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ property.name }}</h3>
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

      <div v-else class="text-center text-gray-400 py-12">
        <p>{{ t('home.description') }}</p>
      </div>
    </section>

    <!-- Map Overview -->
    <section class="py-8 px-4 max-w-7xl mx-auto">
      <div class="h-96 rounded-xl overflow-hidden shadow-md">
        <PropertyMap
          mode="multi"
          :properties="mapProperties"
          @select="handleMapSelect"
        />
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 px-4 bg-gray-50">
      <div class="max-w-7xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
          {{ t('property.reviews') }}
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <blockquote
            v-for="testimonial in testimonials"
            :key="testimonial.id"
            class="bg-white rounded-xl shadow p-6"
          >
            <p class="text-gray-700 mb-4 italic">"{{ testimonial.text }}"</p>
            <footer class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm" aria-hidden="true">
                {{ testimonial.author[0] }}
              </div>
              <div>
                <p class="font-semibold text-gray-900 text-sm">{{ testimonial.author }}</p>
                <p class="text-xs text-gray-400">{{ testimonial.date }}</p>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

const meta = getPageMeta('home')
useHead({
  title: meta.title,
  meta: [{ name: 'description', content: meta.description }]
})

onMounted(() => {
  propertyStore.fetchProperties()
})

const displayProperties = computed(() =>
  propertyStore.properties.slice(0, 9)
)

function getStartingPrice(propertyId: string): string {
  const roomTypes = propertyStore.roomTypesByProperty[propertyId]
  if (!roomTypes || roomTypes.length === 0) return '—'
  const min = Math.min(...roomTypes.map((rt) => rt.price_per_night))
  return formatCurrency(min)
}

const mapProperties = computed(() =>
  displayProperties.value
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => {
      const roomTypes = propertyStore.roomTypesByProperty[p.id]
      const minPrice = roomTypes?.length
        ? Math.min(...roomTypes.map((rt) => rt.price_per_night))
        : undefined
      return {
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        price: minPrice
      }
    })
)

function handleMapSelect(id: string) {
  router.push(`/properties/${id}`)
}

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
  }
]
</script>
