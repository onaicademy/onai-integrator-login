/**
 * Playwright Configuration for Traffic Dashboard E2E Tests
 *
 * Run from VS Code:
 * - Install "Playwright Test for VS Code" extension
 * - Click "Testing" icon in sidebar
 * - Run individual tests or all tests
 *
 * CLI commands:
 * - npx playwright test                    # Run all tests
 * - npx playwright test --ui               # Run with UI mode
 * - npx playwright test --headed           # Run with browser visible
 * - npx playwright test --project=chromium # Run only in Chrome
 */

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Test files pattern
  testMatch: '**/*.spec.ts',

  // Timeout for each test
  timeout: 60_000,

  // Timeout for each assertion
  expect: {
    timeout: 10_000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Number of parallel workers
  workers: process.env.CI ? 1 : 4,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './reports/html', open: 'never' }],
    ['json', { outputFile: './reports/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'https://traffic.onai.academy',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',

    // Browser viewport
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 15_000,

    // Navigation timeout
    navigationTimeout: 30_000,
  },

  // Configure projects for different browsers
  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chrome tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/auth-admin.json',
      },
      dependencies: ['setup'],
    },

    // Firefox tests
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './fixtures/auth-admin.json',
      },
      dependencies: ['setup'],
    },

    // Safari tests
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: './fixtures/auth-admin.json',
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: './fixtures/auth-admin.json',
      },
      dependencies: ['setup'],
    },

    // Targetologist tests (different auth)
    {
      name: 'targetologist',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/auth-targetologist.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration (optional - for local development)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
