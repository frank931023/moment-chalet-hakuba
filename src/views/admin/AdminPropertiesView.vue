<script setup lang="ts">
import { ref, computed, onMounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import type { Property, RoomType } from '@/types'

const { t } = useI18n()

// ── Types ─────────────────────────────────────────────────────
interface PropertyWithRooms extends Property {
  room_types?: RoomType[]
  expanded?: boolean
}

type PropertyForm = Omit<Property, 'id' | 'created_at'>
type RoomTypeForm = Omit<RoomType, 'id' | 'property_id' | 'created_at'>

// ── State ─────────────────────────────────────────────────────
const properties = ref<PropertyWithRooms[]>([])
const isLoading = ref(false)
const fetchError = ref('')

// Property dialog
const showPropertyDialog = ref(false)
const editingProperty = ref<PropertyWithRooms | null>(null)
const isSaving = ref(false)
const saveError = ref('')
const propertyForm = ref<PropertyForm>(emptyPropertyForm())

// Room type dialog
const showRoomDialog = ref(false)
const editingRoom = ref<RoomType | null>(null)
const currentPropertyId = ref('')
const isSavingRoom = ref(false)
const saveRoomError = ref('')
const roomForm = ref<RoomTypeForm>(emptyRoomForm())

// Image upload
const isUploadingImage = ref(false)
const isUploadingRoomImage = ref(false)

// Map picker
const showMapPicker = ref(false)
const LMap = shallowRef<unknown>(null)
const LTileLayer = shallowRef<unknown>(null)
const LMarker = shallowRef<unknown>(null)
const mapReady = ref(false)
const HAKUBA_CENTER: [number, number] = [36.7, 137.8]

// ── Helpers ───────────────────────────────────────────────────
function emptyPropertyForm(): PropertyForm {
  return {
    name: '',
    description: '',
    location: '',
    lat: 36.7,
    lng: 137.8,
    images: [],
    ical_url: null,
    has_breakfast_option: false,
    is_active: true,
  }
}

function emptyRoomForm(): RoomTypeForm {
  return {
    name: '',
    capacity: 2,
    price_per_night: 0,
    breakfast_price: 0,
    amenities: [],
    images: [],
    is_active: true,
  }
}

// ── Fetch ─────────────────────────────────────────────────────
async function fetchAll() {
  isLoading.value = true
  fetchError.value = ''
  try {
    const { data: props, error: pErr } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (pErr) throw pErr

    const { data: rooms, error: rErr } = await supabase
      .from('room_types')
      .select('*')
      .order('created_at', { ascending: true })
    if (rErr) throw rErr

    properties.value = (props ?? []).map((p: Property) => ({
      ...p,
      room_types: (rooms ?? []).filter((r: RoomType) => r.property_id === p.id),
      expanded: false,
    }))
  } catch (err: any) {
    fetchError.value = err?.message ?? t('error.networkError')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchAll()
  // Lazy-load Leaflet for map picker
  const vl = await import('@vue-leaflet/vue-leaflet')
  LMap.value = vl.LMap
  LTileLayer.value = vl.LTileLayer
  LMarker.value = vl.LMarker
  mapReady.value = true
})

// ── Property CRUD ─────────────────────────────────────────────
function openAddProperty() {
  editingProperty.value = null
  propertyForm.value = emptyPropertyForm()
  saveError.value = ''
  showPropertyDialog.value = true
}

function openEditProperty(prop: PropertyWithRooms) {
  editingProperty.value = prop
  propertyForm.value = {
    name: prop.name,
    description: prop.description,
    location: prop.location,
    lat: prop.lat,
    lng: prop.lng,
    images: [...prop.images],
    ical_url: prop.ical_url,
    has_breakfast_option: prop.has_breakfast_option,
    is_active: prop.is_active,
  }
  saveError.value = ''
  showPropertyDialog.value = true
}

async function saveProperty() {
  if (!propertyForm.value.name.trim() || !propertyForm.value.location.trim()) {
    saveError.value = '民宿名稱與地點為必填'
    return
  }
  isSaving.value = true
  saveError.value = ''
  try {
    if (editingProperty.value) {
      const { error } = await supabase
        .from('properties')
        .update(propertyForm.value)
        .eq('id', editingProperty.value.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('properties')
        .insert(propertyForm.value)
      if (error) throw error
    }
    showPropertyDialog.value = false
    await fetchAll()
  } catch (err: any) {
    saveError.value = err?.message ?? t('error.networkError')
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(prop: PropertyWithRooms) {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ is_active: !prop.is_active })
      .eq('id', prop.id)
    if (error) throw error
    prop.is_active = !prop.is_active
  } catch (err: any) {
    fetchError.value = err?.message ?? t('error.networkError')
  }
}

// ── Image upload ──────────────────────────────────────────────
async function uploadPropertyImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingImage.value = true
  try {
    const path = `properties/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('images').upload(path, file)
    if (upErr) throw upErr
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    propertyForm.value.images = [...propertyForm.value.images, data.publicUrl]
  } catch (err: any) {
    saveError.value = err?.message ?? t('error.networkError')
  } finally {
    isUploadingImage.value = false
  }
}

function removePropertyImage(idx: number) {
  propertyForm.value.images = propertyForm.value.images.filter((_, i) => i !== idx)
}

async function uploadRoomImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingRoomImage.value = true
  try {
    const path = `room_types/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('images').upload(path, file)
    if (upErr) throw upErr
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    roomForm.value.images = [...roomForm.value.images, data.publicUrl]
  } catch (err: any) {
    saveRoomError.value = err?.message ?? t('error.networkError')
  } finally {
    isUploadingRoomImage.value = false
  }
}

