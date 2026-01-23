import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for One For All Dashboard
 *
 * This file contains:
 * - UI selectors based on actual dashboard components
 * - Authentication helpers for Clerk integration
 * - Navigation helpers for common routes
 * - Wait helpers for async operations
 */

// ============================================================================
// Selectors - Based on actual dashboard component structure
// ============================================================================

export const selectors = {
  /**
   * Applications page selectors
   * Based on: apps/dashboard/app/dashboard/[institution_slug]/applications/page.tsx
   */
  applications: {
    // Status filter button with aria-label
    statusFilter: 'button[aria-label="Filter by status"]',
    // Status dropdown items
    statusDropdown: 'ul[role="listbox"]',
    statusOption: (status: string) => `button[role="option"]:has-text("${status}")`,
    // Application cards use role="button" with aria-label
    applicationCard: 'div[role="button"][aria-label^="View application from"]',
    // Application count displays in a span with specific classes
    applicationCount: 'span.text-sm.font-mono.text-traffic-green',
    // Loading indicator
    loadingSpinner: 'svg.animate-spin',
    // Empty state
    emptyState: 'p:has-text("No applications")',
    // Back to dashboard button
    backButton: 'button[aria-label="Back to dashboard"]',
  },

  /**
   * Modal selectors
   * Based on: apps/dashboard/components/modals/ApplicationDetailModal.tsx
   * and apps/dashboard/components/ui/DottedModal.tsx
   */
  modal: {
    // DottedModal uses role="dialog"
    container: '[role="dialog"]',
    // Close button in modal footer
    closeButton: 'button:has-text("Close")',
    // Add Note button
    addNoteButton: 'button:has-text("Add Note")',
    // Cancel Note button (when form is open)
    cancelNoteButton: 'button:has-text("Cancel Note")',
    // Section headers in modal
    sectionHeader: (title: string) => `h3:has-text("${title}")`,
    // Status badge in header
    statusBadge: '[role="status"]',
    // Info row by label
    infoRow: (label: string) => `div:has(span:has-text("${label}"))`,
  },

  /**
   * Document review selectors
   * Based on: apps/dashboard/components/applications/DocumentRow.tsx
   */
  documents: {
    // Document row container
    documentRow: '[data-testid="document-row"]',
    // Approve button with aria-label
    approveButton: 'button[aria-label="Approve document"]',
    // Flag button with aria-label
    flagButton: 'button[aria-label="Flag document"]',
    // Flag reason input
    flagReasonInput: 'input[placeholder="Enter flag reason..."]',
    // View button
    viewButton: 'button[aria-label="View document"]',
    // Document status badge
    statusBadge: (status: string) => `span:has-text("${status}")`,
  },

  /**
   * Team management page selectors
   * Based on: apps/dashboard/app/dashboard/[institution_slug]/team/page.tsx
   */
  team: {
    // Tab buttons
    membersTab: 'button:has-text("Members")',
    rolesTab: 'button:has-text("Roles")',
    // Invite button in header
    inviteButton: 'button:has-text("Invite")',
    // Create Role button
    createRoleButton: 'button:has-text("Create Role")',
    // Member cards
    memberCard: 'div.p-4.flex.items-center.gap-4',
    // Pending invitations section
    pendingSection: 'div:has-text("invitations.pending")',
    // Resend button
    resendButton: 'button:has-text("Resend")',
    // Remove button (trash icon)
    removeButton: 'button.text-traffic-red',
    // Role cards
    roleCard: '[data-testid="role-card"]',
    // Role form modal
    roleFormModal: '[role="dialog"]:has-text("Role")',
    // Email input in invite form
    inviteEmailInput: 'input[type="email"][placeholder="colleague@example.com"]',
  },

  /**
   * Authentication selectors
   * Based on: apps/dashboard/components/registration/steps/AuthStep.tsx
   */
  auth: {
    // Auth mode toggle
    signInToggle: 'button:has-text("Sign in")',
    signUpToggle: 'button:has-text("Sign up")',
    // Google OAuth button
    googleButton: 'button:has-text("Continue with Google")',
    // Email input (type="email")
    emailInput: 'input[type="email"]',
    // Password input (type="password")
    passwordInput: 'input[type="password"]',
    // First name input (sign up only)
    firstNameInput: 'input[placeholder="John"]',
    // Last name input (sign up only)
    lastNameInput: 'input[placeholder="Doe"]',
    // Username input (optional)
    usernameInput: 'input[placeholder="johndoe"]',
    // Submit button for sign up
    createUserButton: 'button:has-text("$ create --user")',
    // Submit button for sign in
    loginButton: 'button:has-text("$ login --user")',
    // Error message display
    errorMessage: 'div.text-destructive, div.text-red-500',
    // Authenticated state indicator
    authenticatedBadge: 'span:has-text("authenticated")',
    // Verification code input
    verificationCodeInput: 'input[maxlength="6"]',
    // Verify button
    verifyButton: 'button:has-text("verify --code")',
    // Resend code link
    resendCodeLink: 'button:has-text("Resend")',
    // Loading state
    loadingState: 'p:has-text("Loading...")',
    // Show/hide password toggle
    passwordToggle: 'button[aria-label="Show password"], button[aria-label="Hide password"]',
  },

  /**
   * Institution setup selectors
   * Based on: apps/dashboard/components/registration/UnifiedRegistrationPage.tsx
   * and apps/dashboard/components/registration/steps/InstitutionTypeStep.tsx
   */
  institutionSetup: {
    // Step indicator in header
    stepIndicator: 'span.font-mono.text-xs:has-text("step")',
    // Institution type cards
    institutionTypeCard: (type: string) => `button:has-text("${type}")`,
    // University type option
    universityOption: 'button:has-text("University")',
    // College type option
    collegeOption: 'button:has-text("College")',
    // NSFAS type option
    nsfasOption: 'button:has-text("NSFAS")',
    // Bursary provider option
    bursaryOption: 'button:has-text("Bursary Provider")',
    // Continue/Next button
    nextButton: 'button:has-text("Continue")',
    // Back button
    backButton: 'button:has-text("Back")',
    // Skip Team Invites button
    skipButton: 'button:has-text("Skip Team Invites")',
    // Submit registration button
    submitButton: 'button:has-text("submit --registration")',
    // Error display
    errorAlert: 'div:has-text("// Error")',
    // Progress stepper
    stepper: '[data-testid="stepper"]',
  },

  /**
   * Dashboard common selectors
   * Based on: apps/dashboard/components/dashboard/DashboardHeader.tsx
   */
  dashboard: {
    // Main content area
    mainContent: '#dashboard-main',
    // Header
    header: 'header',
    // Institution name in header
    institutionName: 'span.font-mono',
    // User menu button
    userMenuButton: 'button[aria-label="User menu"]',
    // Navigation links
    navLink: (text: string) => `a:has-text("${text}")`,
    // Logo
    logo: 'a[href="/"]',
  },

  /**
   * Common UI components
   */
  common: {
    // Toast notifications (using sonner)
    toast: '[data-sonner-toast]',
    // Code cards
    codeCard: 'div.rounded-lg.border.border-border',
    // Buttons
    primaryButton: 'button.bg-primary',
    outlineButton: 'button.border.border-input',
    ghostButton: 'button.hover\\:bg-muted',
    // Loader
    loader: 'svg.animate-spin, div.animate-pulse',
    // Modal backdrop
    modalBackdrop: '[data-state="open"]',
  },
};

