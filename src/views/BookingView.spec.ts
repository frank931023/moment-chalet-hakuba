// Feature: moment-chalet-booking-system, Property 10: 必填欄位驗證
import fc from 'fast-check'
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { validateGuestForm } from '@/utils/formValidation'

/**
 * Validates: Requirements 4.4
 *
 * Property 10: 必填欄位驗證
 * For any form submission where guestName, guestEmail, or guestPhone is
 * empty/whitespace-only, the form should be invalid.
 * For any form submission where all three fields are non-empty (and email
 * has valid format), the form should be valid.
 */

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Non-empty, non-whitespace-only string */
const nonEmptyString = fc.string({ minLength: 1 }).filter(s => s.trim() !== '')

/** Whitespace-only string (at least one space/tab/newline) */
const whitespaceString = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
  .map(arr => arr.join(''))

/** Simple valid email: localPart@domain.tld */
const validEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z]{2,4}$/)
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

// ── Unit tests: validateGuestForm ─────────────────────────────────────────────

describe('validateGuestForm', () => {
  it('returns valid when all fields are non-empty with valid email', () => {
    const result = validateGuestForm('Alice', 'alice@example.com', '0912345678')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('returns invalid when name is empty', () => {
    const result = validateGuestForm('', 'alice@example.com', '0912345678')
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('returns invalid when email is empty', () => {
    const result = validateGuestForm('Alice', '', '0912345678')
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBeDefined()
  })

  it('returns invalid when phone is empty', () => {
    const result = validateGuestForm('Alice', 'alice@example.com', '')
    expect(result.valid).toBe(false)
    expect(result.errors.phone).toBeDefined()
  })

  it('returns invalid when name is whitespace-only', () => {
    const result = validateGuestForm('   ', 'alice@example.com', '0912345678')
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('returns invalid when email is whitespace-only', () => {
    const result = validateGuestForm('Alice', '   ', '0912345678')
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBeDefined()
  })

  it('returns invalid when phone is whitespace-only', () => {
    const result = validateGuestForm('Alice', 'alice@example.com', '   ')
    expect(result.valid).toBe(false)
    expect(result.errors.phone).toBeDefined()
  })

  it('returns invalid when email format is wrong', () => {
    const result = validateGuestForm('Alice', 'not-an-email', '0912345678')
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBeDefined()
  })
})

// ── Unit tests: useBookingStore.isStep2Complete ───────────────────────────────

describe('useBookingStore – isStep2Complete', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is false when all fields are empty', () => {
    const store = useBookingStore()
    expect(store.isStep2Complete).toBe(false)
  })

  it('is false when only name is set', () => {
    const store = useBookingStore()
    store.guestName = 'Alice'
    expect(store.isStep2Complete).toBe(false)
  })

  it('is false when name and email are set but phone is missing', () => {
    const store = useBookingStore()
    store.guestName = 'Alice'
    store.guestEmail = 'alice@example.com'
    expect(store.isStep2Complete).toBe(false)
  })

  it('is true when all three fields are non-empty', () => {
    const store = useBookingStore()
    store.guestName = 'Alice'
    store.guestEmail = 'alice@example.com'
    store.guestPhone = '0912345678'
    expect(store.isStep2Complete).toBe(true)
  })

  it('is false when any field is whitespace-only', () => {
    const store = useBookingStore()
    store.guestName = '   '
    store.guestEmail = 'alice@example.com'
    store.guestPhone = '0912345678'
    expect(store.isStep2Complete).toBe(false)

    store.guestName = 'Alice'
    store.guestEmail = '   '
    expect(store.isStep2Complete).toBe(false)

    store.guestEmail = 'alice@example.com'
    store.guestPhone = '   '
    expect(store.isStep2Complete).toBe(false)
  })
})

// ── Property 10: 必填欄位驗證 ─────────────────────────────────────────────────

describe('Property 10: 必填欄位驗證', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('任一欄位為空或純空白時，validateGuestForm 回傳 invalid', () => {
    // name is empty/whitespace
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), whitespaceString),
        validEmail,
        nonEmptyString,
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          return result.valid === false
        }
      ),
      { numRuns: 100 }
    )

    // email is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        fc.oneof(fc.constant(''), whitespaceString),
        nonEmptyString,
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          return result.valid === false
        }
      ),
      { numRuns: 100 }
    )

    // phone is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        validEmail,
        fc.oneof(fc.constant(''), whitespaceString),
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          return result.valid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('三個欄位皆非空且 email 格式正確時，validateGuestForm 回傳 valid', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        validEmail,
        nonEmptyString,
        (name, email, phone) => {
          const result = validateGuestForm(name, email, phone)
          return result.valid === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('任一欄位為空或純空白時，isStep2Complete 為 false', () => {
    // name is empty/whitespace
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), whitespaceString),
        nonEmptyString,
        nonEmptyString,
        (name, email, phone) => {
          const store = useBookingStore()
          store.guestName = name
          store.guestEmail = email
          store.guestPhone = phone
          return store.isStep2Complete === false
        }
      ),
      { numRuns: 100 }
    )

    // email is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        fc.oneof(fc.constant(''), whitespaceString),
        nonEmptyString,
        (name, email, phone) => {
          const store = useBookingStore()
          store.guestName = name
          store.guestEmail = email
          store.guestPhone = phone
          return store.isStep2Complete === false
        }
      ),
      { numRuns: 100 }
    )

    // phone is empty/whitespace
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.oneof(fc.constant(''), whitespaceString),
        (name, email, phone) => {
          const store = useBookingStore()
          store.guestName = name
          store.guestEmail = email
          store.guestPhone = phone
          return store.isStep2Complete === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('三個欄位皆非空時，isStep2Complete 為 true', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        nonEmptyString,
        (name, email, phone) => {
          const store = useBookingStore()
          store.guestName = name
          store.guestEmail = email
          store.guestPhone = phone
          return store.isStep2Complete === true
        }
      ),
      { numRuns: 100 }
    )
  })
})