function removeRoomImage(idx: number) {
  roomForm.value.images = roomForm.value.images.filter((_, i) => i !== idx)
}

// ── Map picker ────────────────────────────────────────────────
function openMapPicker() {
  showMapPicker.value = true
}

function handleMapClick(event: { latlng: { lat: number; lng: number } }) {
  propertyForm.value.lat = parseFloat(event.latlng.lat.toFixed(6))
  propertyForm.value.lng = parseFloat(event.latlng.lng.toFixed(6))
  showMapPicker.value = false
}

const mapMarkers = computed(() => {
  if (propertyForm.value.lat && propertyForm.value.lng) {
    return [{ id: 'pick', name: '選取位置', lat: propertyForm.value.lat, lng: propertyForm.value.lng }]
  }
  return []
})

// ── Room type CRUD ────────────────────────────────────────────
function openAddRoom(propertyId: string) {
  editingRoom.value = null
  currentPropertyId.value = propertyId
  roomForm.value = emptyRoomForm()
  saveRoomError.value = ''
  showRoomDialog.value = true
}

function openEditRoom(room: RoomType) {
  editingRoom.value = room
  currentPropertyId.value = room.property_id
  roomForm.value = {
    name: room.name,
    capacity: room.capacity,
    price_per_night: room.price_per_night,
    breakfast_price: room.breakfast_price,
    amenities: [...room.amenities],
    images: [...room.images],
    is_active: room.is_active,
  }
  saveRoomError.value = ''
  showRoomDialog.value = true
}

