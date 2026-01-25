# Phase 5: E2E & Dashboard Integration Tests

## Overview

**Goal:** Implement end-to-end testing that covers the institution management dashboard with browser automation, API integration tests, performance baselines, and CI/CD integration.

**Estimated Effort:** 5-7 days

**Dependencies:**
- Phase 1-4 complete
- Dashboard frontend operational
- Staging environment configured

**Success Criteria:**
- Playwright E2E tests for critical institution management journeys
- Dashboard integrated into CI/CD pipeline
- Performance baselines established (P95 < 2000ms)
- API endpoints validated with integration tests
- Production parity validated

---

## Architecture Context

### What the Dashboard Is

The **One For All Dashboard** is an **institution management platform** for university administrators and reviewers. It is NOT an applicant portal.

**Key Characteristics:**
- **Users:** Institution admins, reviewers, faculty coordinators
- **Purpose:** Manage institutions, review applications, oversee agent operations
- **Application Intake:** Happens via **WhatsApp/Twilio + CrewAI agents** (external to dashboard)
- **Application Review:** Done via modals within the applications list view

### What the Dashboard Is NOT

- NOT an applicant-facing wizard
- NOT where students submit applications
- NOT where students create accounts or profiles

### Application Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Application Intake                          │
│                                                                   │
│  Applicant → WhatsApp → Twilio → CrewAI Agents → Supabase       │
│              (Mobile)                                             │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Dashboard (Institution View)                    │
│                                                                   │
│  Admin/Reviewer → Dashboard → Applications List → Detail Modal   │
│                   (Browser)                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Actual Routes (Verified)

### Frontend Routes

```
/                                          # Landing page (marketing)
/register                                  # Clerk OAuth (unified sign-in/sign-up)
/register/invite/[token]                   # Invitation acceptance page
/sso-callback                              # SSO callback handler
/dashboard                                 # Dashboard index (redirects to institution)
/dashboard/[institution_slug]              # Institution hub (home)
/dashboard/[institution_slug]/applications # Applications list + detail modal
/dashboard/[institution_slug]/setup        # Institution onboarding wizard
/dashboard/[institution_slug]/team         # Team member management
/dashboard/[institution_slug]/campuses/new # Campus creation wizard
```

### API Routes

#### Agent Management
```
GET    /api/agents/analytics                              # Get analytics agent session
POST   /api/agents/analytics/chat                         # Send message to analytics agent
GET    /api/agents/analytics/stats                        # Get analytics statistics
POST   /api/agents/analytics/[chartId]/pin                # Pin/unpin chart
GET    /api/agents/reviewer-assistant                     # Get reviewer assistant session
POST   /api/agents/reviewer-assistant/chat                # Send message to reviewer agent
GET    /api/agents/sessions/[sessionId]                   # Get agent session details
GET    /api/agents/sessions/[sessionId]/messages          # Get session messages
```

#### Application Management
```
GET    /api/institutions/[institutionId]/applications     # List applications
GET    /api/applications/[id]/status                      # Get application status
PATCH  /api/applications/[id]/status                      # Update status
GET    /api/applications/[id]/notes                       # Get reviewer notes
POST   /api/applications/[id]/notes                       # Add reviewer note
GET    /api/applications/[id]/documents/[docId]           # Get document
DELETE /api/applications/[id]/documents/[docId]           # Delete document
PATCH  /api/applications/[id]/student-number              # Assign student number
GET    /api/applications/rankings                         # Get ranked applications
PATCH  /api/application-choices/[choiceId]                # Update choice ranking
```

#### Institution Management
```
GET    /api/institutions                                  # List user's institutions
POST   /api/institutions                                  # Create institution
GET    /api/institutions/by-slug/[slug]                   # Get by slug
GET    /api/institutions/[institutionId]/campuses         # List campuses
POST   /api/institutions/[institutionId]/campuses         # Create campus
PATCH  /api/institutions/[institutionId]/campuses/[id]    # Update campus
DELETE /api/institutions/[institutionId]/campuses/[id]    # Delete campus
GET    /api/institutions/[institutionId]/faculties        # List faculties
POST   /api/institutions/[institutionId]/faculties        # Create faculty
GET    /api/institutions/[institutionId]/courses          # List courses
POST   /api/institutions/[institutionId]/courses          # Create course
GET    /api/institutions/[institutionId]/agent-sessions   # List agent sessions
```