// ============================================================================
// Auth Helpers
// ============================================================================

/**
 * Sign in with Clerk using email and password
 * This fills in the sign-in form and submits it
 */
export async function signInWithClerk(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to register page if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes('/register')) {
    await page.goto('/register');
  }

  // Wait for auth UI to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector(selectors.auth.emailInput, { timeout: 30000 });

  // Check if we need to switch to sign-in mode
  const signInToggle = page.locator(selectors.auth.signInToggle);
  if (await signInToggle.isVisible()) {
    await signInToggle.waitFor({ state: 'visible' });
    await signInToggle.click({ force: true });
    await page.waitForTimeout(1000); // Wait for mode switch animation
  }

  // Fill in credentials
  await page.fill(selectors.auth.emailInput, email);
  await page.fill(selectors.auth.passwordInput, password);

  // Submit the form - use force: true to avoid stability issues
  const loginButton = page.locator(selectors.auth.loginButton);
  await loginButton.waitFor({ state: 'visible' });
  await loginButton.click({ force: true });

  // Wait for authentication to complete or error to show
  await Promise.race([
    page.waitForSelector(selectors.auth.authenticatedBadge, { timeout: 30000 }),
    page.waitForSelector(selectors.auth.errorMessage, { timeout: 30000 }),
    page.waitForURL('**/dashboard/**', { timeout: 30000 }),
  ]);
}

/**
 * Bypass Clerk authentication for testing
 * This requires CLERK_TESTING_TOKEN to be set
 * Note: This is a placeholder - actual implementation depends on Clerk's testing API
 */
export async function bypassClerkAuth(page: Page, userId: string): Promise<void> {
  // Check if bypass is available
  if (!process.env.CLERK_TESTING_TOKEN) {
    console.warn(
      '[bypassClerkAuth] CLERK_TESTING_TOKEN not set - falling back to standard auth'
    );
    throw new Error('Clerk bypass auth requires CLERK_TESTING_TOKEN environment variable');
  }

  // Set up the bypass by injecting test session cookie
  // This approach varies based on Clerk's testing API
  await page.context().addCookies([
    {
      name: '__clerk_db_jwt',
      value: process.env.CLERK_TESTING_TOKEN!,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    },
  ]);

  // Store user ID for test assertions
  await page.evaluate((uid: string) => {
    localStorage.setItem('test_clerk_user_id', uid);
  }, userId);
}

