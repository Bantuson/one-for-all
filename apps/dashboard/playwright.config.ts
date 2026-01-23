import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for One For All Dashboard
 *
 * This configuration is optimized for testing the Next.js dashboard application
 * with Clerk authentication and Supabase database integration.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for more stable results
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }], ['list']],

  // Global setup file
  globalSetup: './tests/e2e/global-setup.ts',

  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'retain-on-failure',

    // Timeout for actions (clicks, fills, etc.) - increased for slow compilation
    actionTimeout: 30000,

    // Timeout for navigation - increased for Next.js cold start compilation
    navigationTimeout: 90000,

    // Browser options
    headless: process.env.CI ? true : process.env.HEADLESS !== 'false',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors (useful for local development)
    ignoreHTTPSErrors: true,

    // Locale and timezone for consistent testing
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
  },

  // Test timeout - increased to handle slow Next.js compilation (60-130s per page)
  timeout: 90000,

  // Expect timeout - increased for slow page loads
  expect: {
    timeout: 15000,
  },

  // Configure projects for major browsers - Chromium only for now
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Uncomment below to enable additional browsers
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },
    // Mobile viewports
    // {
    //   name: 'mobile-chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
  ],

  // Output directory for test results
  outputDir: 'test-results',

  // Web server configuration
  // Use production build in CI for speed, dev server locally for convenience
  webServer: {
    command: process.env.CI
      ? 'pnpm build && pnpm start' // CI: build and run production server
      : process.env.USE_PROD_BUILD === 'true'
        ? 'pnpm start' // Local with prod build: just start
        : 'pnpm dev',  // Local dev mode: use dev server (slower but no build needed)
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300000, // 5 minutes to build and start the server
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Ensure environment variables are available
      // Filter out undefined values to satisfy TypeScript
      ...Object.fromEntries(
        Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
      ),
      NODE_ENV: process.env.CI ? 'production' : 'development',
    },
  },
});
