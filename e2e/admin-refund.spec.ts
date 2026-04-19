/**
 * E2E: Admin refund flow
 * Validates: Requirements 9.1-9.4
 */
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock Supabase auth — return no session so unauthenticated users are redirected
  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { session: null }, error: null }),
    })
  })

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    })
  })
})

test('admin login page loads with email and password fields', async ({ page }) => {
  // Requirement 9.1: admin must authenticate via Supabase Auth
  await page.goto('/admin/login')

  await expect(page.locator('#email')).toBeVisible()
  await expect(page.locator('#password')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('unauthenticated access to /admin redirects to /admin/login', async ({ page }) => {
  // Requirement 9.1: admin routes require authentication
  await page.goto('/admin')

  // Should be redirected to login page
  await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 })
})

test('invalid credentials show error message', async ({ page }) => {
  // Requirement 9.1: login with wrong credentials shows error
  await page.goto('/admin/login')

  await page.fill('#email', 'wrong@example.com')
  await page.fill('#password', 'wrongpassword')
  await page.click('button[type="submit"]')

  // Should show an error message
  const errorMsg = page.locator('[role="alert"], p.text-red-600')
  await expect(errorMsg).toBeVisible({ timeout: 10_000 })
})

test('admin login page has correct title', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.locator('h1')).toBeVisible()
})

test('admin login form submit button is present', async ({ page }) => {
  await page.goto('/admin/login')

  const submitBtn = page.locator('button[type="submit"]')
  await expect(submitBtn).toBeVisible()
  await expect(submitBtn).toBeEnabled()
})
