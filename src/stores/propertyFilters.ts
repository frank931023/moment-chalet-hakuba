import type { Property, RoomType, PropertyFilters } from '@/types'

/**
 * Pure filter function — testable without Pinia/Vue/Supabase context.
 * Filters a list of properties based on the given filters and room type map.
 *
 * @param properties - Array of Property objects to filter
 * @param roomTypesByProperty - Map of property_id → RoomType[]
 * @param filters - Current filter state
 * @returns Filtered array of properties that match all criteria
 */
export function filterProperties(
  properties: Property[],
  roomTypesByProperty: Record<string, RoomType[]>,
  filters: PropertyFilters
): Property[] {
  return properties.filter((p) => {
    // Location: case-insensitive substring match
    if (
      filters.location &&
      !p.location.toLowerCase().includes(filters.location.toLowerCase())
    ) {
      return false
    }

    const roomTypes = roomTypesByProperty[p.id] ?? []

    // Guests: at least one active room type must have capacity >= guests
    if (filters.guests > 1) {
      const hasCapacity = roomTypes.some(
        (rt) => rt.is_active && rt.capacity >= filters.guests
      )
      if (!hasCapacity) return false
    }

    // Price range: at least one active room type's price_per_night must be within range
    const [minPrice, maxPrice] = filters.priceRange
    if (minPrice > 0 || maxPrice < 100000) {
      const hasPriceInRange = roomTypes.some(
        (rt) =>
          rt.is_active &&
          rt.price_per_night >= minPrice &&
          rt.price_per_night <= maxPrice
      )
      if (!hasPriceInRange) return false
    }

    return true
  })
}
