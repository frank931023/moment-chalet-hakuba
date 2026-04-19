import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, IS_MOCK_MODE } from '@/lib/supabase'
import type { Property, RoomType, PropertyFilters } from '@/types'
import { filterProperties } from './propertyFilters'
import { MOCK_PROPERTIES, MOCK_ROOM_TYPES, getMockRoomTypesByProperty } from '@/mock/data'

export { filterProperties } from './propertyFilters'

const DEFAULT_FILTERS: PropertyFilters = {
  location: '',
  checkIn: null,
  checkOut: null,
  guests: 1,
  priceRange: [0, 100000]
}

export const usePropertyStore = defineStore('property', () => {
  const properties = ref<Property[]>([])
  const currentProperty = ref<Property | null>(null)
  const filters = ref<PropertyFilters>({ ...DEFAULT_FILTERS })
  const roomTypesByProperty = ref<Record<string, RoomType[]>>({})

  async function fetchProperties() {
    if (IS_MOCK_MODE) {
      properties.value = MOCK_PROPERTIES
      roomTypesByProperty.value = getMockRoomTypesByProperty()
      return
    }

    const { data: propData, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (propError) throw propError
    properties.value = propData ?? []

    if (properties.value.length > 0) {
      const propertyIds = properties.value.map((p) => p.id)
      const { data: rtData, error: rtError } = await supabase
        .from('room_types')
        .select('*')
        .in('property_id', propertyIds)
        .eq('is_active', true)

      if (rtError) throw rtError

      const map: Record<string, RoomType[]> = {}
      for (const rt of rtData ?? []) {
        if (!map[rt.property_id]) map[rt.property_id] = []
        map[rt.property_id].push(rt)
      }
      roomTypesByProperty.value = map
    }
  }

  async function fetchPropertyById(id: string) {
    if (IS_MOCK_MODE) {
      currentProperty.value = MOCK_PROPERTIES.find((p) => p.id === id) ?? null
      // Also ensure room types are loaded
      if (Object.keys(roomTypesByProperty.value).length === 0) {
        roomTypesByProperty.value = getMockRoomTypesByProperty()
      }
      return
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    currentProperty.value = data
  }

  function applyFilters(): Property[] {
    return filterProperties(properties.value, roomTypesByProperty.value, filters.value)
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_FILTERS }
  }

  return {
    properties,
    currentProperty,
    filters,
    roomTypesByProperty,
    fetchProperties,
    fetchPropertyById,
    applyFilters,
    resetFilters
  }
})