#### Team Management
```
GET    /api/institutions/[institutionId]/members          # List team members
POST   /api/institutions/[institutionId]/members          # Add member
DELETE /api/institutions/[institutionId]/members/[id]     # Remove member
GET    /api/institutions/[institutionId]/roles            # List roles
POST   /api/institutions/[institutionId]/roles            # Create role
POST   /api/team/invite                                   # Send team invitation
```

#### Invitation System
```
POST   /api/invitations/send                              # Send invitation
POST   /api/invitations/accept                            # Accept invitation
POST   /api/invitations/resend                            # Resend invitation
POST   /api/invitations/validate                          # Validate token
```

#### User Management
```
GET    /api/users/me                                      # Get current user
POST   /api/users/complete-onboarding                     # Complete onboarding
POST   /api/auth/session-check                            # Check auth session
```

#### Webhooks
```
POST   /api/webhooks/clerk                                # Clerk webhook handler
```

---

## Implementation Checklist

### Dashboard E2E Tests

- [ ] **Authentication Flows**
  - [ ] Landing page access
  - [ ] Clerk OAuth redirect to `/register`
  - [ ] Session persistence across reloads
  - [ ] Sign out functionality
  - [ ] Institution selection after authentication

- [ ] **Institution Management**
  - [ ] Dashboard home displays campus hierarchy
  - [ ] Institution setup wizard completion
  - [ ] Campus creation flow
  - [ ] Faculty and course management

- [ ] **Team Management**
  - [ ] View team members list
  - [ ] Send team invitation
  - [ ] Accept invitation via token
  - [ ] Role assignment

- [ ] **Application Review**
  - [ ] Applications list view with filters
  - [ ] Open application detail modal
  - [ ] View applicant information
  - [ ] Update application status
  - [ ] Add reviewer notes
  - [ ] Document review (view/download)
  - [ ] Application ranking/prioritization

- [ ] **Agent Interactions**
  - [ ] Analytics agent chat interface
  - [ ] Reviewer assistant queries
  - [ ] Agent session history
  - [ ] Chart generation and pinning

### API Integration Tests

- [ ] **Agent API endpoints**
  - [ ] Session creation and retrieval
  - [ ] Message streaming
  - [ ] Analytics statistics
  - [ ] Chart pinning

- [ ] **Application API endpoints**
  - [ ] List applications with pagination
  - [ ] Get application details
  - [ ] Update status (pending → reviewing → accepted/rejected)
  - [ ] Add reviewer notes
  - [ ] Document operations

- [ ] **Institution API endpoints**
  - [ ] Create institution
  - [ ] List user institutions
  - [ ] Campus CRUD operations
  - [ ] Faculty and course management

- [ ] **Invitation API endpoints**
  - [ ] Send invitation
  - [ ] Validate token
  - [ ] Accept invitation
  - [ ] Resend invitation

### Performance Tests

- [ ] **Locust load tests**
  - [ ] Admin dashboard load (concurrent reviewers)
  - [ ] Applications list pagination
  - [ ] Application detail modal
  - [ ] Agent chat latency
  - [ ] P95 latency measurement
  - [ ] Error rate tracking

### CI/CD Integration

- [ ] **GitHub Actions workflow**
  - [ ] Dashboard build verification
  - [ ] E2E test execution
  - [ ] Performance gate
  - [ ] Test report generation

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/dashboard/tests/e2e/` | Create | E2E test directory |
| `apps/dashboard/tests/e2e/auth.spec.ts` | Create | Authentication flow tests |
| `apps/dashboard/tests/e2e/institution.spec.ts` | Create | Institution management tests |
| `apps/dashboard/tests/e2e/applications.spec.ts` | Create | Application review tests |
| `apps/dashboard/tests/e2e/team.spec.ts` | Create | Team management tests |
| `apps/dashboard/tests/e2e/agents.spec.ts` | Create | Agent interaction tests |
| `apps/dashboard/tests/e2e/helpers/auth.ts` | Create | Authentication helper utilities |
| `apps/dashboard/playwright.config.ts` | Create | Playwright configuration |
| `.github/workflows/dashboard-e2e.yml` | Create | E2E CI workflow |
| `apps/backend/tests/performance/locustfile.py` | Modify | Update load tests with actual endpoints |

---

## Code Examples

### Playwright Configuration

```typescript
// apps/dashboard/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Authentication Helper

