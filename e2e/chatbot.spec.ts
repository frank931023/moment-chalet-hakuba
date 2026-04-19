/**
 * E2E: Chatbot flow
 * Validates: Requirements 12.1-12.3
 */
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Mock Supabase property calls
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

  // Mock the chat edge function
  await page.route('**/functions/v1/chat*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Hello! How can I help you with your stay at Moment Chalet Hakuba?',
        tokens_used: 50,
      }),
    })
  })
})

test('chatbot toggle button is visible on home page', async ({ page }) => {
  // Requirement 12.1: chatbot button is fixed in bottom-right corner
  await page.goto('/')

  const chatButton = page.locator('button[aria-label="Toggle chat"]')
  await expect(chatButton).toBeVisible()
})

test('clicking chatbot button opens chat window', async ({ page }) => {
  // Requirement 12.2: clicking the button opens the chat window
  await page.goto('/')

  const chatButton = page.locator('button[aria-label="Toggle chat"]')
  await chatButton.click()

  // Chat window should appear
  const chatWindow = page.locator('.bg-indigo-600').filter({ hasText: 'Moment Chalet Assistant' })
  await expect(chatWindow).toBeVisible({ timeout: 5_000 })
})

test('chat window has message input', async ({ page }) => {
  // Requirement 12.3: user can type and send messages
  await page.goto('/')

  // Open chat
  await page.click('button[aria-label="Toggle chat"]')

  // Input should be visible
  const messageInput = page.locator('textarea[aria-label="Chat message input"]')
  await expect(messageInput).toBeVisible()
})

test('typing a message in chat input is accepted', async ({ page }) => {
  // Requirement 12.3: input accepts text
  await page.goto('/')

  await page.click('button[aria-label="Toggle chat"]')

  const messageInput = page.locator('textarea[aria-label="Chat message input"]')
  await messageInput.fill('What are the check-in times?')

  await expect(messageInput).toHaveValue('What are the check-in times?')
})

test('send button is present and enabled when message is typed', async ({ page }) => {
  // Requirement 12.3: send button is available
  await page.goto('/')

  await page.click('button[aria-label="Toggle chat"]')

  const messageInput = page.locator('textarea[aria-label="Chat message input"]')
  await messageInput.fill('Hello')

  const sendButton = page.locator('button[aria-label="Send message"]')
  await expect(sendButton).toBeEnabled()
})

test('closing chat window hides it', async ({ page }) => {
  // Requirement 12.2: chat window can be closed
  await page.goto('/')

  // Open chat
  await page.click('button[aria-label="Toggle chat"]')
  const chatWindow = page.locator('.bg-indigo-600').filter({ hasText: 'Moment Chalet Assistant' })
  await expect(chatWindow).toBeVisible()

  // Close chat
  await page.click('button[aria-label="Close chat"]')
  await expect(chatWindow).not.toBeVisible()
})

test('chatbot button is visible on properties page', async ({ page }) => {
  // Requirement 12.1: chatbot is present on all front-end pages
  await page.goto('/properties')

  const chatButton = page.locator('button[aria-label="Toggle chat"]')
  await expect(chatButton).toBeVisible()
})
