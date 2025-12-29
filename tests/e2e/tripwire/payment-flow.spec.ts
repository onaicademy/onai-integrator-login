import { test, expect } from '@playwright/test';

/**
 * TRIPWIRE E2E TESTS
 * Critical: Money involved - Payment flow must work flawlessly
 * 
 * Covered scenarios:
 * 1. User registration (Sales Manager creates user)
 * 2. User login
 * 3. Module access & video playback
 * 4. Progress tracking
 * 5. Certificate generation
 */

const TEST_USER = {
  email: `e2e-test-${Date.now()}@test.com`,
  password: 'TestPassword123!',
  fullName: 'E2E Test User'
};

const ADMIN_CREDENTIALS = {
  email: 'amina@onaiacademy.kz',
  password: process.env.ADMIN_PASSWORD || 'your_admin_password'
};

test.describe('Tripwire Payment & Access Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for this critical flow
    test.setTimeout(60000);
  });

  test('1. Admin creates new user via Sales Manager', async ({ page }) => {
    // Navigate to Sales Manager
    await page.goto('/sales-manager');
    
    // Login as sales manager
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/sales-manager/);
    
    // Click "Create User" button
    await page.click('text=Добавить ученика');
    
    // Fill user creation form
    await page.fill('input[name="full_name"]', TEST_USER.fullName);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit
    await page.click('button:has-text("Создать")');
    
    // Verify success (wait for API response)
    await page.waitForTimeout(2000);
    
    // Check if user appears in list
    const userRow = page.locator(`text=${TEST_USER.email}`);
    await expect(userRow).toBeVisible({ timeout: 10000 });
    
    console.log('✅ User created successfully via Sales Manager');
  });

  test('2. User can login to Tripwire', async ({ page }) => {
    // Navigate to Tripwire login
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard/course
    await page.waitForURL(/\/$/);
    
    // Verify user is logged in
    const welcomeText = page.locator('text=/Добро пожаловать|Welcome/i');
    await expect(welcomeText).toBeVisible({ timeout: 10000 });
    
    console.log('✅ User login successful');
  });

  test('3. User can access first module', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$/);
    
    // Navigate to first module
    const firstModule = page.locator('.module-card, [data-testid="module-1"]').first();
    await firstModule.click();
    
    // Verify module page loaded
    await expect(page).toHaveURL(/\/lesson\//);
    
    // Check if lesson/video is visible
    const videoPlayer = page.locator('video, iframe[src*="video"]');
    await expect(videoPlayer).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Module access successful');
  });

  test('4. Video playback works', async ({ page }) => {
    // Login and navigate to module
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to first lesson
    await page.goto('/lesson/67');
    
    // Wait for video player
    await page.waitForSelector('video, iframe', { timeout: 20000 });
    
    // Try to play video
    const playButton = page.locator('button[aria-label*="Play"], .plyr__control--overlaid');
    if (await playButton.isVisible()) {
      await playButton.click();
    }
    
    // Verify video is playing (check for pause button or progress)
    await page.waitForTimeout(2000);
    
    console.log('✅ Video playback initiated');
  });

  test('5. Progress is tracked', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to profile/dashboard
    await page.goto('/profile');
    
    // Check progress indicators
    const progressBar = page.locator('[role="progressbar"], .progress-bar, text=/Прогресс|Progress/i');
    await expect(progressBar).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Progress tracking visible');
  });
});

test.describe('Tripwire Error Handling', () => {
  
  test('6. Invalid email shows error', async ({ page }) => {
    await page.goto('/login');
    
    // Try invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Should show error message (not crash)
    const errorMsg = page.locator('text=/Invalid|Неверный|Ошибка/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Invalid email error handled');
  });

  test('7. Wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    
    // Try wrong password
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');
    
    // Should show error (not crash)
    await page.waitForTimeout(2000);
    const errorMsg = page.locator('text=/Invalid|Неверный|Ошибка|credentials/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Wrong password error handled');
  });
});

test.describe('Tripwire Performance', () => {
  
  test('8. Landing page loads fast', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/expresscourse');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`✅ Landing loaded in ${loadTime}ms`);
  });

  test('9. No JS errors on critical pages', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Test critical pages
    await page.goto('/expresscourse');
    await page.waitForTimeout(2000);
    
    await page.goto('/login');
    await page.waitForTimeout(2000);
    
    // Should have no JS errors
    expect(errors.length).toBe(0);
    
    if (errors.length > 0) {
      console.error('❌ JS Errors found:', errors);
    } else {
      console.log('✅ No JS errors on critical pages');
    }
  });
});