```typescript
// apps/dashboard/tests/e2e/helpers/auth.ts
import { Page } from '@playwright/test';

/**
 * Sign in using Clerk OAuth flow
 * Note: In test environment, Clerk can be configured with test mode
 * or use a dedicated test account
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/register');

  // Clerk OAuth flow
  // This depends on your Clerk configuration (email+password, OTP, etc.)
  await page.getByPlaceholder(/email/i).fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
  await page.getByRole('button', { name: /continue/i }).click();

  // If using password authentication
  if (process.env.TEST_ADMIN_PASSWORD) {
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
  }

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const response = await page.request.get('/api/users/me');
  return response.ok();
}

/**
 * Sign out
 */
export async function signOut(page: Page): Promise<void> {
  await page.getByTestId('user-menu').click();
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL(/\/$/);
}
```

### Authentication E2E Tests

```typescript
// apps/dashboard/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsAdmin, signOut } from './helpers/auth';

test.describe('Authentication', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /one for all/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /get started|sign in/i })).toBeVisible();
  });

  test('should redirect unauthenticated users to sign in', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to Clerk sign-in
    await expect(page).toHaveURL(/register/);
  });

  test('should allow sign in with valid credentials', async ({ page }) => {
    await signInAsAdmin(page);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should persist session across page reloads', async ({ page }) => {
    await signInAsAdmin(page);

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should handle sign out', async ({ page }) => {
    await signInAsAdmin(page);
    await signOut(page);

    // Should redirect to landing page
    await expect(page).toHaveURL(/\/$/);
  });

  test('should handle invitation acceptance', async ({ page }) => {
    // Mock invitation token
    const testToken = 'test-invitation-token';

    await page.goto(`/register/invite/${testToken}`);

    // Should show invitation acceptance UI
    await expect(page.getByRole('heading', { name: /accept invitation/i })).toBeVisible();
  });
});
```

### Institution Management E2E Tests

```typescript
// apps/dashboard/tests/e2e/institution.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

test.describe('Institution Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('should display institution dashboard', async ({ page }) => {
    // Navigate to institution
    await page.goto('/dashboard/test-university');

    await expect(page.getByRole('heading', { name: /test university/i })).toBeVisible();
    await expect(page.getByTestId('campus-list')).toBeVisible();
  });

  test('should complete institution setup wizard', async ({ page }) => {
    await page.goto('/dashboard/test-university/setup');

    // Step 1: Basic information
    await page.getByLabel(/institution name/i).fill('Test University');
    await page.getByLabel(/institution type/i).selectOption('University');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: Contact details
    await page.getByLabel(/email/i).fill('admin@test.edu');
    await page.getByLabel(/phone/i).fill('+27123456789');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Review and complete
    await expect(page.getByText(/test university/i)).toBeVisible();
    await page.getByRole('button', { name: /complete setup/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard\/test-university$/);
  });

  test('should create new campus', async ({ page }) => {
    await page.goto('/dashboard/test-university/campuses/new');

    // Fill campus form
    await page.getByLabel(/campus name/i).fill('Main Campus');
    await page.getByLabel(/code/i).fill('MC');
    await page.getByLabel(/address/i).fill('123 University Ave');
    await page.getByLabel(/city/i).fill('Cape Town');
    await page.getByLabel(/province/i).selectOption('Western Cape');

    // Submit
    await page.getByRole('button', { name: /create campus/i }).click();

    // Should show success message
    await expect(page.getByText(/campus created/i)).toBeVisible();

    // Should appear in campus list
    await page.goto('/dashboard/test-university');
    await expect(page.getByText(/main campus/i)).toBeVisible();
  });

  test('should manage faculties and courses', async ({ page }) => {
    await page.goto('/dashboard/test-university');

    // Navigate to faculties section
    await page.getByRole('tab', { name: /faculties/i }).click();

    // Add faculty
    await page.getByRole('button', { name: /add faculty/i }).click();
    await page.getByLabel(/faculty name/i).fill('Engineering');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify faculty created
    await expect(page.getByText(/engineering/i)).toBeVisible();

    // Add course to faculty
    await page.getByText(/engineering/i).click();
    await page.getByRole('button', { name: /add course/i }).click();
    await page.getByLabel(/course name/i).fill('Computer Science');
    await page.getByLabel(/course code/i).fill('CS101');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify course created
    await expect(page.getByText(/computer science/i)).toBeVisible();
  });
});
```

