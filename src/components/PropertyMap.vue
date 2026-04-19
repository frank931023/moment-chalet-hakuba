<template>
  <div class="w-full h-full min-h-[300px]">
    <template v-if="mapReady">
      <component
        :is="LMap"
        :zoom="zoom"
        :center="center"
        class="w-full h-full rounded-lg"
        style="min-height: 300px"
      >
        <component
          :is="LTileLayer"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <component
          v-for="prop in properties"
          :key="prop.id"
          :is="LMarker"
          :lat-lng="[prop.lat, prop.lng]"
          @click="handleMarkerClick(prop.id)"
        >
          <component :is="LPopup">
            <div class="text-sm font-medium">{{ prop.name }}</div>
            <div v-if="prop.price != null" class="text-xs text-gray-600 mt-1">
              TWD {{ prop.price.toLocaleString() }} / night
            </div>
            <button
              v-if="mode === 'multi'"
              class="mt-2 text-xs text-blue-600 hover:underline block"
              @click.stop="handleMarkerClick(prop.id)"
            >
              Select
            </button>
          </component>
        </component>
      </component>
    </template>
    <div v-else class="w-full h-full min-h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
      <span class="text-gray-400 text-sm">Loading map…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, shallowRef } from 'vue'

interface MapProperty {
  id: string
  name: string
  lat: number
  lng: number
  price?: number
}

const props = defineProps<{
  mode: 'single' | 'multi'
  properties: MapProperty[]
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

// Hakuba, Japan default center
const HAKUBA_CENTER: [number, number] = [36.7, 137.8]
const DEFAULT_ZOOM = 13

const mapReady = ref(false)

// Use shallowRef to avoid deep reactivity on component definitions
const LMap = shallowRef<unknown>(null)
const LTileLayer = shallowRef<unknown>(null)
const LMarker = shallowRef<unknown>(null)
const LPopup = shallowRef<unknown>(null)

onMounted(async () => {
  // Dynamically import to avoid SSR issues — Leaflet requires browser APIs
  const vl = await import('@vue-leaflet/vue-leaflet')
  LMap.value = vl.LMap
  LTileLayer.value = vl.LTileLayer
  LMarker.value = vl.LMarker
  LPopup.value = vl.LPopup
  mapReady.value = true
})

const center = computed<[number, number]>(() => {
  if (props.mode === 'single' && props.properties.length > 0) {
    return [props.properties[0].lat, props.properties[0].lng]
  }
  return HAKUBA_CENTER
})

const zoom = computed(() => DEFAULT_ZOOM)

function handleMarkerClick(id: string) {
  emit('select', id)
}
</script>
