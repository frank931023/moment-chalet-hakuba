export interface ValidationResult {
  valid: boolean
  error?: string
  status?: number
}

const REQUIRED_FIELDS = [
  'room_type_id',
  'guest_name',
  'guest_email',
  'guest_phone',
  'check_in',
  'check_out',
  'total_amount',
]

export function validateBookingRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body', status: 400 }
  }

  const record = body as Record<string, unknown>

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      return { valid: false, error: `Missing required field: ${field}`, status: 400 }
    }
  }

  const checkIn = record['check_in'] as string
  const checkOut = record['check_out'] as string

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { valid: false, error: 'Invalid date format for check_in or check_out', status: 400 }
  }

  if (checkOutDate <= checkInDate) {
    return { valid: false, error: 'check_out must be after check_in', status: 400 }
  }

  return { valid: true }
}

export function checkDateConflict(
  checkIn: string,
  checkOut: string,
  blockedDates: Array<{ start_date: string; end_date: string }>,
): boolean {
  // A conflict exists when: blocked start_date < check_out AND blocked end_date > check_in
  return blockedDates.some(
    (blocked) => blocked.start_date < checkOut && blocked.end_date > checkIn,
  )
}