### Application Review E2E Tests

```typescript
// apps/dashboard/tests/e2e/applications.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

test.describe('Application Review', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/dashboard/test-university/applications');
  });

  test('should display applications list', async ({ page }) => {
    // Applications table should be visible
    await expect(page.getByTestId('applications-table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
  });

  test('should filter applications by status', async ({ page }) => {
    // Open filter dropdown
    await page.getByRole('button', { name: /filter/i }).click();

    // Select pending status
    await page.getByLabel(/status/i).selectOption('pending');
    await page.getByRole('button', { name: /apply/i }).click();

    // All visible applications should be pending
    const statusBadges = page.locator('[data-testid="status-badge"]');
    const count = await statusBadges.count();

    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText(/pending/i);
    }
  });

  test('should search applications by name', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('Thabo');

    // Should show filtered results
    await expect(page.getByText(/thabo/i)).toBeVisible();
  });

  test('should open application detail modal', async ({ page }) => {
    // Click first application row
    await page.getByRole('row').nth(1).click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /application details/i })).toBeVisible();

    // Should show applicant information
    await expect(page.getByTestId('applicant-name')).toBeVisible();
    await expect(page.getByTestId('applicant-email')).toBeVisible();
    await expect(page.getByTestId('applicant-phone')).toBeVisible();
  });

  test('should update application status', async ({ page }) => {
    // Open application modal
    await page.getByRole('row').nth(1).click();

    // Change status
    await page.getByRole('combobox', { name: /status/i }).selectOption('reviewing');
    await page.getByRole('button', { name: /update status/i }).click();

    // Should show confirmation
    await expect(page.getByText(/status updated/i)).toBeVisible();

    // Status badge should reflect change
    await expect(page.getByTestId('status-badge')).toContainText(/reviewing/i);
  });

  test('should add reviewer note', async ({ page }) => {
    // Open application modal
    await page.getByRole('row').nth(1).click();

    // Navigate to notes tab
    await page.getByRole('tab', { name: /notes/i }).click();

    // Add note
    await page.getByPlaceholder(/add a note/i).fill('Applicant has strong academic record');
    await page.getByRole('button', { name: /add note/i }).click();

    // Note should appear in list
    await expect(page.getByText(/strong academic record/i)).toBeVisible();
  });

  test('should view and download documents', async ({ page }) => {
    // Open application modal
    await page.getByRole('row').nth(1).click();

    // Navigate to documents tab
    await page.getByRole('tab', { name: /documents/i }).click();

    // Documents should be listed
    await expect(page.getByTestId('document-list')).toBeVisible();

    // Click view button
    const firstDocument = page.locator('[data-testid="document-card"]').first();
    await firstDocument.hover();
    await firstDocument.getByRole('button', { name: /view/i }).click();

    // Document viewer should open
    await expect(page.getByTestId('document-viewer')).toBeVisible();
  });

  test('should rank applications', async ({ page }) => {
    // Switch to ranking view
    await page.getByRole('button', { name: /ranking/i }).click();

    // Drag application to new position (if drag-drop implemented)
    // Or use ranking buttons
    const firstApp = page.locator('[data-testid="application-card"]').first();
    await firstApp.getByRole('button', { name: /move up/i }).click();

    // Should show updated ranking
    await expect(page.getByText(/ranking updated/i)).toBeVisible();
  });

  test('should close modal with escape key', async ({ page }) => {
    // Open modal
    await page.getByRole('row').nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
```

### Team Management E2E Tests

