/**
 * Pure form validation utilities for the booking system.
 */

export function validateGuestForm(
  name: string,
  email: string,
  phone: string
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (name.trim() === '') {
    errors.name = 'Guest name is required'
  }

  if (email.trim() === '') {
    errors.email = 'Guest email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Guest email is invalid'
  }

  if (phone.trim() === '') {
    errors.phone = 'Guest phone is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