async function saveRoom() {
  if (!roomForm.value.name.trim()) {
    saveRoomError.value = '房型名稱為必填'
    return
  }
  isSavingRoom.value = true
  saveRoomError.value = ''
  try {
    if (editingRoom.value) {
      const { error } = await supabase
        .from('room_types')
        .update(roomForm.value)
        .eq('id', editingRoom.value.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('room_types')
        .insert({ ...roomForm.value, property_id: currentPropertyId.value })
      if (error) throw error
    }
    showRoomDialog.value = false
    await fetchAll()
  } catch (err: any) {
    saveRoomError.value = err?.message ?? t('error.networkError')
  } finally {
    isSavingRoom.value = false
  }
}

// Amenities helpers
const amenitiesInput = ref('')
function addAmenity() {
  const val = amenitiesInput.value.trim()
  if (val && !roomForm.value.amenities.includes(val)) {
    roomForm.value.amenities = [...roomForm.value.amenities, val]
  }
  amenitiesInput.value = ''
}
function removeAmenity(idx: number) {
  roomForm.value.amenities = roomForm.value.amenities.filter((_, i) => i !== idx)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900">{{ $t('admin.properties') }}</h1>
      <button
        type="button"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="openAddProperty"
      >
        + 新增民宿
      </button>
    </div>

    <!-- Error -->
    <div v-if="fetchError" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
      {{ fetchError }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-200 rounded animate-pulse" />
    </div>

    <!-- Property list -->
    <div v-else class="space-y-4">
      <div v-if="properties.length === 0" class="text-center py-12 text-gray-400 text-sm">
        尚無民宿資料
      </div>

      <div
        v-for="prop in properties"
        :key="prop.id"
        class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <!-- Property row -->
        <div class="flex items-center gap-4 px-5 py-4">
          <!-- Thumbnail -->
          <img
            v-if="prop.images.length"
            :src="prop.images[0]"
            :alt="prop.name"
            class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
          <div v-else class="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span class="text-gray-400 text-xs">無圖</span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-gray-900 truncate">{{ prop.name }}</span>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="prop.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ prop.is_active ? '啟用' : '停用' }}
              </span>
              <span v-if="prop.has_breakfast_option" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                含早餐選項
              </span>
            </div>
            <div class="text-sm text-gray-500 mt-0.5 truncate">{{ prop.location }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ prop.room_types?.length ?? 0 }} 個房型</div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              @click="openEditProperty(prop)"
            >
              編輯
            </button>
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              :class="prop.is_active
                ? 'border-red-300 text-red-600 hover:bg-red-50 focus:ring-red-400'
                : 'border-green-300 text-green-600 hover:bg-green-50 focus:ring-green-400'"
              @click="toggleActive(prop)"
            >
              {{ prop.is_active ? '停用' : '啟用' }}
            </button>
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              @click="prop.expanded = !prop.expanded"
            >
              房型 {{ prop.expanded ? '▲' : '▼' }}
            </button>
          </div>
        </div>

        <!-- Room types expandable section -->
        <div v-if="prop.expanded" class="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-gray-700">房型管理</span>
            <button
              type="button"
              class="rounded px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              @click="openAddRoom(prop.id)"
            >
              + 新增房型
            </button>
          </div>

          <div v-if="!prop.room_types?.length" class="text-sm text-gray-400 py-2">
            尚無房型
          </div>

          <div class="space-y-2">
            <div
              v-for="room in prop.room_types"
              :key="room.id"
              class="flex items-center gap-3 rounded-lg bg-white border border-gray-200 px-4 py-3"
            >
              <img
                v-if="room.images.length"
                :src="room.images[0]"
                :alt="room.name"
                class="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div v-else class="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-800">{{ room.name }}</span>
                  <span
                    class="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs"
                    :class="room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ room.is_active ? '啟用' : '停用' }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  最多 {{ room.capacity }} 人 ・ TWD {{ room.price_per_night.toLocaleString() }} / 晚
                  <span v-if="room.breakfast_price > 0">・ 早餐 TWD {{ room.breakfast_price.toLocaleString() }}</span>
                </div>
              </div>
              <button
                type="button"
                class="rounded px-2.5 py-1 text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                @click="openEditRoom(room)"
              >
                編輯
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Property Dialog ─────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showPropertyDialog"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prop-dialog-title"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6 my-auto">
        <h2 id="prop-dialog-title" class="text-base font-bold text-gray-900 mb-5">
          {{ editingProperty ? '編輯民宿' : '新增民宿' }}
        </h2>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">民宿名稱 <span class="text-red-500">*</span></label>
            <input
              v-model="propertyForm.name"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Moment Chalet Hakuba A"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">簡介</label>
            <textarea
              v-model="propertyForm.description"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="民宿描述..."
            />
          </div>

          <!-- Location -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">地點 <span class="text-red-500">*</span></label>
            <input
              v-model="propertyForm.location"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="長野県北安曇郡白馬村"
            />
          </div>

          <!-- Lat / Lng + Map picker -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">地圖座標</label>
            <div class="flex gap-2 items-center">
              <input
                v-model.number="propertyForm.lat"
                type="number"
                step="0.000001"
                class="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="緯度"
                aria-label="緯度"
              />
              <input
                v-model.number="propertyForm.lng"
                type="number"
                step="0.000001"
                class="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="經度"
                aria-label="經度"
              />
              <button
                type="button"
                class="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="openMapPicker"
              >
                🗺 地圖選取
              </button>
            </div>
          </div>

          <!-- iCal URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">iCal URL</label>
            <input
              v-model="propertyForm.ical_url"
              type="url"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.airbnb.com/calendar/ical/..."
            />
          </div>

          <!-- Toggles -->
          <div class="flex gap-6">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                v-model="propertyForm.has_breakfast_option"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">提供早餐選項</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                v-model="propertyForm.is_active"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">啟用中</span>
            </label>
          </div>

          <!-- Images -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">民宿圖片</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <div
                v-for="(img, idx) in propertyForm.images"
                :key="idx"
                class="relative group"
              >
                <img :src="img" :alt="`民宿圖片 ${idx + 1}`" class="w-20 h-20 rounded-lg object-cover" />
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                  :aria-label="`移除圖片 ${idx + 1}`"
                  @click="removePropertyImage(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <label class="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
              <span v-if="isUploadingImage">上傳中…</span>
              <span v-else>+ 上傳圖片</span>
              <input
                type="file"
                accept="image/*"
                class="sr-only"
                :disabled="isUploadingImage"
                @change="uploadPropertyImage"
              />
            </label>
          </div>
        </div>

        <!-- Error -->
        <div v-if="saveError" class="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" role="alert">
          {{ saveError }}
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            :disabled="isSaving"
            @click="showPropertyDialog = false"
          >
            取消
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSaving"
            @click="saveProperty"
          >
            <span v-if="isSaving">儲存中…</span>
            <span v-else>儲存</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Map Picker Dialog ───────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showMapPicker"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="地圖座標選取"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-gray-900">點擊地圖選取座標</h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="關閉地圖"
            @click="showMapPicker = false"
          >
            ✕
          </button>
        </div>
        <div class="w-full h-80 rounded-lg overflow-hidden">
          <template v-if="mapReady">
            <component
              :is="LMap"
              :zoom="13"
              :center="HAKUBA_CENTER"
              class="w-full h-full"
              @click="handleMapClick"
            >
              <component
                :is="LTileLayer"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <component
                v-for="m in mapMarkers"
                :key="m.id"
                :is="LMarker"
                :lat-lng="[m.lat, m.lng]"
              />
            </component>
          </template>
          <div v-else class="w-full h-full bg-gray-100 flex items-center justify-center">
            <span class="text-gray-400 text-sm">載入地圖中…</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          目前座標：{{ propertyForm.lat }}, {{ propertyForm.lng }}
        </p>
      </div>
    </div>
  </Teleport>

  <!-- ── Room Type Dialog ────────────────────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showRoomDialog"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-dialog-title"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 my-auto">
        <h2 id="room-dialog-title" class="text-base font-bold text-gray-900 mb-5">
          {{ editingRoom ? '編輯房型' : '新增房型' }}
        </h2>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">房型名稱 <span class="text-red-500">*</span></label>
            <input
              v-model="roomForm.name"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="雙人房"
            />
          </div>

          <!-- Capacity + Price -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">容納人數</label>
              <input
                v-model.number="roomForm.capacity"
                type="number"
                min="1"
                max="20"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">每晚價格 (TWD)</label>
              <input
                v-model.number="roomForm.price_per_night"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Breakfast price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">早餐費用 (TWD)</label>
            <input
              v-model.number="roomForm.breakfast_price"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Amenities -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">設施</label>
            <div class="flex gap-2 mb-2">
              <input
                v-model="amenitiesInput"
                type="text"
                class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="WiFi、停車場…"
                @keydown.enter.prevent="addAmenity"
              />
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                @click="addAmenity"
              >
                新增
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(a, idx) in roomForm.amenities"
                :key="idx"
                class="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs"
              >
                {{ a }}
                <button
                  type="button"
                  class="hover:text-blue-900 focus:outline-none"
                  :aria-label="`移除設施 ${a}`"
                  @click="removeAmenity(idx)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Room images -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">房型圖片</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <div
                v-for="(img, idx) in roomForm.images"
                :key="idx"
                class="relative group"
              >
                <img :src="img" :alt="`房型圖片 ${idx + 1}`" class="w-16 h-16 rounded-lg object-cover" />
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                  :aria-label="`移除圖片 ${idx + 1}`"
                  @click="removeRoomImage(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <label class="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
              <span v-if="isUploadingRoomImage">上傳中…</span>
              <span v-else>+ 上傳圖片</span>
              <input
                type="file"
                accept="image/*"
                class="sr-only"
                :disabled="isUploadingRoomImage"
                @change="uploadRoomImage"
              />
            </label>
          </div>

          <!-- Active toggle -->
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              v-model="roomForm.is_active"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">啟用中</span>
          </label>
        </div>

        <!-- Error -->
        <div v-if="saveRoomError" class="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" role="alert">
          {{ saveRoomError }}
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            :disabled="isSavingRoom"
            @click="showRoomDialog = false"
          >
            取消
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSavingRoom"
            @click="saveRoom"
          >
            <span v-if="isSavingRoom">儲存中…</span>
            <span v-else>儲存</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