```typescript
// apps/dashboard/tests/e2e/team.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/dashboard/test-university/team');
  });

  test('should display team members list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /team/i })).toBeVisible();
    await expect(page.getByTestId('members-list')).toBeVisible();
  });

  test('should send team invitation', async ({ page }) => {
    // Click invite button
    await page.getByRole('button', { name: /invite member/i }).click();

    // Fill invitation form
    await page.getByLabel(/email/i).fill('newmember@test.com');
    await page.getByLabel(/role/i).selectOption('reviewer');
    await page.getByRole('button', { name: /send invitation/i }).click();

    // Should show success message
    await expect(page.getByText(/invitation sent/i)).toBeVisible();
  });

  test('should display pending invitations', async ({ page }) => {
    // Navigate to invitations tab
    await page.getByRole('tab', { name: /invitations/i }).click();

    // Should show pending invitations
    await expect(page.getByTestId('invitations-list')).toBeVisible();
  });

  test('should resend invitation', async ({ page }) => {
    await page.getByRole('tab', { name: /invitations/i }).click();

    // Find invitation and resend
    const invitation = page.locator('[data-testid="invitation-card"]').first();
    await invitation.getByRole('button', { name: /resend/i }).click();

    // Should show confirmation
    await expect(page.getByText(/invitation resent/i)).toBeVisible();
  });

  test('should remove team member', async ({ page }) => {
    // Find member
    const member = page.locator('[data-testid="member-card"]').first();
    const memberName = await member.getByTestId('member-name').textContent();

    // Click remove
    await member.getByRole('button', { name: /remove/i }).click();

    // Confirm removal
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show success message
    await expect(page.getByText(/member removed/i)).toBeVisible();

    // Member should not appear in list
    await expect(page.getByText(memberName || '')).not.toBeVisible();
  });

  test('should update member role', async ({ page }) => {
    // Find member
    const member = page.locator('[data-testid="member-card"]').first();

    // Change role
    await member.getByRole('combobox', { name: /role/i }).selectOption('admin');

    // Should auto-save and show confirmation
    await expect(page.getByText(/role updated/i)).toBeVisible();
  });
});
```

### Agent Interactions E2E Tests

```typescript
// apps/dashboard/tests/e2e/agents.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

test.describe('Agent Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('should open analytics agent chat', async ({ page }) => {
    await page.goto('/dashboard/test-university/applications');

    // Open agent panel
    await page.getByRole('button', { name: /analytics/i }).click();

    // Chat interface should be visible
    await expect(page.getByPlaceholder(/ask analytics/i)).toBeVisible();
  });

  test('should send message to analytics agent', async ({ page }) => {
    await page.goto('/dashboard/test-university/applications');
    await page.getByRole('button', { name: /analytics/i }).click();

    // Send message
    await page.getByPlaceholder(/ask analytics/i).fill('How many pending applications?');
    await page.getByRole('button', { name: /send/i }).click();

    // Should show user message
    await expect(page.getByText(/how many pending applications/i)).toBeVisible();

    // Should show agent response (wait for streaming)
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should generate and display chart', async ({ page }) => {
    await page.goto('/dashboard/test-university/applications');
    await page.getByRole('button', { name: /analytics/i }).click();

    // Request chart
    await page.getByPlaceholder(/ask analytics/i).fill('Show applications by status chart');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for chart to render
    await expect(page.getByTestId('chart-container')).toBeVisible({ timeout: 15000 });
  });

  test('should pin chart to dashboard', async ({ page }) => {
    await page.goto('/dashboard/test-university/applications');
    await page.getByRole('button', { name: /analytics/i }).click();

    // Generate chart first
    await page.getByPlaceholder(/ask analytics/i).fill('Show applications trend');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByTestId('chart-container')).toBeVisible({ timeout: 15000 });

    // Pin chart
    await page.getByRole('button', { name: /pin/i }).click();

    // Should show confirmation
    await expect(page.getByText(/chart pinned/i)).toBeVisible();
  });

  test('should use reviewer assistant', async ({ page }) => {
    await page.goto('/dashboard/test-university/applications');

    // Open application
    await page.getByRole('row').nth(1).click();

    // Open reviewer assistant
    await page.getByRole('button', { name: /ask assistant/i }).click();

    // Send query
    await page.getByPlaceholder(/ask about this application/i).fill('Does this applicant meet requirements?');
    await page.getByRole('button', { name: /send/i }).click();

    // Should show response
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should view agent session history', async ({ page }) => {
    await page.goto('/dashboard/test-university');

    // Navigate to agent sessions
    await page.getByRole('link', { name: /agent sessions/i }).click();

    // Should list recent sessions
    await expect(page.getByTestId('sessions-list')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
  });
});
```

