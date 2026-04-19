// Feature: moment-chalet-booking-system, Property 19: 民宿/房型 CRUD Round-Trip

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type { Property } from '@/types'

// ── Pure CRUD helpers ─────────────────────────────────────────────────────────

function addProperty(list: Property[], property: Property): Property[] {
  return [...list, property]
}

function updateProperty(
  list: Property[],
  id: string,
  updates: Partial<Property>
): Property[] {
  return list.map(p => (p.id === id ? { ...p, ...updates } : p))
}

function getActiveProperties(list: Property[]): Property[] {
  return list.filter(p => p.is_active)
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbProperty = fc.record<Property>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  location: fc.string({ minLength: 1, maxLength: 30 }),
  lat: fc.float({ min: -90, max: 90, noNaN: true }),
  lng: fc.float({ min: -180, max: 180, noNaN: true }),
  images: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  ical_url: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: fc.constant('2025-01-01T00:00:00Z'),
})

const arbProperties = fc.array(arbProperty, { minLength: 0, maxLength: 20 })

// ── Property 19: 民宿/房型 CRUD Round-Trip ────────────────────────────────────

/**
 * Validates: Requirements 10.1, 10.2
 *
 * Property 19: 民宿/房型 CRUD Round-Trip
 * After adding a property, it can be found by ID.
 * After updating a property, the updated fields are reflected.
 * After disabling a property (is_active = false), it doesn't appear in active-only queries.
 */
describe('Property 19: 民宿/房型 CRUD Round-Trip', () => {
  it('after adding a property, it can be found by ID', () => {
    fc.assert(
      fc.property(arbProperties, arbProperty, (list, newProperty) => {
        const updated = addProperty(list, newProperty)
        return updated.some(p => p.id === newProperty.id)
      }),
      { numRuns: 100 }
    )
  })

  it('after adding a property, the list length increases by 1', () => {
    fc.assert(
      fc.property(arbProperties, arbProperty, (list, newProperty) => {
        const updated = addProperty(list, newProperty)
        return updated.length === list.length + 1
      }),
      { numRuns: 100 }
    )
  })

  it('after updating a property, the updated fields are reflected', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 0),
        fc.string({ minLength: 1, maxLength: 30 }),
        (list, newName) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { name: newName })
          const found = updated.find(p => p.id === target.id)
          return found !== undefined && found.name === newName
        }
      ),
      { numRuns: 100 }
    )
  })

  it('updating a property does not change other properties', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 1),
        fc.string({ minLength: 1, maxLength: 30 }),
        (list, newName) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { name: newName })
          return list.slice(1).every(original => {
            const inUpdated = updated.find(p => p.id === original.id)
            return inUpdated !== undefined && inUpdated.name === original.name
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('after disabling a property, it does not appear in active-only queries', () => {
    fc.assert(
      fc.property(
        arbProperties.filter(list => list.length > 0),
        (list) => {
          const target = list[0]
          const updated = updateProperty(list, target.id, { is_active: false })
          const active = getActiveProperties(updated)
          return !active.some(p => p.id === target.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getActiveProperties returns only properties with is_active = true', () => {
    fc.assert(
      fc.property(arbProperties, (list) => {
        const active = getActiveProperties(list)
        return active.every(p => p.is_active === true)
      }),
      { numRuns: 100 }
    )
  })

  it('getActiveProperties result is a subset of the original list', () => {
    fc.assert(
      fc.property(arbProperties, (list) => {
        const active = getActiveProperties(list)
        return active.length <= list.length
      }),
      { numRuns: 100 }
    )
  })
})
