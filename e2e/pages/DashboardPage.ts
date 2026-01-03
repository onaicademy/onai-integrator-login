/**
 * Dashboard Page Object Model
 *
 * Main dashboard for Traffic Dashboard with metrics, charts, and navigation
 */

import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Navigation
  readonly sidebar: Locator;
  readonly navDashboard: Locator;
  readonly navFunnel: Locator;
  readonly navSettings: Locator;
  readonly navAnalytics: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  // Header
  readonly pageTitle: Locator;
  readonly dateRangePicker: Locator;
  readonly refreshButton: Locator;
  readonly teamFilter: Locator;
  readonly funnelTypeFilter: Locator;

  // Metrics Cards
  readonly metricsGrid: Locator;
  readonly leadsCard: Locator;
  readonly revenueCard: Locator;
  readonly conversionCard: Locator;
  readonly roasCard: Locator;
  readonly cplCard: Locator;
  readonly adSpendCard: Locator;

  // Charts
  readonly mainChart: Locator;
  readonly funnelChart: Locator;

  // Tables
  readonly leadsTable: Locator;
  readonly tableRows: Locator;
  readonly tablePagination: Locator;

  // Loading states
  readonly loadingSpinner: Locator;
  readonly skeletonLoaders: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.sidebar = page.locator('[class*="sidebar"], nav, [role="navigation"]');
    this.navDashboard = page.getByRole('link', { name: /dashboard|дашборд|главная/i });
    this.navFunnel = page.getByRole('link', { name: /funnel|воронка/i });
    this.navSettings = page.getByRole('link', { name: /settings|настройки/i });
    this.navAnalytics = page.getByRole('link', { name: /analytics|аналитика/i });
    this.userMenu = page.locator('[class*="user-menu"], [class*="profile"], [class*="avatar"]');
    this.logoutButton = page.getByRole('button', { name: /logout|выйти|выход/i });

    // Header
    this.pageTitle = page.locator('h1, [class*="page-title"]');
    this.dateRangePicker = page.locator('[class*="date-picker"], [class*="date-range"]');
    this.refreshButton = page.getByRole('button', { name: /refresh|обновить/i });
    this.teamFilter = page.locator('[class*="team-filter"], select[name*="team"]');
    this.funnelTypeFilter = page.locator('[class*="funnel-filter"], select[name*="funnel"]');

    // Metrics Cards
    this.metricsGrid = page.locator('[class*="metrics"], [class*="stats-grid"], [class*="kpi"]');
    this.leadsCard = page.locator('[class*="leads"], [data-metric="leads"]').first();
    this.revenueCard = page.locator('[class*="revenue"], [data-metric="revenue"]').first();
    this.conversionCard = page.locator('[class*="conversion"], [data-metric="conversion"]').first();
    this.roasCard = page.locator('[class*="roas"], [data-metric="roas"]').first();
    this.cplCard = page.locator('[class*="cpl"], [data-metric="cpl"]').first();
    this.adSpendCard = page.locator('[class*="spend"], [data-metric="spend"]').first();

    // Charts
    this.mainChart = page.locator('[class*="chart"], canvas, svg[class*="recharts"]').first();
    this.funnelChart = page.locator('[class*="funnel-chart"], [class*="funnel-visualization"]');

    // Tables
    this.leadsTable = page.locator('table, [class*="data-table"], [role="table"]');
    this.tableRows = page.locator('tbody tr, [role="row"]');
    this.tablePagination = page.locator('[class*="pagination"]');

    // Loading states
    this.loadingSpinner = page.locator('[class*="loading"], [class*="spinner"], [role="status"]');
    this.skeletonLoaders = page.locator('[class*="skeleton"]');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for loading spinners to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.skeletonLoaders.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Assert dashboard is displayed
   */
  async assertDashboardDisplayed() {
    await expect(this.page).toHaveURL(/dashboard|traffic/i);
    // At least one metric card should be visible
    const hasMetrics = await this.metricsGrid.isVisible().catch(() => false);
    const hasCards = await this.leadsCard.isVisible().catch(() => false);
    expect(hasMetrics || hasCards).toBeTruthy();
  }

  /**
   * Get metric value by card name
   */
  async getMetricValue(metricName: 'leads' | 'revenue' | 'conversion' | 'roas' | 'cpl' | 'spend'): Promise<string | null> {
    const cardMap = {
      leads: this.leadsCard,
      revenue: this.revenueCard,
      conversion: this.conversionCard,
      roas: this.roasCard,
      cpl: this.cplCard,
      spend: this.adSpendCard
    };

    const card = cardMap[metricName];
    if (!card) return null;

    try {
      const valueLocator = card.locator('[class*="value"], [class*="number"], strong, .metric-value');
      return await valueLocator.first().textContent();
    } catch {
      return null;
    }
  }

  /**
   * Set date range
   */
  async setDateRange(startDate: string, endDate: string) {
    await this.dateRangePicker.click();
    // Wait for date picker popup
    await this.page.waitForTimeout(500);

    // Try different date picker implementations
    const startInput = this.page.locator('input[name*="start"], input[placeholder*="start"]').first();
    const endInput = this.page.locator('input[name*="end"], input[placeholder*="end"]').first();

    if (await startInput.isVisible()) {
      await startInput.fill(startDate);
      await endInput.fill(endDate);
    }

    // Apply button
    const applyBtn = this.page.getByRole('button', { name: /apply|применить|ok/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    }

    await this.waitForPageLoad();
  }

  /**
   * Select team from filter
   */
  async selectTeam(teamName: string) {
    if (await this.teamFilter.isVisible()) {
      await this.teamFilter.selectOption({ label: teamName });
      await this.waitForPageLoad();
    }
  }

  /**
   * Select funnel type
   */
  async selectFunnelType(funnelType: 'express' | 'challenge3d' | 'intensive1d') {
    if (await this.funnelTypeFilter.isVisible()) {
      await this.funnelTypeFilter.selectOption({ value: funnelType });
      await this.waitForPageLoad();
    }
  }

  /**
   * Click refresh button
   */
  async refresh() {
    if (await this.refreshButton.isVisible()) {
      await this.refreshButton.click();
      await this.waitForPageLoad();
    }
  }

  /**
   * Navigate to funnel page
   */
  async goToFunnel() {
    await this.navFunnel.click();
    await this.page.waitForURL(/funnel/i);
  }

  /**
   * Navigate to settings
   */
  async goToSettings() {
    await this.navSettings.click();
    await this.page.waitForURL(/settings/i);
  }

  /**
   * Logout
   */
  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.page.waitForURL(/login/i);
  }

  /**
   * Get table row count
   */
  async getTableRowCount(): Promise<number> {
    await this.leadsTable.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    return await this.tableRows.count();
  }

  /**
   * Check if chart is rendered
   */
  async isChartRendered(): Promise<boolean> {
    try {
      await this.mainChart.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Assert no errors displayed
   */
  async assertNoErrors() {
    const errorMessages = this.page.locator('[class*="error"], [role="alert"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      const errorTexts = await errorMessages.allTextContents();
      // Filter out minor warnings
      const criticalErrors = errorTexts.filter(text =>
        !text.toLowerCase().includes('warning') &&
        text.trim().length > 0
      );
      expect(criticalErrors).toHaveLength(0);
    }
  }

  /**
   * Take screenshot of dashboard
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }
}