### Performance Tests (Locust)

```python
# apps/backend/tests/performance/locustfile.py
"""
Performance tests for One For All Dashboard API.
Tests institution admin/reviewer workflows with realistic load patterns.
"""
from locust import HttpUser, task, between, events
import json
import random
import uuid

class AdminUser(HttpUser):
    """Simulate institution admin behavior."""
    wait_time = between(2, 5)
    weight = 3  # 30% of users are admins

    def on_start(self):
        """Setup: Mock authentication."""
        self.institution_id = "test-institution-id"
        self.auth_token = "Bearer test-token"

    @task(5)
    def view_applications_list(self):
        """View applications list (most common action)."""
        self.client.get(
            f"/api/institutions/{self.institution_id}/applications",
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]/applications"
        )

    @task(3)
    def view_dashboard(self):
        """View institution dashboard."""
        self.client.get(
            f"/api/institutions/{self.institution_id}",
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]"
        )

    @task(2)
    def view_team_members(self):
        """View team members."""
        self.client.get(
            f"/api/institutions/{self.institution_id}/members",
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]/members"
        )

    @task(1)
    def view_campuses(self):
        """View campuses."""
        self.client.get(
            f"/api/institutions/{self.institution_id}/campuses",
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]/campuses"
        )


class ReviewerUser(HttpUser):
    """Simulate reviewer behavior."""
    wait_time = between(1, 3)
    weight = 7  # 70% of users are reviewers

    def on_start(self):
        """Setup: Mock authentication."""
        self.institution_id = "test-institution-id"
        self.auth_token = "Bearer test-token"

    @task(8)
    def view_applications_list(self):
        """View applications list (primary task)."""
        params = {
            "status": random.choice(["pending", "reviewing", "accepted"]),
            "page": random.randint(1, 5),
        }
        self.client.get(
            f"/api/institutions/{self.institution_id}/applications",
            params=params,
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]/applications?page=N"
        )

    @task(5)
    def view_application_detail(self):
        """View single application details."""
        app_id = f"APP-{random.randint(1, 1000)}"
        self.client.get(
            f"/api/applications/{app_id}/status",
            headers={"Authorization": self.auth_token},
            name="/api/applications/[id]/status"
        )

    @task(3)
    def add_reviewer_note(self):
        """Add note to application."""
        app_id = f"APP-{random.randint(1, 1000)}"
        self.client.post(
            f"/api/applications/{app_id}/notes",
            json={
                "content": f"Review note {uuid.uuid4().hex[:8]}",
                "is_internal": True,
            },
            headers={"Authorization": self.auth_token},
            name="/api/applications/[id]/notes"
        )

    @task(2)
    def update_application_status(self):
        """Update application status."""
        app_id = f"APP-{random.randint(1, 1000)}"
        self.client.patch(
            f"/api/applications/{app_id}/status",
            json={"status": random.choice(["reviewing", "accepted", "rejected"])},
            headers={"Authorization": self.auth_token},
            name="/api/applications/[id]/status"
        )

    @task(1)
    def use_reviewer_assistant(self):
        """Send message to reviewer assistant agent."""
        self.client.post(
            "/api/agents/reviewer-assistant/chat",
            json={
                "message": "Does this applicant meet requirements?",
                "application_id": f"APP-{random.randint(1, 1000)}",
            },
            headers={"Authorization": self.auth_token},
            name="/api/agents/reviewer-assistant/chat"
        )


class AnalyticsUser(HttpUser):
    """Simulate analytics-focused admin behavior."""
    wait_time = between(5, 10)
    weight = 1  # 10% of users focus on analytics

    def on_start(self):
        """Setup: Mock authentication."""
        self.institution_id = "test-institution-id"
        self.auth_token = "Bearer test-token"
        self.session_id = None

    @task(3)
    def get_analytics_stats(self):
        """Get analytics statistics."""
        self.client.get(
            "/api/agents/analytics/stats",
            headers={"Authorization": self.auth_token},
            name="/api/agents/analytics/stats"
        )

    @task(2)
    def chat_with_analytics_agent(self):
        """Send query to analytics agent."""
        self.client.post(
            "/api/agents/analytics/chat",
            json={
                "message": "Show applications by status",
                "institution_id": self.institution_id,
            },
            headers={"Authorization": self.auth_token},
            name="/api/agents/analytics/chat"
        )

    @task(1)
    def view_agent_sessions(self):
        """View agent session history."""
        self.client.get(
            f"/api/institutions/{self.institution_id}/agent-sessions",
            headers={"Authorization": self.auth_token},
            name="/api/institutions/[id]/agent-sessions"
        )


# Performance thresholds
@events.quitting.add_listener
def check_thresholds(environment, **kw):
    """Fail if performance thresholds not met."""
    stats = environment.stats.total

    # P95 should be under 2000ms
    p95_latency = stats.get_response_time_percentile(0.95)
    if p95_latency > 2000:
        print(f"❌ FAIL: P95 latency {p95_latency:.0f}ms > 2000ms threshold")
        environment.process_exit_code = 1
    else:
        print(f"✓ PASS: P95 latency {p95_latency:.0f}ms < 2000ms threshold")

    # Error rate should be under 1%
    if stats.fail_ratio > 0.01:
        print(f"❌ FAIL: Error rate {stats.fail_ratio * 100:.2f}% > 1% threshold")
        environment.process_exit_code = 1
    else:
        print(f"✓ PASS: Error rate {stats.fail_ratio * 100:.2f}% < 1% threshold")

    # At least 50 RPS sustained
    if stats.total_rps < 50:
        print(f"⚠ WARN: RPS {stats.total_rps:.0f} < 50 target")
    else:
        print(f"✓ PASS: RPS {stats.total_rps:.0f} >= 50 target")
```

