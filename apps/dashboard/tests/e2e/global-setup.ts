import { FullConfig } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

/**
 * Global Setup for Playwright E2E Tests
 *
 * This file runs once before all tests and handles:
 * 1. Environment variable loading from root .env.local
 * 2. Clerk testing token setup (if configured)
 * 3. Any other global initialization needed
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup(config: FullConfig): Promise<void> {
  // Load environment variables from root .env.local
  // This follows the project convention of having all env vars in the monorepo root
  const envPath = resolve(__dirname, '../../../../.env.local');
  const result = dotenvConfig({ path: envPath });

  if (result.error) {
    console.warn(
      `[Global Setup] Warning: Could not load .env.local from ${envPath}`,
      result.error.message
    );
  } else {
    console.log(`[Global Setup] Loaded environment variables from ${envPath}`);
  }

  // Validate required environment variables for testing
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(
      `[Global Setup] Warning: Missing environment variables: ${missingVars.join(', ')}`
    );
    console.warn(
      '[Global Setup] Some tests may fail or be skipped without proper configuration.'
    );
  }

  // Set up Clerk testing tokens if available
  // This enables bypassing Clerk's frontend components for faster E2E tests
  if (process.env.CLERK_TESTING_TOKEN) {
    console.log('[Global Setup] Clerk testing token detected - tests will use bypass mode');
    process.env.CLERK_BYPASS_AUTH = 'true';
  }

  // Set up test-specific environment flags
  process.env.PLAYWRIGHT_TEST_MODE = 'true';

  // Log test configuration
  console.log('[Global Setup] Configuration:', {
    baseURL: config.projects[0]?.use?.baseURL || 'http://localhost:3000',
    retries: config.projects[0]?.retries || 0,
    workers: config.workers,
    testDir: config.projects[0]?.testDir,
  });

  // Additional setup can be added here:
  // - Database seeding for tests
  // - Cache warming
  // - External service mocking
  // - Test user creation

  console.log('[Global Setup] Complete - ready to run tests');
}

export default globalSetup;
