// Feature: moment-chalet-booking-system, Property 20: 預算警示進度條顏色規則

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ── Pure helper (mirrored from AdminCostsView.vue) ────────────────────────────

function getBudgetColor(actual: number, budget: number): 'green' | 'yellow' | 'red' {
  const ratio = actual / budget
  if (ratio < 0.5) return 'green'
  if (ratio < 0.8) return 'yellow'
  return 'red'
}

// ── Property 20: 預算警示進度條顏色規則 ──────────────────────────────────────

/**
 * Validates: Requirements 11.6
 *
 * Property 20: 預算警示進度條顏色規則
 * For any actual cost and budget:
 *   - actual / budget < 0.5  → green
 *   - 0.5 ≤ actual / budget < 0.8 → yellow
 *   - actual / budget ≥ 0.8 → red
 */
describe('Property 20: 預算警示進度條顏色規則', () => {
  // Positive budget to avoid division by zero; use Math.fround for 32-bit float compliance
  const arbBudget = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true })

  it('actual / budget < 0.5 → green', () => {
    fc.assert(
      fc.property(
        arbBudget,
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true, noDefaultInfinity: true }),
        (budget, ratio) => {
          fc.pre(ratio < 0.5)
          const actual = ratio * budget
          return getBudgetColor(actual, budget) === 'green'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('0.5 ≤ actual / budget < 0.8 → yellow', () => {
    // Generate ratio directly in [0.5, 0.8) to avoid pre-condition skips
    const arbYellowRatio = fc.float({ min: Math.fround(0.5), max: Math.fround(0.799), noNaN: true, noDefaultInfinity: true })
    fc.assert(
      fc.property(
        arbBudget,
        arbYellowRatio,
        (budget, ratio) => {
          const actual = ratio * budget
          return getBudgetColor(actual, budget) === 'yellow'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('actual / budget ≥ 0.8 → red', () => {
    fc.assert(
      fc.property(
        arbBudget,
        fc.float({ min: Math.fround(0.8), max: Math.fround(2), noNaN: true, noDefaultInfinity: true }),
        (budget, ratio) => {
          const actual = ratio * budget
          return getBudgetColor(actual, budget) === 'red'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('color is always one of green, yellow, or red', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true }),
        arbBudget,
        (actual, budget) => {
          const color = getBudgetColor(actual, budget)
          return color === 'green' || color === 'yellow' || color === 'red'
        }
      ),
      { numRuns: 100 }
    )
  })
})