### GitHub Actions E2E Workflow

```yaml
# .github/workflows/dashboard-e2e.yml
name: Dashboard E2E Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/dashboard/**'
  pull_request:
    paths:
      - 'apps/dashboard/**'

env:
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY_TEST }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY_TEST }}
  NEXT_PUBLIC_CONVEX_URL: ${{ secrets.CONVEX_URL_TEST }}

jobs:
  e2e:
    name: Playwright E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Cache pnpm modules
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        working-directory: apps/dashboard
        run: pnpm exec playwright install --with-deps chromium firefox

      - name: Build dashboard
        working-directory: apps/dashboard
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_TEST }}

      - name: Run E2E tests
        working-directory: apps/dashboard
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/dashboard/playwright-report/
          retention-days: 7

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots
          path: apps/dashboard/test-results/
          retention-days: 7

  performance:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: e2e
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Locust
        run: pip install locust

      - name: Run performance tests
        working-directory: apps/backend
        run: |
          locust -f tests/performance/locustfile.py \
            --headless \
            --users 100 \
            --spawn-rate 10 \
            --run-time 5m \
            --host ${{ secrets.STAGING_API_URL }} \
            --html=performance-report.html

      - name: Upload performance report
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: apps/backend/performance-report.html
          retention-days: 30

      - name: Check performance thresholds
        run: |
          if [ $? -ne 0 ]; then
            echo "❌ Performance thresholds not met"
            exit 1
          fi
```

---

## Verification

### Running E2E Tests Locally

```bash
# Install Playwright
cd apps/dashboard
pnpm add -D @playwright/test
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm exec playwright test auth.spec.ts

# Run with UI mode (debugging)
pnpm exec playwright test --ui

# Run headed (see browser)
pnpm exec playwright test --headed

# Run specific browser
pnpm exec playwright test --project=firefox

# Generate report
pnpm exec playwright show-report
```

### Running Performance Tests

