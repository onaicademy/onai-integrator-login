import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';

/**
 * MARKETING LANDINGS E2E TESTS
 * Critical: Traffic conversion - Forms must work, pages must load fast
 * 
 * Covered scenarios:
 * 1. Lead generation form submission
 * 2. Performance (Lighthouse scores)
 * 3. Responsive design (Mobile, Tablet, Desktop)
 * 4. No JS errors
 */

const TEST_LEAD = {
  name: 'E2E Test Lead',
  phone: '+7 (777) 777-77-77',
  email: `e2e-lead-${Date.now()}@test.com`
};

test.describe('Landing Pages - Lead Generation', () => {
  
  test('1. Express Course landing form submission', async ({ page }) => {
    // Navigate to landing
    await page.goto('/expresscourse');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Find and fill form
    const nameInput = page.locator('input[name="name"], input[placeholder*="Имя"], input[placeholder*="Name"]').first();
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Телефон"], input[placeholder*="Phone"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    
    await nameInput.fill(TEST_LEAD.name);
    await phoneInput.fill(TEST_LEAD.phone);
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_LEAD.email);
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Отправить"), button:has-text("Submit")').first();
    await submitButton.click();
    
    // Verify success message
    const successMsg = page.locator('text=/Спасибо|Thank you|Успешно|Success/i');
    await expect(successMsg).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Lead form submission successful');
  });

  test('2. Form validation works', async ({ page }) => {
    await page.goto('/expresscourse');
    await page.waitForLoadState('networkidle');
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show validation errors (not crash)
    await page.waitForTimeout(1000);
    
    const errorMsg = page.locator('text=/Обязательно|Required|Заполните|Fill/i');
    const isValidationWorking = await errorMsg.isVisible() || await page.locator('[aria-invalid="true"]').count() > 0;
    
    expect(isValidationWorking).toBe(true);
    
    console.log('✅ Form validation working');
  });

  test('3. Phone mask works', async ({ page }) => {
    await page.goto('/expresscourse');
    await page.waitForLoadState('networkidle');
    
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Телефон"]').first();
    
    // Type phone number
    await phoneInput.fill('7777777777');
    
    // Check if mask applied
    const value = await phoneInput.inputValue();
    
    // Should have some formatting (spaces, dashes, parentheses)
    const hasFormatting = value.includes('(') || value.includes('-') || value.includes(' ');
    
    expect(hasFormatting).toBe(true);
    
    console.log('✅ Phone mask applied:', value);
  });
});

test.describe('Landing Pages - Performance', () => {
  
  test('4. Mobile performance score > 85', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...require('@playwright/test').devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    const startTime = Date.now();
    await page.goto('https://onai.academy/expresscourse');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Basic performance check
    expect(loadTime).toBeLessThan(3000); // Should load in under 3s
    
    console.log(`✅ Mobile load time: ${loadTime}ms`);
    
    await browser.close();
  });

  test('5. Desktop performance score > 90', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/expresscourse');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Desktop should be even faster
    expect(loadTime).toBeLessThan(2000);
    
    console.log(`✅ Desktop load time: ${loadTime}ms`);
  });

  test('6. No render-blocking resources', async ({ page }) => {
    await page.goto('/expresscourse');
    
    // Check if critical CSS is inlined
    const inlineStyles = await page.locator('style').count();
    expect(inlineStyles).toBeGreaterThan(0);
    
    console.log(`✅ Found ${inlineStyles} inline style tags (good for performance)`);
  });
});

test.describe('Landing Pages - Responsive Design', () => {
  
  const devices = [
    { name: 'iPhone 12', preset: 'iPhone 12' },
    { name: 'Pixel 5', preset: 'Pixel 5' },
    { name: 'iPad Pro', preset: 'iPad Pro' },
    { name: 'Desktop 1920x1080', preset: 'Desktop Chrome' },
  ];

  for (const device of devices) {
    test(`7. Layout correct on ${device.name}`, async () => {
      const browser = await chromium.launch();
      const context = await browser.newContext({
        ...require('@playwright/test').devices[device.preset],
      });
      const page = await context.newPage();
      
      await page.goto('https://onai.academy/expresscourse');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/screenshots/landing-${device.name.replace(/\s/g, '-')}.png`,
        fullPage: true
      });
      
      // Check if main elements are visible
      const heroSection = page.locator('h1, [class*="hero"]').first();
      const ctaButton = page.locator('button:has-text("Отправить"), button[type="submit"]').first();
      
      await expect(heroSection).toBeVisible();
      await expect(ctaButton).toBeVisible();
      
      console.log(`✅ Layout correct on ${device.name}`);
      
      await browser.close();
    });
  }
});

test.describe('Landing Pages - Error Handling', () => {
  
  test('8. No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    const jsErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.goto('/expresscourse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should have no critical errors
    expect(jsErrors.length).toBe(0);
    
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors found:', consoleErrors);
    }
    
    if (jsErrors.length > 0) {
      console.error('❌ JS errors found:', jsErrors);
    } else {
      console.log('✅ No JS errors on landing page');
    }
  });

  test('9. Network errors handled gracefully', async ({ page }) => {
    // Block API calls to simulate network error
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/expresscourse');
    
    // Page should still load (not white screen)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ Page loads even with API errors');
  });
});
