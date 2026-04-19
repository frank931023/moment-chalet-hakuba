// Feature: moment-chalet-booking-system, StatusBadge color class mapping

// Validates: Requirements 9.1

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StatusBadge from '@/components/StatusBadge.vue'
import type { BookingStatus } from '@/types'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      status: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        refunded: 'Refunded',
      },
    },
  },
})

const colorMap: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-blue-100 text-blue-800',
}

const allStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'refunded']

describe('Property: StatusBadge color class mapping', () => {
  it('each BookingStatus maps to the correct CSS color class', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        (status) => {
          const wrapper = mount(StatusBadge, {
            props: { status },
            global: { plugins: [i18n] },
          })
          const span = wrapper.find('span')
          const classes = span.classes()
          const expected = colorMap[status].split(' ')
          for (const cls of expected) {
            expect(classes).toContain(cls)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