```bash
# Install Locust
pip install locust

# Run Locust with web UI
cd apps/backend
locust -f tests/performance/locustfile.py --host http://localhost:8000

# Open browser to http://localhost:8089 to control test

# Run headless for CI
locust -f tests/performance/locustfile.py \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 2m \
  --host http://localhost:8000
```

### Expected Outcomes

```
Playwright E2E Results:
  tests/e2e/auth.spec.ts
    ✓ should display landing page (0.8s)
    ✓ should redirect unauthenticated users to sign in (1.1s)
    ✓ should allow sign in with valid credentials (3.2s)
    ✓ should persist session across page reloads (1.5s)
    ✓ should handle sign out (1.8s)

  tests/e2e/institution.spec.ts
    ✓ should display institution dashboard (1.2s)
    ✓ should complete institution setup wizard (4.5s)
    ✓ should create new campus (2.8s)

  tests/e2e/applications.spec.ts
    ✓ should display applications list (1.4s)
    ✓ should filter applications by status (2.1s)
    ✓ should open application detail modal (1.9s)
    ✓ should update application status (2.5s)
    ✓ should add reviewer note (2.2s)

  tests/e2e/team.spec.ts
    ✓ should display team members list (1.1s)
    ✓ should send team invitation (2.3s)

  tests/e2e/agents.spec.ts
    ✓ should send message to analytics agent (5.2s)
    ✓ should generate and display chart (8.1s)

  18 passed (52.3s)

Locust Performance Results:
  Type     Name                                    # reqs   # fails  Avg     P95     P99
  GET      /api/institutions/[id]/applications     2500     0        180ms   950ms   1400ms
  GET      /api/applications/[id]/status           1200     0        145ms   720ms   1100ms
  POST     /api/applications/[id]/notes            450      0        220ms   1100ms  1650ms
  POST     /api/agents/reviewer-assistant/chat     150      0        850ms   1850ms  2400ms

  Aggregated                                       4300     0        245ms   1150ms  1700ms

  ✓ P95 latency: 1150ms < 2000ms threshold
  ✓ Error rate: 0% < 1% threshold
  ✓ RPS: 68 >= 50 target
```

### Success Criteria Checklist

- [ ] Playwright tests pass for all institution management journeys
- [ ] Playwright tests pass for application review workflows
- [ ] Playwright tests pass for agent interactions
- [ ] E2E tests integrated into CI/CD pipeline
- [ ] Performance tests meet P95 < 2000ms threshold
- [ ] Error rate < 1% in performance tests
- [ ] Staging environment tested successfully
- [ ] Dashboard builds successfully in CI
- [ ] Test reports generated and archived
- [ ] Screenshots captured on test failures

---

## Summary

Phase 5 completes the testing pyramid with comprehensive E2E coverage:

1. **Browser-level E2E tests** via Playwright covering:
   - Authentication flows (Clerk OAuth)
   - Institution management (setup, campuses, faculties, courses)
   - Team management (invitations, roles, members)
   - Application review (list, filters, modal, status updates, notes)
   - Agent interactions (analytics, reviewer assistant, sessions)

2. **Full-stack integration** from Dashboard → Next.js API Routes → Convex/Supabase

3. **Performance benchmarks** with automated gates:
   - 100 concurrent users
   - P95 latency < 2000ms
   - Error rate < 1%
   - 50+ RPS sustained

4. **CI/CD integration** for continuous quality assurance:
   - Automated E2E test runs on PR
   - Performance tests on main branch
   - Test reports and artifacts
   - Screenshot capture on failures

With all 5 phases complete, One For All has comprehensive test coverage from unit tests through production-like E2E scenarios, ensuring quality and reliability for the institution management platform.

---

## Reference

- [Phase 1: Unit Tests](./PHASE_1_UNIT_TESTS.md)
- [Phase 2: VCR Integration](./PHASE_2_VCR_INTEGRATION.md)
- [Phase 3: Agent Trajectories](./PHASE_3_TRAJECTORY.md)
- [Phase 4: Security Tests](./PHASE_4_SECURITY.md)
- [Master Strategy](../AGENT_TESTING_STRATEGY.md)
- [Playwright Documentation](https://playwright.dev/)
- [Locust Documentation](https://docs.locust.io/)
