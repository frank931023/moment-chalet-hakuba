/**
 * E2E: Order lookup flow
 * Validates: Requirements 7.1-7.3
 */
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock Supabase bookings query — return empty for invalid input
  await page.route('**/rest/v1/bookings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
})

test('my-booking page loads with search form', async ({ page }) => {
  // Requirement 7.1: page provides email and booking ID input fields
  await page.goto('/my-booking')

  await expect(page.locator('#lookup-email')).toBeVisible()
  await expect(page.locator('#lookup-booking-id')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('shows "no booking found" for invalid input', async ({ page }) => {
  // Requirement 7.3: invalid email/booking ID shows "no booking found"
  await page.goto('/my-booking')

  await page.fill('#lookup-email', 'notexist@example.com')
  await page.fill('#lookup-booking-id', 'invalid-id-12345')
  await page.click('button[type="submit"]')

  // Wait for the not-found message
  const notFoundAlert = page.locator('[role="alert"]').filter({ hasText: /no booking|查無訂單/i })
  await expect(notFoundAlert).toBeVisible({ timeout: 10_000 })
})

test('shows validation error when fields are empty', async ({ page }) => {
  // Requirement 7.1: both fields are required
  await page.goto('/my-booking')

  // Submit without filling in fields
  await page.click('button[type="submit"]')

  // Should show a validation error
  const errorAlert = page.locator('[role="alert"]')
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })
})

test('search button is present and clickable', async ({ page }) => {
  // Requirement 7.1: search button exists
  await page.goto('/my-booking')

  const searchBtn = page.locator('button[type="submit"]')
  await expect(searchBtn).toBeVisible()
  await expect(searchBtn).toBeEnabled()
})

test('page title is set correctly', async ({ page }) => {
  await page.goto('/my-booking')
  await expect(page).toHaveTitle(/Moment Chalet/)
})
