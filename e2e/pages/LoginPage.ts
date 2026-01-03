/**
 * Login Page Object Model
 *
 * Handles authentication for both Admin and Targetologist users
 */

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.emailInput = page.getByPlaceholder(/email|почта/i).or(page.locator('input[type="email"]'));
    this.passwordInput = page.getByPlaceholder(/password|пароль/i).or(page.locator('input[type="password"]'));
    this.loginButton = page.getByRole('button', { name: /войти|login|sign in/i });
    this.errorMessage = page.locator('[class*="error"], [class*="alert"], .toast-error');
    this.forgotPasswordLink = page.getByText(/forgot|забыл/i);
    this.logo = page.locator('[class*="logo"], img[alt*="logo"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();

    // Wait for navigation or error
    await Promise.race([
      this.page.waitForURL(/dashboard|traffic/i, { timeout: 15000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);
  }

  /**
   * Login as Admin
   */
  async loginAsAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    await this.login(email, password);
  }

  /**
   * Login as Targetologist
   */
  async loginAsTargetologist() {
    const email = process.env.TARGETOLOGIST_EMAIL || 'icekvup@gmail.com';
    const password = process.env.TARGETOLOGIST_PASSWORD || 'admin123';
    await this.login(email, password);
  }

  /**
   * Check if login was successful
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForURL(/dashboard|traffic/i, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Assert login page is displayed
   */
  async assertLoginPageDisplayed() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
