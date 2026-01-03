/**
 * Settings Page Object Model
 *
 * Handles user settings, UTM configuration, and integrations
 */

import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;

  // Navigation Tabs
  readonly profileTab: Locator;
  readonly utmTab: Locator;
  readonly integrationsTab: Locator;
  readonly notificationsTab: Locator;

  // Profile Section
  readonly profileForm: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly teamNameInput: Locator;
  readonly phoneInput: Locator;
  readonly saveProfileButton: Locator;

  // UTM Settings Section
  readonly utmSection: Locator;
  readonly utmSourcesList: Locator;
  readonly addUtmButton: Locator;
  readonly utmSourceInput: Locator;
  readonly utmMediumInput: Locator;
  readonly funnelTypeSelect: Locator;
  readonly saveUtmButton: Locator;
  readonly deleteUtmButton: Locator;

  // Funnel Checkboxes
  readonly funnelCheckboxes: Locator;
  readonly expressCheckbox: Locator;
  readonly challenge3dCheckbox: Locator;
  readonly intensive1dCheckbox: Locator;

  // Integrations Section
  readonly integrationsSection: Locator;
  readonly facebookConnect: Locator;
  readonly facebookStatus: Locator;
  readonly amocrmConnect: Locator;
  readonly amocrmStatus: Locator;
  readonly disconnectButton: Locator;

  // Notifications Section
  readonly notificationsSection: Locator;
  readonly emailNotifications: Locator;
  readonly telegramNotifications: Locator;
  readonly telegramBotLink: Locator;

  // Common
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation Tabs
    this.profileTab = page.getByRole('tab', { name: /profile|профиль/i });
    this.utmTab = page.getByRole('tab', { name: /utm|источник/i });
    this.integrationsTab = page.getByRole('tab', { name: /integration|интеграц/i });
    this.notificationsTab = page.getByRole('tab', { name: /notification|уведомлен/i });

    // Profile Section
    this.profileForm = page.locator('form[class*="profile"], [class*="profile-form"]');
    this.fullNameInput = page.getByLabel(/full name|имя|фио/i).or(page.locator('input[name="fullName"]'));
    this.emailInput = page.getByLabel(/email|почта/i).or(page.locator('input[name="email"]'));
    this.teamNameInput = page.getByLabel(/team|команда/i).or(page.locator('input[name="teamName"]'));
    this.phoneInput = page.getByLabel(/phone|телефон/i).or(page.locator('input[name="phone"]'));
    this.saveProfileButton = page.getByRole('button', { name: /save|сохранить/i }).first();

    // UTM Settings Section
    this.utmSection = page.locator('[class*="utm-settings"], [data-section="utm"]');
    this.utmSourcesList = page.locator('[class*="utm-list"], table[class*="utm"]');
    this.addUtmButton = page.getByRole('button', { name: /add utm|добавить/i });
    this.utmSourceInput = page.getByLabel(/utm_source/i).or(page.locator('input[name="utmSource"]'));
    this.utmMediumInput = page.getByLabel(/utm_medium/i).or(page.locator('input[name="utmMedium"]'));
    this.funnelTypeSelect = page.locator('select[name="funnelType"], [class*="funnel-select"]');
    this.saveUtmButton = page.getByRole('button', { name: /save utm|сохранить/i });
    this.deleteUtmButton = page.getByRole('button', { name: /delete|удалить/i });

    // Funnel Checkboxes
    this.funnelCheckboxes = page.locator('[class*="funnel-checkboxes"], [class*="enabled-funnels"]');
    this.expressCheckbox = page.getByRole('checkbox', { name: /express/i });
    this.challenge3dCheckbox = page.getByRole('checkbox', { name: /challenge/i });
    this.intensive1dCheckbox = page.getByRole('checkbox', { name: /intensive/i });

    // Integrations Section
    this.integrationsSection = page.locator('[class*="integrations"], [data-section="integrations"]');
    this.facebookConnect = page.getByRole('button', { name: /connect facebook|подключить facebook/i });
    this.facebookStatus = page.locator('[class*="facebook-status"], [data-integration="facebook"]');
    this.amocrmConnect = page.getByRole('button', { name: /connect amocrm|подключить amocrm/i });
    this.amocrmStatus = page.locator('[class*="amocrm-status"], [data-integration="amocrm"]');
    this.disconnectButton = page.getByRole('button', { name: /disconnect|отключить/i });

    // Notifications Section
    this.notificationsSection = page.locator('[class*="notifications"], [data-section="notifications"]');
    this.emailNotifications = page.getByRole('checkbox', { name: /email/i });
    this.telegramNotifications = page.getByRole('checkbox', { name: /telegram/i });
    this.telegramBotLink = page.getByRole('link', { name: /telegram bot/i });

    // Common
    this.successMessage = page.locator('[class*="success"], [role="alert"]').filter({ hasText: /success|успеш/i });
    this.errorMessage = page.locator('[class*="error"], [role="alert"]').filter({ hasText: /error|ошибка/i });
    this.loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');
  }

  /**
   * Navigate to settings page
   */
  async goto() {
    await this.page.goto('/settings');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Assert settings page is displayed
   */
  async assertSettingsPageDisplayed() {
    await expect(this.page).toHaveURL(/settings/i);
  }

  /**
   * Switch to Profile tab
   */
  async goToProfileTab() {
    if (await this.profileTab.isVisible()) {
      await this.profileTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Switch to UTM tab
   */
  async goToUtmTab() {
    if (await this.utmTab.isVisible()) {
      await this.utmTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Switch to Integrations tab
   */
  async goToIntegrationsTab() {
    if (await this.integrationsTab.isVisible()) {
      await this.integrationsTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Update profile information
   */
  async updateProfile(data: { fullName?: string; email?: string; teamName?: string; phone?: string }) {
    await this.goToProfileTab();

    if (data.fullName && await this.fullNameInput.isVisible()) {
      await this.fullNameInput.clear();
      await this.fullNameInput.fill(data.fullName);
    }

    if (data.teamName && await this.teamNameInput.isVisible()) {
      await this.teamNameInput.clear();
      await this.teamNameInput.fill(data.teamName);
    }

    if (data.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.clear();
      await this.phoneInput.fill(data.phone);
    }

    await this.saveProfileButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Add new UTM source
   */
  async addUtmSource(utmSource: string, funnelType: 'express' | 'challenge3d' | 'intensive1d', utmMedium?: string) {
    await this.goToUtmTab();

    if (await this.addUtmButton.isVisible()) {
      await this.addUtmButton.click();
    }

    await this.utmSourceInput.fill(utmSource);

    if (utmMedium && await this.utmMediumInput.isVisible()) {
      await this.utmMediumInput.fill(utmMedium);
    }

    if (await this.funnelTypeSelect.isVisible()) {
      await this.funnelTypeSelect.selectOption(funnelType);
    }

    await this.saveUtmButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Get all configured UTM sources
   */
  async getUtmSources(): Promise<string[]> {
    await this.goToUtmTab();
    const rows = this.utmSourcesList.locator('tr, [class*="utm-item"]');
    const count = await rows.count();
    const sources: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      if (text) sources.push(text.trim());
    }

    return sources;
  }

  /**
   * Enable/disable funnel types
   */
  async setEnabledFunnels(funnels: { express?: boolean; challenge3d?: boolean; intensive1d?: boolean }) {
    await this.goToUtmTab();

    if (funnels.express !== undefined && await this.expressCheckbox.isVisible()) {
      const isChecked = await this.expressCheckbox.isChecked();
      if (isChecked !== funnels.express) {
        await this.expressCheckbox.click();
      }
    }

    if (funnels.challenge3d !== undefined && await this.challenge3dCheckbox.isVisible()) {
      const isChecked = await this.challenge3dCheckbox.isChecked();
      if (isChecked !== funnels.challenge3d) {
        await this.challenge3dCheckbox.click();
      }
    }

    if (funnels.intensive1d !== undefined && await this.intensive1dCheckbox.isVisible()) {
      const isChecked = await this.intensive1dCheckbox.isChecked();
      if (isChecked !== funnels.intensive1d) {
        await this.intensive1dCheckbox.click();
      }
    }

    // Save if there's a save button
    const saveBtn = this.page.getByRole('button', { name: /save|сохранить/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Get enabled funnels
   */
  async getEnabledFunnels(): Promise<string[]> {
    const enabled: string[] = [];

    if (await this.expressCheckbox.isVisible() && await this.expressCheckbox.isChecked()) {
      enabled.push('express');
    }
    if (await this.challenge3dCheckbox.isVisible() && await this.challenge3dCheckbox.isChecked()) {
      enabled.push('challenge3d');
    }
    if (await this.intensive1dCheckbox.isVisible() && await this.intensive1dCheckbox.isChecked()) {
      enabled.push('intensive1d');
    }

    return enabled;
  }

  /**
   * Check Facebook integration status
   */
  async getFacebookStatus(): Promise<'connected' | 'disconnected' | 'unknown'> {
    await this.goToIntegrationsTab();

    if (await this.facebookStatus.isVisible()) {
      const text = await this.facebookStatus.textContent();
      if (text?.toLowerCase().includes('connect') || text?.toLowerCase().includes('подключ')) {
        return 'connected';
      }
      return 'disconnected';
    }
    return 'unknown';
  }

  /**
   * Connect Facebook (initiates OAuth flow)
   */
  async connectFacebook() {
    await this.goToIntegrationsTab();
    if (await this.facebookConnect.isVisible()) {
      await this.facebookConnect.click();
      // Note: This will redirect to Facebook OAuth
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Assert success message is shown
   */
  async assertSuccessMessage() {
    await expect(this.successMessage).toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert error message is shown
   */
  async assertErrorMessage() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }
}
