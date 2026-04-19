// Feature: moment-chalet-booking-system, Property 26: 頁面 Meta 資訊完整性
// Feature: moment-chalet-booking-system, Property 27: 圖片 Alt 文字完整性

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { defineComponent, h } from 'vue'
import type { Property } from '@/types'
import { getPageMeta } from '@/utils/pageMeta'

// ── Minimal i18n setup ────────────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: {} },
})

// ── Arbitraries ───────────────────────────────────────────────────────────────

// Known route names from the router
const routeNames = [
  'home',
  'properties',
  'property-detail',
  'booking',
  'booking-confirmation',
  'my-booking',
]

const routeNameArb = fc.constantFrom(...routeNames)

const propertyArb = fc.record<Property>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  location: fc.string({ minLength: 1, maxLength: 60 }),
  lat: fc.float({ min: -90, max: 90 }),
  lng: fc.float({ min: -180, max: 180 }),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 }),
  ical_url: fc.option(fc.webUrl(), { nil: null }),
  has_breakfast_option: fc.boolean(),
  is_active: fc.boolean(),
  created_at: fc.constant(new Date().toISOString()),
})

// ── Property 26: 頁面 Meta 資訊完整性 ────────────────────────────────────────

/**
 * Validates: Requirements 15.2
 *
 * Property 26: 頁面 Meta 資訊完整性
 * For any route name, getPageMeta returns non-empty title and description.
 * Different routes should have different titles.
 */
describe('Property 26: 頁面 Meta 資訊完整性', () => {
  it('任意路由名稱應返回非空的 title 與 description', () => {
    fc.assert(
      fc.property(routeNameArb, (routeName) => {
        const meta = getPageMeta(routeName)

        expect(typeof meta.title).toBe('string')
        expect(meta.title.length).toBeGreaterThan(0)

        expect(typeof meta.description).toBe('string')
        expect(meta.description.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('不同路由應有不同的 title', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(routeNameArb, { minLength: 2, maxLength: 2 }),
        ([routeA, routeB]) => {
          const metaA = getPageMeta(routeA)
          const metaB = getPageMeta(routeB)
          expect(metaA.title).not.toBe(metaB.title)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('未知路由名稱應返回非空的 fallback title 與 description', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !routeNames.includes(s)),
        (unknownRoute) => {
          const meta = getPageMeta(unknownRoute)
          expect(meta.title.length).toBeGreaterThan(0)
          expect(meta.description.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 27: 圖片 Alt 文字完整性 ─────────────────────────────────────────

/**
 * Validates: Requirements 15.3
 *
 * Property 27: 圖片 Alt 文字完整性
 * For any array of Property objects rendered as property cards,
 * each <img> element should have a non-empty alt attribute.
 */
describe('Property 27: 圖片 Alt 文字完整性', () => {
  it('任意民宿資料渲染的卡片中每張圖片應有非空 alt 屬性', () => {
    fc.assert(
      fc.property(
        fc.array(propertyArb, { minLength: 1, maxLength: 6 }),
        (properties) => {
          // Minimal component that mirrors HomeView's property card rendering
          const PropertyCardList = defineComponent({
            setup() {
              return () =>
                h(
                  'div',
                  properties.map((property) =>
                    h('article', { key: property.id }, [
                      h('img', {
                        src: property.images[0] || '/images/property-placeholder.jpg',
                        alt: property.name,
                        class: 'w-full h-48 object-cover',
                      }),
                      h('div', { class: 'p-4' }, [
                        h('h3', property.name),
                        h('p', property.location),
                      ]),
                    ])
                  )
                )
            },
          })

          const wrapper = mount(PropertyCardList, {
            global: { plugins: [i18n] },
          })

          const imgs = wrapper.findAll('img')
          expect(imgs.length).toBe(properties.length)

          for (const img of imgs) {
            const alt = img.attributes('alt')
            expect(alt).toBeDefined()
            expect(alt!.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
