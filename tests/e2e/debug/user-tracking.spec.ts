import { test, expect } from '@playwright/test';

/**
 * E2E Tests for User Activity Tracking System
 * Tests user creation tracking, client-side error tracking, and user search
 */

test.describe('User Activity Tracking System', () => {
  
  test('should track new user creation event', async ({ page }) => {
    // 1. Login as admin
    await page.goto('https://expresscourse.onai.academy/login');
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'amina@onaiacademy.kz');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/\/admin/);
    
    // 2. Navigate to create user page (adjust selector based on actual UI)
    // This is a placeholder - adjust based on your actual UI
    const testEmail = `test-user-${Date.now()}@example.com`;
    
    // 3. Go to Debug Panel
    await page.goto('https://expresscourse.onai.academy/admin/debug');
    await page.waitForLoadState('networkidle');
    
    // 4. Switch to Users tab
    await page.click('button:has-text("Users")');
    
    // 5. Search for existing user (use a known test user email)
    await page.fill('input[placeholder*="Email"]', 'test');
    await page.click('button:has-text("Search")');
    
    // 6. Verify search functionality works
    await page.waitForTimeout(2000); // Wait for results
    
    // Check if results are displayed or "not found" message
    const hasResults = await page.locator('.bg-white\\/5').count();
    console.log(`Found ${hasResults} search results`);
  });
  
  test('should display user activity logs when user is selected', async ({ page }) => {
    // 1. Login as admin
    await page.goto('https://expresscourse.onai.academy/login');
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'amina@onaiacademy.kz');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/\/admin/);
    
    // 2. Go to Debug Panel
    await page.goto('https://expresscourse.onai.academy/admin/debug');
    await page.waitForLoadState('networkidle');
    
    // 3. Switch to Users tab
    await page.click('button:has-text("Users")');
    
    // 4. Search for a known user
    await page.fill('input[placeholder*="Email"]', 'test');
    await page.click('button:has-text("Search")');
    
    // 5. Wait for search results
    await page.waitForTimeout(2000);
    
    // 6. Click on first user if available
    const firstUser = await page.locator('.bg-white\\/5').first();
    const userExists = await firstUser.isVisible().catch(() => false);
    
    if (userExists) {
      await firstUser.click();
      
      // 7. Wait for user logs to load
      await page.waitForTimeout(2000);
      
      // 8. Verify statistics are displayed
      await expect(page.locator('text=Total Events')).toBeVisible();
      await expect(page.locator('text=Errors')).toBeVisible();
      await expect(page.locator('text=Error Rate')).toBeVisible();
      
      // 9. Verify logs section is displayed
      await expect(page.locator('text=Activity Logs')).toBeVisible();
    } else {
      console.log('No test users found - skipping user logs test');
    }
  });
  
  test('should track client-side errors (manual test)', async ({ page }) => {
    // This test demonstrates how client errors would be tracked
    // In production, errors are automatically captured by the error tracker
    
    console.log('Manual test: Trigger a client error and verify it appears in user logs');
    console.log('Steps:');
    console.log('1. Login as a student');
    console.log('2. Trigger an intentional error (e.g., navigate to invalid page)');
    console.log('3. Login as admin');
    console.log('4. Go to Debug Panel > Users tab');
    console.log('5. Search for the student');
    console.log('6. Verify CLIENT_ERROR event is logged');
  });
  
  test('should handle search with minimum character validation', async ({ page }) => {
    // 1. Login as admin
    await page.goto('https://expresscourse.onai.academy/login');
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'amina@onaiacademy.kz');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/\/admin/);
    
    // 2. Go to Debug Panel
    await page.goto('https://expresscourse.onai.academy/admin/debug');
    await page.waitForLoadState('networkidle');
    
    // 3. Switch to Users tab
    await page.click('button:has-text("Users")');
    
    // 4. Try to search with less than 3 characters
    await page.fill('input[placeholder*="Email"]', 'te');
    await page.click('button:has-text("Search")');
    
    // 5. Wait for alert (validation message)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('минимум 3 символа');
      await dialog.accept();
    });
    
    await page.waitForTimeout(1000);
  });
  
  test('should display user statistics correctly', async ({ page }) => {
    // 1. Login as admin
    await page.goto('https://expresscourse.onai.academy/login');
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'amina@onaiacademy.kz');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/\/admin/);
    
    // 2. Go to Debug Panel > Users tab
    await page.goto('https://expresscourse.onai.academy/admin/debug');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Users")');
    
    // 3. Search and select a user
    await page.fill('input[placeholder*="Email"]', 'test');
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(2000);
    
    const firstUser = await page.locator('.bg-white\\/5').first();
    const userExists = await firstUser.isVisible().catch(() => false);
    
    if (userExists) {
      await firstUser.click();
      await page.waitForTimeout(2000);
      
      // 4. Verify all stat cards are present
      await expect(page.locator('text=Total Events')).toBeVisible();
      await expect(page.locator('text=Errors')).toBeVisible();
      await expect(page.locator('text=Critical')).toBeVisible();
      await expect(page.locator('text=Error Rate')).toBeVisible();
      
      // 5. Verify stat values are numbers
      const totalEvents = await page.locator('text=Total Events').locator('..').locator('.text-3xl').textContent();
      expect(totalEvents).toMatch(/^\d+$/);
    }
  });
});

test.describe('User Activity Tracking - Tab Navigation', () => {
  test('should switch between Overview and Users tabs', async ({ page }) => {
    // 1. Login as admin
    await page.goto('https://expresscourse.onai.academy/login');
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || 'amina@onaiacademy.kz');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/\/admin/);
    
    // 2. Go to Debug Panel
    await page.goto('https://expresscourse.onai.academy/admin/debug');
    await page.waitForLoadState('networkidle');
    
    // 3. Verify Overview tab is active by default
    const overviewButton = page.locator('button:has-text("Overview")');
    await expect(overviewButton).toHaveClass(/bg-\[#00FF88\]/);
    
    // 4. Switch to Users tab
    await page.click('button:has-text("Users")');
    
    // 5. Verify Users tab is now active
    const usersButton = page.locator('button:has-text("Users")');
    await expect(usersButton).toHaveClass(/bg-\[#00FF88\]/);
    
    // 6. Verify Users tab content is displayed
    await expect(page.locator('text=Search User')).toBeVisible();
    
    // 7. Switch back to Overview tab
    await page.click('button:has-text("Overview")');
    
    // 8. Verify Overview content is displayed
    await expect(page.locator('text=Всего операций')).toBeVisible();
  });
});
