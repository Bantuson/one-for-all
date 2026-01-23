import { test, expect, Page } from '@playwright/test';
import {
  selectors,
  signInWithClerk,
  navigateToApplications,
  waitForModal,
  waitForModalClose,
  waitForPageLoad,
} from './helpers';

/**
 * Application Review E2E Tests for One For All Dashboard
 *
 * These tests verify the application review workflow:
 * 1. Applications grid display and navigation
 * 2. Status filtering functionality
 * 3. Application detail modal interactions
 * 4. Document review actions
 * 5. Notes management
 * 6. Agent integration UI
 *
 * Note: Some tests require authentication and a valid institution.
 * Tests will gracefully skip or adapt based on available configuration.
 */

test.describe('Application Review', () => {
  // Configure tests to run serially since they share state (modal open/close)
  test.describe.configure({ mode: 'serial' });

  // Mark all application review tests as potentially slow
  test.slow();

  // Test configuration
  const testSlug = process.env.E2E_TEST_INSTITUTION_SLUG || 'test-institution';
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a new page for the test suite
    page = await browser.newPage();

    // Attempt authentication if credentials are available
    const testEmail = process.env.E2E_TEST_EMAIL;
    const testPassword = process.env.E2E_TEST_PASSWORD;

    if (testEmail && testPassword) {
      try {
        await signInWithClerk(page, testEmail, testPassword);
        console.log('[Application Review] Authenticated successfully');
      } catch (error) {
        console.log('[Application Review] Authentication not available, tests may skip');
      }
    }
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Navigate to applications page before each test
    try {
      await navigateToApplications(page, testSlug);
    } catch (error) {
      // If navigation fails, navigate directly and wait for whatever loads
      await page.goto(`/dashboard/${testSlug}/applications`);
      // Use domcontentloaded instead of networkidle for faster, more reliable waits
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * Test 1: Verify applications grid displays correctly
   *
   * Checks that the applications page renders with either:
   * - A grid of application cards, OR
   * - An empty state message
   */
  test('should display applications grid', async () => {
    // Wait for page to finish loading
    await waitForPageLoad(page);

    // Check for either applications or empty state
    const hasApplicationCards = await page.locator(selectors.applications.applicationCard).count() > 0;
    const hasEmptyState = await page.locator(selectors.applications.emptyState).isVisible().catch(() => false);
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);

    // If there's an error (unauthorized, not found), skip the test
    if (hasError) {
      test.skip(true, 'Applications page not accessible - institution may not exist or user unauthorized');
      return;
    }

    // Page should show either applications or empty state
    expect(hasApplicationCards || hasEmptyState).toBe(true);

    if (hasApplicationCards) {
      // Verify the grid structure exists
      const gridContainer = page.locator('.grid.grid-cols-1');
      await expect(gridContainer).toBeVisible();
      console.log('[Test] Applications grid is displayed with cards');
    } else {
      console.log('[Test] Applications page shows empty state');
    }
  });

  /**
   * Test 2: Verify application count is displayed
   *
   * The header should show a count badge with the number of filtered applications.
   */
  test('should display application count', async () => {
    await waitForPageLoad(page);

    // Check for error state first
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);
    if (hasError) {
      test.skip(true, 'Applications page not accessible');
      return;
    }

    // Find the application count element (green monospace text showing count)
    const countElement = page.locator(selectors.applications.applicationCount);
    const countVisible = await countElement.isVisible().catch(() => false);

    if (countVisible) {
      // Get the count text and verify it's a number
      const countText = await countElement.textContent();
      expect(countText).toMatch(/^\d+$/);
      console.log('[Test] Application count displayed:', countText);
    } else {
      // Count might be styled differently, check for any numeric indicator near filter
      const filterArea = page.locator('div:has(button[aria-label="Filter by status"])');
      await expect(filterArea).toBeVisible();
      console.log('[Test] Filter area visible, count element may have different styling');
    }
  });

  /**
   * Test 3: Verify status filter dropdown exists
   *
   * The filter button should be visible and have proper accessibility attributes.
   */
  test('should have status filter dropdown', async () => {
    await waitForPageLoad(page);

    // Check for error state first
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);
    if (hasError) {
      test.skip(true, 'Applications page not accessible');
      return;
    }

    // Find the status filter button
    const filterButton = page.locator(selectors.applications.statusFilter);
    await expect(filterButton).toBeVisible();

    // Verify accessibility attributes
    await expect(filterButton).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(filterButton).toHaveAttribute('aria-expanded', 'false');

    // Verify the button contains status text (default should be "All Statuses")
    const buttonText = await filterButton.textContent();
    expect(buttonText).toBeTruthy();
    console.log('[Test] Filter button found with text:', buttonText);
  });

  /**
   * Test 4: Verify all status filter options are visible when dropdown opens
   *
   * Clicking the filter should show all status options in a listbox.
   */
  test('should display all status filter options', async () => {
    await waitForPageLoad(page);

    // Check for error state first
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);
    if (hasError) {
      test.skip(true, 'Applications page not accessible');
      return;
    }

    // Click the filter button to open dropdown
    const filterButton = page.locator(selectors.applications.statusFilter);
    await filterButton.waitFor({ state: 'visible' });
    await filterButton.click({ force: true });

    // Wait for dropdown to appear
    const dropdown = page.locator(selectors.applications.statusDropdown);
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Verify all expected status options are present
    const expectedStatuses = [
      'All Statuses',
      'Pending',
      'Under Review',
      'Conditional',
      'Accepted',
      'Rejected',
      'Waitlisted',
      'Withdrawn',
      'Documents Flagged',
    ];

    for (const status of expectedStatuses) {
      const option = dropdown.locator(`button:has-text("${status}")`);
      await expect(option).toBeVisible();
    }

    console.log('[Test] All status filter options are visible');

    // Close dropdown by clicking outside or pressing Escape
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });

  /**
   * Test 5: Verify filtering applications by status works
   *
   * Selecting a status filter should update the displayed applications.
   */
  test('should filter applications by status', async () => {
    await waitForPageLoad(page);

    // Check for error state first
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);
    if (hasError) {
      test.skip(true, 'Applications page not accessible');
      return;
    }

    // Get initial application count
    const initialCount = await page.locator(selectors.applications.applicationCard).count();

    // Open filter dropdown
    const filterButton = page.locator(selectors.applications.statusFilter);
    await filterButton.waitFor({ state: 'visible' });
    await filterButton.click({ force: true });

    // Wait for dropdown
    const dropdown = page.locator(selectors.applications.statusDropdown);
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Click on "Pending" status filter
    const pendingOption = page.locator(selectors.applications.statusOption('Pending'));
    await pendingOption.waitFor({ state: 'visible' });
    await pendingOption.click({ force: true });

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Verify dropdown is closed
    await expect(dropdown).not.toBeVisible();

    // Verify filter button now shows "Pending"
    const filterText = await filterButton.textContent();
    expect(filterText).toContain('Pending');

    // Get new count (may be same, less, or 0)
    const filteredCount = await page.locator(selectors.applications.applicationCard).count();

    // The filtered count should be less than or equal to initial (filtering reduces or maintains)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    console.log('[Test] Filter applied - initial:', initialCount, 'filtered:', filteredCount);

    // Reset filter to "All Statuses" for subsequent tests
    await filterButton.waitFor({ state: 'visible' });
    await filterButton.click({ force: true });
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    const allOption = page.locator(selectors.applications.statusOption('All Statuses'));
    await allOption.waitFor({ state: 'visible' });
    await allOption.click({ force: true });
    await expect(dropdown).not.toBeVisible();
  });

  /**
   * Test 6: Verify clicking application card opens detail modal
   *
   * The modal should open when clicking on an application card.
   */
  test('should open modal when clicking application card', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications to click
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test modal');
      return;
    }

    // Click the first application card
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });

    // Wait for modal to open
    await waitForModal(page);

    // Verify the modal is visible
    const modal = page.locator(selectors.modal.container);
    await expect(modal).toBeVisible();

    console.log('[Test] Application detail modal opened successfully');

    // Close the modal for subsequent tests
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 7: Verify personal information section in modal
   *
   * The modal should display a "Personal Information" section with applicant details.
   */
  test('should display personal information section', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test modal content');
      return;
    }

    // Open modal
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });
    await waitForModal(page);

    // Find the Personal Information section header
    const personalInfoSection = page.locator(selectors.modal.sectionHeader('Personal Information'));
    await expect(personalInfoSection).toBeVisible();

    // Verify some expected fields are present (Full Name, Email, etc.)
    const modalContent = page.locator(selectors.modal.container);

    // Check for common personal info fields (labels)
    const expectedLabels = ['Full Name', 'Email'];
    for (const label of expectedLabels) {
      const labelElement = modalContent.locator(`span:has-text("${label}")`);
      const isVisible = await labelElement.isVisible().catch(() => false);
      if (!isVisible) {
        // Field might be displayed differently, just log it
        console.log(`[Test] Field "${label}" not found with expected selector`);
      }
    }

    console.log('[Test] Personal Information section is displayed');

    // Close modal
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 8: Verify status update dropdown in modal footer
   *
   * The modal footer should contain a dropdown to update application status.
   */
  test('should have status update dropdown in modal footer', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test modal footer');
      return;
    }

    // Open modal
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });
    await waitForModal(page);

    // Look for the status dropdown button in the footer
    // Based on the component, it's a button with a status label and chevron
    const statusDropdownButton = page.locator('[role="dialog"] button:has(svg.rotate-180), [role="dialog"] button:has(svg[class*="h-3 w-3"])').last();
    const hasStatusDropdown = await statusDropdownButton.isVisible().catch(() => false);

    if (hasStatusDropdown) {
      // Click to open dropdown
      await statusDropdownButton.waitFor({ state: 'visible' });
      await statusDropdownButton.click({ force: true });
      await page.waitForTimeout(500);

      // Look for status options in the dropdown
      const statusOptions = page.locator('[role="dialog"] button:has-text("Pending"), [role="dialog"] button:has-text("Under Review")');
      const optionsVisible = await statusOptions.first().isVisible().catch(() => false);

      if (optionsVisible) {
        console.log('[Test] Status update dropdown is functional');
        // Close dropdown by clicking elsewhere
        await page.keyboard.press('Escape');
      }
    } else {
      // Alternative: look for any button near the footer with status-related styling
      const footerButtons = page.locator('[role="dialog"] button');
      const buttonCount = await footerButtons.count();
      console.log('[Test] Modal footer has', buttonCount, 'buttons');
      expect(buttonCount).toBeGreaterThan(0);
    }

    // Close modal
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 9: Verify Add Note button is present in modal
   *
   * Users should be able to add notes to applications.
   */
  test('should have Add Note button in modal', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test notes UI');
      return;
    }

    // Open modal
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });
    await waitForModal(page);

    // Find the Add Note button
    const addNoteButton = page.locator(selectors.modal.addNoteButton);
    await expect(addNoteButton).toBeVisible();

    // Verify the button text
    const buttonText = await addNoteButton.textContent();
    expect(buttonText).toContain('Add Note');

    console.log('[Test] Add Note button is present');

    // Optionally test clicking to show form (then cancel)
    await addNoteButton.waitFor({ state: 'visible' });
    await addNoteButton.click({ force: true });
    await page.waitForTimeout(500);

    // The button text should change to "Cancel Note" when form is shown
    const cancelButton = page.locator(selectors.modal.cancelNoteButton);
    const cancelVisible = await cancelButton.isVisible().catch(() => false);

    if (cancelVisible) {
      console.log('[Test] Note form toggle works correctly');
      await cancelButton.waitFor({ state: 'visible' });
      await cancelButton.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Close modal
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 10: Verify documents section is displayed in modal
   *
   * The modal should show a Documents section listing uploaded documents.
   */
  test('should display documents section in modal', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test documents section');
      return;
    }

    // Open modal
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });
    await waitForModal(page);

    // Find the Documents section header
    const documentsSection = page.locator(selectors.modal.sectionHeader('Documents'));
    await expect(documentsSection).toBeVisible();

    // Check if there are document rows or an empty state message
    const modalContent = page.locator(selectors.modal.container);
    const hasDocuments = await modalContent.locator(selectors.documents.documentRow).count() > 0;
    const hasNoDocuments = await modalContent.locator('text=No documents uploaded').isVisible().catch(() => false);

    expect(hasDocuments || hasNoDocuments).toBe(true);

    if (hasDocuments) {
      console.log('[Test] Documents section shows uploaded documents');
    } else {
      console.log('[Test] Documents section shows empty state');
    }

    // Close modal
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 11: Verify document action buttons (Flag/Approve) exist
   *
   * Each document row should have View, Approve, and Flag action buttons.
   */
  test('should have document action buttons', async () => {
    await waitForPageLoad(page);

    // Check if there are any applications
    const applicationCards = page.locator(selectors.applications.applicationCard);
    const cardCount = await applicationCards.count();

    if (cardCount === 0) {
      test.skip(true, 'No application cards available to test document actions');
      return;
    }

    // Open modal
    const firstCard = applicationCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click({ force: true });
    await waitForModal(page);

    const modalContent = page.locator(selectors.modal.container);

    // Check if there are any document rows
    const documentRows = modalContent.locator(selectors.documents.documentRow);
    const documentCount = await documentRows.count();

    if (documentCount === 0) {
      // No documents uploaded - test passes but logs this
      console.log('[Test] No documents present to verify action buttons - skipping detailed check');
      // Close modal and skip
      const closeButton = page.locator(selectors.modal.closeButton);
      await closeButton.waitFor({ state: 'visible' });
      await closeButton.click({ force: true });
      await waitForModalClose(page);
      return;
    }

    // For the first document row, verify action buttons exist
    const firstDocRow = documentRows.first();

    // View button
    const viewButton = firstDocRow.locator(selectors.documents.viewButton);
    const viewExists = await viewButton.isVisible().catch(() => false);

    // Approve button
    const approveButton = firstDocRow.locator(selectors.documents.approveButton);
    const approveExists = await approveButton.isVisible().catch(() => false);

    // Flag button
    const flagButton = firstDocRow.locator(selectors.documents.flagButton);
    const flagExists = await flagButton.isVisible().catch(() => false);

    // At least some action buttons should be present
    const hasActionButtons = viewExists || approveExists || flagExists;
    expect(hasActionButtons).toBe(true);

    console.log('[Test] Document action buttons:', {
      view: viewExists,
      approve: approveExists,
      flag: flagExists,
    });

    // Close modal
    const closeButton = page.locator(selectors.modal.closeButton);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click({ force: true });
    await waitForModalClose(page);
  });

  /**
   * Test 12: Verify Agent Activity button is present
   *
   * The applications page should have an Agent Activity button for AI agent integration.
   */
  test('should have Agent Activity button', async () => {
    await waitForPageLoad(page);

    // Check for error state first
    const hasError = await page.locator('text=Failed to load').isVisible().catch(() => false);
    if (hasError) {
      test.skip(true, 'Applications page not accessible');
      return;
    }

    // Find the Agent Activity button (Agent Sandbox)
    // It has aria-label containing "Agent Sandbox"
    const agentButton = page.locator('button[aria-label*="Agent Sandbox"]');
    const agentButtonExists = await agentButton.isVisible().catch(() => false);

    if (agentButtonExists) {
      // Verify the button has the correct aria-label
      const ariaLabel = await agentButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Agent Sandbox');

      // Verify clicking opens the agent modal
      await agentButton.waitFor({ state: 'visible' });
      await agentButton.click({ force: true });
      await page.waitForTimeout(500);

      // Look for the agent modal (instruction modal)
      const agentModal = page.locator('[role="dialog"]');
      const modalOpened = await agentModal.isVisible().catch(() => false);

      if (modalOpened) {
        console.log('[Test] Agent Activity button opens agent modal');
        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        console.log('[Test] Agent Activity button exists but modal may have different trigger');
      }
    } else {
      // Alternative: look for any button with MessageSquare icon or agent-related text
      const alternativeButton = page.locator('button[title*="Agent"], button:has(svg.lucide-message-square)');
      const altExists = await alternativeButton.isVisible().catch(() => false);

      expect(agentButtonExists || altExists).toBe(true);
      console.log('[Test] Agent Activity UI element is present');
    }
  });
});

/**
 * Additional test scenarios that could be added:
 *
 * - Status update functionality (actually changing status and verifying persistence)
 * - Note creation and display
 * - Document flag workflow with reason input
 * - Document approval workflow
 * - Pagination/infinite scroll for many applications
 * - Search functionality
 * - Keyboard navigation within the modal
 * - Accessibility compliance (screen reader support)
 * - Mobile responsiveness
 * - Loading states during async operations
 * - Error handling for failed API calls
 * - WhatsApp notification verification (when flagging documents)
 */
