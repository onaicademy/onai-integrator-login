/**
 * E2E Tests for Traffic Dashboard
 * Self-Validating UI Architecture - The Mirror Rule
 * 
 * "If it's not tested and logged, it doesn't exist."
 */

import { test, expect } from '@playwright/test';

test.describe('Traffic Dashboard - Critical User Flows', () => {
  
  // Test Setup
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/traffic/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Verify login page elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/traffic/dashboard/**', { timeout: 10000 });
    
    // Verify dashboard loaded
    await expect(page.locator('text=Traffic Dashboard')).toBeVisible();
  });

  test('should toggle language between RU and KZ', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Find and click language toggle button
    const languageToggle = page.locator('[data-tour="language-toggle"]');
    await expect(languageToggle).toBeVisible();
    
    // Get initial language
    const initialText = await languageToggle.textContent();
    
    // Toggle language
    await languageToggle.click();
    
    // Verify language changed
    const newText = await languageToggle.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should filter results to show only user team', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Find My Results button
    const myResultsButton = page.locator('[data-tour="my-results-button"]');
    await expect(myResultsButton).toBeVisible();
    
    // Click to filter to my team only
    await myResultsButton.click();
    
    // Verify button state changed
    await expect(myResultsButton).toHaveClass(/bg-\[#00FF88\]/);
  });

  test('should switch between ExpressCourse and Main Products tabs', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Click ExpressCourse tab
    const expressTab = page.locator('[data-tour="express-course-tab"]');
    await expect(expressTab).toBeVisible();
    await expressTab.click();
    
    // Verify ExpressCourse tab is active
    await expect(expressTab).toHaveClass(/bg-\[#00FF88\]/);
    
    // Click Main Products tab
    const mainProductsTab = page.locator('[data-tour="main-products-tab"]');
    await mainProductsTab.click();
    
    // Verify Main Products tab is active
    await expect(mainProductsTab).toHaveClass(/bg-\[#00FF88\]/);
  });

  test('should navigate to detailed analytics', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Click Analytics button
    const analyticsButton = page.locator('[data-tour="analytics-button"]');
    await expect(analyticsButton).toBeVisible();
    await analyticsButton.click();
    
    // Verify navigation
    await page.waitForURL('**/detailed-analytics');
  });

  test('should navigate to settings', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Click Settings button
    const settingsButton = page.locator('[data-tour="settings-button"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    
    // Verify navigation
    await page.waitForURL('**/settings');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Выйти")');
    await logoutButton.click();
    
    // Verify redirected to login
    await page.waitForURL('**/login');
  });

  test('should open Debug Panel with keyboard shortcut', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    // Press Ctrl/Cmd + Shift + D
    await page.keyboard.press('Control+Shift+D');
    
    // Verify Debug Panel opened
    await expect(page.locator('text=Debug & Health Check')).toBeVisible();
  });

  test('should start onboarding tour on first visit', async ({ page }) => {
    // Login as new user (clear storage first)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    await loginAsTestUser(page);
    
    // Wait for onboarding hint
    await expect(page.locator('text=Добро пожаловать!')).toBeVisible({ timeout: 5000 });
    
    // Click start tour button
    await page.click('button:has-text("Начать")');
    
    // Verify intro.js tour started
    await expect(page.locator('.introjs-tooltip')).toBeVisible();
  });
});

// ==================== HELPER FUNCTIONS ====================

async function loginAsTestUser(page: any) {
  await page.goto('/traffic/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/traffic/dashboard/**', { timeout: 10000 });
}
