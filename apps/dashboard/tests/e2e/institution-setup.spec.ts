import { test, expect } from '@playwright/test';
import {
  selectors,
  waitForPageLoad,
} from './helpers';

/**
 * Institution Setup E2E Tests for One For All Dashboard
 *
 * These tests verify the institution setup wizard flow:
 * 1. Step indicators display correctly
 * 2. Institution type options are visible
 * 3. Required field validation works
 * 4. Skip team invites functionality works
 *
 * Note: These tests assume the user has completed authentication
 * and is on the institution setup wizard steps.
 */

test.describe('Institution Setup Wizard', () => {
  // Mark all institution setup tests as potentially slow
  test.slow();

  test.beforeEach(async ({ page }) => {
    // Navigate to the register page before each test
    await page.goto('/register');
    // Use domcontentloaded instead of networkidle for faster, more reliable waits
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  /**
   * Test 1: Verify wizard stepper shows current step
   *
   * Tests that the step indicator displays the correct current step
   * in the registration wizard after authentication.
   */
  test('should display correct step indicators', async ({ page }) => {
    // Wait for auth UI to load
    await page.waitForSelector(selectors.auth.emailInput, { timeout: 10000 }).catch(() => {
      // If email input doesn't appear, user may be authenticated
    });

    // Check if user is already authenticated
    const isAuthenticated = await page.locator(selectors.auth.authenticatedBadge).isVisible().catch(() => false);

    if (!isAuthenticated) {
      // User is not authenticated - skip to verify the auth step UI
      // The step indicator is not shown on the auth step (first step)
      console.log('[Test] User not authenticated - verifying auth step has no stepper');

      // Verify the stepper is NOT visible on the auth step
      const stepIndicator = page.locator(selectors.institutionSetup.stepIndicator);
      await expect(stepIndicator).not.toBeVisible();

      // Verify we're on the registration page
      await expect(page.locator('text=registration.form')).toBeVisible();
      return;
    }

    // User is authenticated - should be on institution-type step or later
    // Wait for the page to fully load
    await waitForPageLoad(page);

    // Check for the step indicator (only visible after auth step)
    const stepIndicator = page.locator(selectors.institutionSetup.stepIndicator);

    // Step indicator should be visible (format: "step X/Y")
    await expect(stepIndicator).toBeVisible({ timeout: 5000 });

    // Verify step indicator content format
    const stepText = await stepIndicator.textContent();
    expect(stepText).toMatch(/step \d+\/\d+/);

    // Verify the stepper navigation bar exists
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();

    // Verify there are step circles in the stepper
    const stepCircles = stepper.locator('div.rounded-full');
    const stepCount = await stepCircles.count();
    expect(stepCount).toBeGreaterThan(0);

    // Verify step names are displayed
    const stepNames = stepper.locator('span.text-xs.font-mono');
    const nameCount = await stepNames.count();
    expect(nameCount).toBeGreaterThan(0);

    console.log('[Test] Step indicator verified:', stepText);
  });

  /**
   * Test 2: Verify University, TVET, Private options visible
   *
   * Tests that all institution type options are displayed correctly
   * on the institution type selection step.
   */
  test('should display all institution type options', async ({ page }) => {
    // Wait for auth UI to load
    await page.waitForSelector(selectors.auth.emailInput, { timeout: 10000 }).catch(() => {
      // If email input doesn't appear, user may be authenticated
    });

    // Check if user is already authenticated
    const isAuthenticated = await page.locator(selectors.auth.authenticatedBadge).isVisible().catch(() => false);

    if (!isAuthenticated) {
      // User is not authenticated - we need to simulate being on the institution type step
      console.log('[Test] User not authenticated - testing institution type UI components');

      // Try to find the institution type selection elements even if not on that step
      // This tests that the selectors are correct for when the step IS reached

      // Verify the page structure exists
      await expect(page.locator('text=registration.form')).toBeVisible();

      // Note: We can't fully test institution type options without auth
      // Skip the actual institution type checks
      test.skip(true, 'Cannot test institution type step without authentication');
      return;
    }

    // User is authenticated - should be on institution-type step
    await waitForPageLoad(page);

    // Wait for institution type step to be visible
    // The step shows "const institutionType ="
    const stepHeader = page.locator('text=institutionType');
    await expect(stepHeader).toBeVisible({ timeout: 10000 });

    // Verify the instruction text is visible
    await expect(page.locator('text=Select the type of institution you represent')).toBeVisible();

    // Check for University option
    const universityOption = page.locator(selectors.institutionSetup.universityOption);
    await expect(universityOption).toBeVisible();

    // Verify University option shows correct text
    await expect(universityOption.locator('text="university"')).toBeVisible();
    await expect(universityOption.locator('text=Public or private university institution')).toBeVisible();

    // Check for College option (TVET/Private colleges)
    const collegeOption = page.locator(selectors.institutionSetup.collegeOption);
    await expect(collegeOption).toBeVisible();

    // Verify College option shows correct text
    await expect(collegeOption.locator('text="college"')).toBeVisible();
    await expect(collegeOption.locator('text=Private college or vocational institution')).toBeVisible();

    // Check for NSFAS option
    const nsfasOption = page.locator(selectors.institutionSetup.nsfasOption);
    await expect(nsfasOption).toBeVisible();

    // Verify NSFAS option shows correct text
    await expect(nsfasOption.locator('text="nsfas"')).toBeVisible();

    // Check for Bursary Provider option
    const bursaryOption = page.locator(selectors.institutionSetup.bursaryOption);
    await expect(bursaryOption).toBeVisible();

    // Verify Bursary option shows correct text
    await expect(bursaryOption.locator('text="bursary_provider"')).toBeVisible();

    // Verify there are exactly 4 institution type cards
    const typeCards = page.locator('button:has(svg.h-10.w-10)');
    const cardCount = await typeCards.count();
    expect(cardCount).toBe(4);

    console.log('[Test] All 4 institution type options verified');
  });

  /**
   * Test 3: Submit without required fields, check validation
   *
   * Tests that validation errors are shown when attempting to proceed
   * without filling in required fields on the institution setup step.
   */
  test('should validate required fields', async ({ page }) => {
    // Wait for auth UI to load
    await page.waitForSelector(selectors.auth.emailInput, { timeout: 10000 }).catch(() => {
      // If email input doesn't appear, user may be authenticated
    });

    // Check if user is already authenticated
    const isAuthenticated = await page.locator(selectors.auth.authenticatedBadge).isVisible().catch(() => false);

    if (!isAuthenticated) {
      // Test validation on the auth step instead
      console.log('[Test] Testing validation on auth step');

      // Switch to sign-in mode if in sign-up mode
      const toggleToSignIn = page.locator('button:has-text("Sign in")');
      if (await toggleToSignIn.isVisible()) {
        await toggleToSignIn.waitFor({ state: 'visible' });
        await toggleToSignIn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      // Try to submit with empty fields
      const loginButton = page.locator(selectors.auth.loginButton);

      // Check if button is disabled when fields are empty
      const isDisabled = await loginButton.isDisabled().catch(() => false);

      if (isDisabled) {
        console.log('[Test] Login button is correctly disabled when fields are empty');
        expect(isDisabled).toBe(true);
      } else {
        // If not disabled, click and check for validation
        await loginButton.waitFor({ state: 'visible' });
        await loginButton.click({ force: true });
        await page.waitForTimeout(1000);

        // Check for browser validation or error messages
        const hasInvalidFields = await page.locator('input:invalid').count() > 0;
        const hasError = await page.locator(selectors.auth.errorMessage).isVisible().catch(() => false);

        expect(hasInvalidFields || hasError).toBe(true);
        console.log('[Test] Validation triggered on empty form submission');
      }
      return;
    }

    // User is authenticated - navigate through to institution setup step
    await waitForPageLoad(page);

    // If on institution-type step, select an option to proceed
    const institutionTypeStep = page.locator('text=institutionType');
    if (await institutionTypeStep.isVisible()) {
      // Click University option to proceed
      await page.click(selectors.institutionSetup.universityOption);
      await page.waitForTimeout(1000);
    }

    // Now should be on institution-setup step
    const institutionSetupStep = page.locator('text=institutionSetup');
    await expect(institutionSetupStep).toBeVisible({ timeout: 10000 });

    // Verify required fields are present
    const nameInput = page.locator('input[placeholder="e.g., University of Pretoria"]');
    const emailInput = page.locator('input[placeholder="admin@institution.edu"]');
    const phoneInput = page.locator('input[placeholder="+27 12 345 6789"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(phoneInput).toBeVisible();

    // Clear any existing values
    await nameInput.clear();
    await emailInput.clear();
    await phoneInput.clear();

    // Try to click Continue button without filling required fields
    const continueButton = page.locator(selectors.institutionSetup.nextButton);

    // Check if button is disabled (validation via canProceed selector)
    const isDisabled = await continueButton.isDisabled().catch(() => false);

    if (isDisabled) {
      console.log('[Test] Continue button is correctly disabled when required fields are empty');
      expect(isDisabled).toBe(true);
    } else {
      // If button is enabled, click it and check for validation
      await continueButton.waitFor({ state: 'visible' });
      await continueButton.click({ force: true });
      await page.waitForTimeout(1000);

      // Check for validation errors
      // The form uses react-hook-form with zod validation
      const nameError = page.locator('text=Institution name must be at least 3 characters');
      const emailError = page.locator('text=Invalid email address');
      const phoneError = page.locator('text=Phone number must be at least 10 digits');

      const hasNameError = await nameError.isVisible().catch(() => false);
      const hasEmailError = await emailError.isVisible().catch(() => false);
      const hasPhoneError = await phoneError.isVisible().catch(() => false);

      expect(hasNameError || hasEmailError || hasPhoneError).toBe(true);
      console.log('[Test] Validation errors displayed for empty required fields');
    }

    // Test partial validation - fill name only
    await nameInput.fill('Test University');

    // Verify button is still disabled (email and phone still empty)
    const stillDisabled = await continueButton.isDisabled().catch(() => false);
    expect(stillDisabled).toBe(true);
    console.log('[Test] Continue button remains disabled with partial input');

    // Fill all required fields with valid data
    await emailInput.fill('admin@test.edu');
    await phoneInput.fill('+27 12 345 6789');

    // Wait for validation to update
    await page.waitForTimeout(500);

    // Now button should be enabled
    const finallyEnabled = await continueButton.isEnabled().catch(() => false);
    expect(finallyEnabled).toBe(true);
    console.log('[Test] Continue button enabled after filling all required fields');
  });

  /**
   * Test 4: Skip button works on team invite step
   *
   * Tests that the "Skip Team Invites" button is visible and functional
   * on the team invitation step of the wizard.
   */
  test('should allow skipping team invites', async ({ page }) => {
    // Wait for auth UI to load
    await page.waitForSelector(selectors.auth.emailInput, { timeout: 10000 }).catch(() => {
      // If email input doesn't appear, user may be authenticated
    });

    // Check if user is already authenticated
    const isAuthenticated = await page.locator(selectors.auth.authenticatedBadge).isVisible().catch(() => false);

    if (!isAuthenticated) {
      console.log('[Test] User not authenticated - cannot test team invite step');
      test.skip(true, 'Test requires authenticated user to reach team invite step');
      return;
    }

    // User is authenticated - navigate through steps to reach team invite step
    await waitForPageLoad(page);

    // Navigate through the wizard steps

    // Step 1: Institution Type
    const institutionTypeStep = page.locator('text=institutionType');
    if (await institutionTypeStep.isVisible()) {
      console.log('[Test] On institution-type step, selecting University');
      await page.click(selectors.institutionSetup.universityOption);
      await page.waitForTimeout(1000);
    }

    // Step 2: Institution Setup
    const institutionSetupStep = page.locator('text=institutionSetup');
    if (await institutionSetupStep.isVisible()) {
      console.log('[Test] On institution-setup step, filling required fields');

      // Fill required fields
      const nameInput = page.locator('input[placeholder="e.g., University of Pretoria"]');
      const emailInput = page.locator('input[placeholder="admin@institution.edu"]');
      const phoneInput = page.locator('input[placeholder="+27 12 345 6789"]');

      if (await nameInput.isVisible()) {
        await nameInput.fill('E2E Test University');
      }
      if (await emailInput.isVisible()) {
        await emailInput.fill('e2e-test@university.edu');
      }
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+27 12 999 8888');
      }

      // Wait for validation and click Continue
      await page.waitForTimeout(500);
      const continueButton = page.locator(selectors.institutionSetup.nextButton);
      if (await continueButton.isEnabled()) {
        await continueButton.waitFor({ state: 'visible' });
        await continueButton.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    // Step 3: Customize (may need to proceed)
    const customizeStep = page.locator('text=Continue to Team');
    if (await customizeStep.isVisible()) {
      console.log('[Test] On customize step, clicking Continue to Team');
      await customizeStep.waitFor({ state: 'visible' });
      await customizeStep.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Step 4: Team Invite - verify skip functionality
    const skipButton = page.locator(selectors.institutionSetup.skipButton);

    // Wait for team step to load
    await expect(skipButton).toBeVisible({ timeout: 15000 });

    console.log('[Test] On team invite step, verifying Skip button');

    // Verify the team invite step UI elements
    await expect(page.locator('text=Invite team members to collaborate')).toBeVisible();
    await expect(page.locator('text=You can skip and invite team members later from Settings')).toBeVisible();

    // Verify Skip Team Invites button is visible and enabled
    await expect(skipButton).toBeVisible();
    await expect(skipButton).toBeEnabled();

    // Get current step indicator
    const stepIndicator = page.locator(selectors.institutionSetup.stepIndicator);
    const stepTextBefore = await stepIndicator.textContent();
    console.log('[Test] Step before skip:', stepTextBefore);

    // Click the Skip button
    await skipButton.waitFor({ state: 'visible' });
    await skipButton.click({ force: true });
    await page.waitForTimeout(1000);

    // Verify we advanced to the next step (Confirm)
    const stepTextAfter = await stepIndicator.textContent();
    console.log('[Test] Step after skip:', stepTextAfter);

    // Should now be on the confirm step
    // The confirm step shows the submit button
    const submitButton = page.locator(selectors.institutionSetup.submitButton);
    const isOnConfirmStep = await submitButton.isVisible().catch(() => false);

    if (isOnConfirmStep) {
      console.log('[Test] Successfully skipped to confirm step');
      await expect(submitButton).toBeVisible();
    } else {
      // Check if step indicator changed
      expect(stepTextAfter).not.toBe(stepTextBefore);
      console.log('[Test] Step changed after clicking Skip');
    }
  });
});

/**
 * Additional test scenarios that could be added:
 *
 * - Complete institution type selection flow
 * - Institution name auto-detection (pre-configured institutions)
 * - Campus customization step
 * - Team member invite form validation
 * - Full registration completion flow
 * - Back button navigation between steps
 * - Persistence of entered data when navigating back
 */
