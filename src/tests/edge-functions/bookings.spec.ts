import { describe, it, expect } from 'vitest'
import { validateBookingRequest, checkDateConflict } from '../../utils/bookingValidation'

const validBody = {
  room_type_id: 'room-123',
  guest_name: 'Alice',
  guest_email: 'alice@example.com',
  guest_phone: '+886912345678',
  check_in: '2025-08-01',
  check_out: '2025-08-05',
  total_amount: 20000,
}

describe('validateBookingRequest', () => {
  it('returns valid for a complete, correct request', () => {
    const result = validateBookingRequest(validBody)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns 400 when a required field is missing', () => {
    const { guest_name: _omit, ...body } = validBody
    const result = validateBookingRequest(body)
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(/guest_name/)
  })

  it('returns 400 when a required field is empty string', () => {
    const result = validateBookingRequest({ ...validBody, guest_email: '' })
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(/guest_email/)
  })

  it('returns 400 when check_out is before check_in', () => {
    const result = validateBookingRequest({
      ...validBody,
      check_in: '2025-08-10',
      check_out: '2025-08-05',
    })
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(/check_out must be after check_in/)
  })

  it('returns 400 when check_out equals check_in', () => {
    const result = validateBookingRequest({
      ...validBody,
      check_in: '2025-08-05',
      check_out: '2025-08-05',
    })
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })

  it('returns 400 for invalid date format', () => {
    const result = validateBookingRequest({ ...validBody, check_in: 'not-a-date' })
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })

  it('returns 400 when body is not an object', () => {
    const result = validateBookingRequest(null)
    expect(result.valid).toBe(false)
    expect(result.status).toBe(400)
  })
})

describe('checkDateConflict', () => {
  it('returns false when there are no blocked dates', () => {
    expect(checkDateConflict('2025-08-01', '2025-08-05', [])).toBe(false)
  })

  it('returns false when blocked range is entirely before check-in', () => {
    const blocked = [{ start_date: '2025-07-01', end_date: '2025-07-31' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(false)
  })

  it('returns false when blocked range is entirely after check-out', () => {
    const blocked = [{ start_date: '2025-08-10', end_date: '2025-08-15' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(false)
  })

  it('returns true when blocked range fully overlaps the booking (409 Conflict)', () => {
    const blocked = [{ start_date: '2025-07-30', end_date: '2025-08-10' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(true)
  })

  it('returns true when blocked range partially overlaps at the start', () => {
    const blocked = [{ start_date: '2025-07-28', end_date: '2025-08-03' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(true)
  })

  it('returns true when blocked range partially overlaps at the end', () => {
    const blocked = [{ start_date: '2025-08-04', end_date: '2025-08-08' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(true)
  })

  it('returns false when blocked range ends exactly on check-in (adjacent, no overlap)', () => {
    // end_date === check_in: condition is end_date > check_in → false
    const blocked = [{ start_date: '2025-07-28', end_date: '2025-08-01' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(false)
  })

  it('returns false when blocked range starts exactly on check-out (adjacent, no overlap)', () => {
    // start_date === check_out: condition is start_date < check_out → false
    const blocked = [{ start_date: '2025-08-05', end_date: '2025-08-10' }]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(false)
  })

  it('detects conflict in concurrent booking scenario with multiple blocked ranges', () => {
    // Simulates two concurrent bookings where one conflicts
    const blocked = [
      { start_date: '2025-07-01', end_date: '2025-07-31' }, // no conflict
      { start_date: '2025-08-03', end_date: '2025-08-07' }, // conflict
    ]
    expect(checkDateConflict('2025-08-01', '2025-08-05', blocked)).toBe(true)
  })
})