/**
 * Sign up a new test user with Clerk
 */
export async function signUpWithClerk(
  page: Page,
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    username?: string;
  }
): Promise<void> {
  // Navigate to register page
  await page.goto('/register');

  // Wait for auth UI to load
  await page.waitForSelector(selectors.auth.emailInput, { timeout: 10000 });

  // Fill in sign-up form
  await page.fill(selectors.auth.firstNameInput, userData.firstName);
  await page.fill(selectors.auth.lastNameInput, userData.lastName);
  if (userData.username) {
    await page.fill(selectors.auth.usernameInput, userData.username);
  }
  await page.fill(selectors.auth.emailInput, userData.email);
  await page.fill(selectors.auth.passwordInput, userData.password);

  // Submit the form
  await page.click(selectors.auth.createUserButton);
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page): Promise<void> {
  // Clear Clerk session cookies
  await page.context().clearCookies();

  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to home to reset state
  await page.goto('/');
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to the main dashboard for an institution
 */
export async function navigateToDashboard(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/${slug}`);
  await waitForPageLoad(page);
}

/**
 * Navigate to the applications page for an institution
 */
export async function navigateToApplications(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/${slug}/applications`);
  await waitForPageLoad(page);

  // Wait for applications to load
  await Promise.race([
    page.waitForSelector(selectors.applications.applicationCard, { timeout: 10000 }),
    page.waitForSelector(selectors.applications.emptyState, { timeout: 10000 }),
  ]);
}

/**
 * Navigate to the team management page for an institution
 */
export async function navigateToTeam(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/${slug}/team`);
  await waitForPageLoad(page);

  // Wait for team data to load
  await page.waitForSelector(selectors.team.membersTab, { timeout: 10000 });
}

/**
 * Navigate to institution setup flow
 */
export async function navigateToSetup(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/${slug}/setup`);
  await waitForPageLoad(page);
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for the page to fully load (DOM content loaded + content visible)
 * Using domcontentloaded instead of networkidle for faster, more reliable waits
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for DOM to be ready - faster and more reliable than networkidle
  await page.waitForLoadState('domcontentloaded');

  // Give JavaScript time to hydrate the page
  await page.waitForTimeout(500);

  // Wait for main content area to be visible
  await page.waitForSelector(selectors.dashboard.mainContent, {
    state: 'visible',
    timeout: 30000,
  }).catch(() => {
    // Main content might not exist on all pages (e.g., registration)
    // This is acceptable
  });

  // Wait for any loaders to disappear
  const loaders = page.locator(selectors.common.loader);
  if ((await loaders.count()) > 0) {
    await loaders.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      // Loader might have already disappeared
    });
  }
}

/**
 * Wait for an API response matching a URL pattern
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.waitForResponse(
    (response: { url(): string }) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 15000 }
  );
}

/**
 * Wait for a toast notification to appear
 */
export async function waitForToast(
  page: Page,
  expectedText?: string
): Promise<void> {
  const toastSelector = selectors.common.toast;

  if (expectedText) {
    await page.waitForSelector(`${toastSelector}:has-text("${expectedText}")`, {
      timeout: 5000,
    });
  } else {
    await page.waitForSelector(toastSelector, { timeout: 5000 });
  }
}

/**
 * Wait for a modal to open
 */
export async function waitForModal(page: Page): Promise<void> {
  await page.waitForSelector(selectors.modal.container, {
    state: 'visible',
    timeout: 5000,
  });
}

/**
 * Wait for a modal to close
 */
export async function waitForModalClose(page: Page): Promise<void> {
  await page.waitForSelector(selectors.modal.container, {
    state: 'hidden',
    timeout: 5000,
  });
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that the user is authenticated
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Check for authenticated badge or dashboard URL
  const isAuthenticated = await page.evaluate(() => {
    return (
      document.querySelector('[data-testid="authenticated"]') !== null ||
      window.location.pathname.includes('/dashboard/')
    );
  });

  expect(isAuthenticated).toBe(true);
}

/**
 * Assert that the user is not authenticated
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/dashboard/');
}

/**
 * Assert that an error message is displayed
 */
export async function assertErrorVisible(page: Page, errorText?: string): Promise<void> {
  const errorSelector = selectors.auth.errorMessage;

  if (errorText) {
    await expect(page.locator(`${errorSelector}:has-text("${errorText}")`)).toBeVisible();
  } else {
    await expect(page.locator(errorSelector)).toBeVisible();
  }
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a unique test email address
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}+${timestamp}${random}@test.oneforall.co.za`;
}

/**
 * Generate test user data
 */
export function generateTestUser(overrides?: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}>) {
  return {
    firstName: 'Test',
    lastName: 'User',
    email: generateTestEmail(),
    password: 'TestPassword123!',
    ...overrides,
  };
}
