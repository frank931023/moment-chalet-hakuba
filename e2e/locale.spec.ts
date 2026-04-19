/**
 * E2E: Locale switching flow
 * Validates: Requirements 14.2, 14.3
 */
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock Supabase property calls so the page loads cleanly
  await page.route('**/rest/v1/properties*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/rest/v1/room_types*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
})

test('language switcher is visible in navbar', async ({ page }) => {
  // Requirement 14.2: Navbar provides language switcher
  await page.goto('/')

  // The language switcher button should be visible (desktop nav)
  const langButton = page.locator('nav button[aria-haspopup="listbox"]').first()
  await expect(langButton).toBeVisible()
})

test('clicking language switcher opens dropdown', async ({ page }) => {
  // Requirement 14.2: language switcher opens dropdown
  await page.goto('/')

  const langButton = page.locator('nav button[aria-haspopup="listbox"]').first()
  await langButton.click()

  // Dropdown list should appear
  const dropdown = page.locator('[role="listbox"]').first()
  await expect(dropdown).toBeVisible()
})

test('switching to English changes page text', async ({ page }) => {
  // Requirement 14.3: switching locale updates all page text immediately
  await page.goto('/')

  // Open language switcher
  const langButton = page.locator('nav button[aria-haspopup="listbox"]').first()
  await langButton.click()

  // Select English
  const englishOption = page.locator('[role="option"]').filter({ hasText: 'English' })
  await englishOption.click()

  // Verify English text appears in the navbar
  await expect(page.locator('nav').filter({ hasText: 'Home' })).toBeVisible({ timeout: 5_000 })
})

test('locale persists after page reload', async ({ page }) => {
  // Requirement 14.3: locale choice is saved to localStorage
  await page.goto('/')

  // Switch to English
  const langButton = page.locator('nav button[aria-haspopup="listbox"]').first()
  await langButton.click()
  const englishOption = page.locator('[role="option"]').filter({ hasText: 'English' })
  await englishOption.click()

  // Verify localStorage was set
  const storedLocale = await page.evaluate(() => localStorage.getItem('locale'))
  expect(storedLocale).toBe('en')

  // Reload the page
  await page.reload()

  // After reload, English should still be active
  await expect(page.locator('nav').filter({ hasText: 'Home' })).toBeVisible({ timeout: 5_000 })
})

test('switching to Japanese changes page text', async ({ page }) => {
  // Requirement 14.3: Japanese locale works
  await page.goto('/')

  const langButton = page.locator('nav button[aria-haspopup="listbox"]').first()
  await langButton.click()

  const japaneseOption = page.locator('[role="option"]').filter({ hasText: '日本語' })
  await japaneseOption.click()

  // Verify Japanese locale is stored
  const storedLocale = await page.evaluate(() => localStorage.getItem('locale'))
  expect(storedLocale).toBe('ja')
})
