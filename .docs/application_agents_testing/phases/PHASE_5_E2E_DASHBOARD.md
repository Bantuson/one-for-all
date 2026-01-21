# Phase 5: E2E & Dashboard Integration Tests

## Overview

**Goal:** Implement end-to-end testing that covers the full stack (Dashboard → API → Database) with browser automation, performance baselines, and CI/CD integration.

**Estimated Effort:** 5-7 days

**Dependencies:**
- Phase 1-4 complete
- Dashboard frontend operational
- Staging environment configured

**Success Criteria:**
- Playwright E2E tests for critical user journeys
- Dashboard integrated into CI/CD pipeline
- Performance baselines established (P95 < 2000ms)
- Real LLM calls tested in staging (rate-limited)
- Production parity validated

---

## Implementation Checklist

### Dashboard E2E Tests

- [ ] **Authentication Flows**
  - [ ] Clerk sign-in/sign-up
  - [ ] Session persistence
  - [ ] Role-based access (applicant vs reviewer)

- [ ] **Applicant Journeys**
  - [ ] Start application wizard
  - [ ] Complete personal information form
  - [ ] Upload documents
  - [ ] Submit application
  - [ ] View application status

- [ ] **Reviewer Journeys**
  - [ ] Login as reviewer
  - [ ] View application queue
  - [ ] Review application details
  - [ ] Flag/approve documents
  - [ ] Update application status

- [ ] **Analytics Dashboard**
  - [ ] View charts and metrics
  - [ ] Filter by date/status
  - [ ] Export data

### API Integration Tests

- [ ] **Backend API endpoints**
  - [ ] Health checks
  - [ ] Application CRUD
  - [ ] Document upload/download
  - [ ] Status updates

### Performance Tests

- [ ] **Locust load tests**
  - [ ] Concurrent user simulation
  - [ ] P95 latency measurement
  - [ ] Error rate tracking

### CI/CD Integration

- [ ] **GitHub Actions workflow**
  - [ ] Dashboard build verification
  - [ ] E2E test execution
  - [ ] Performance gate
  - [ ] Staging deployment

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/dashboard/tests/e2e/` | Create | E2E test directory |
| `apps/dashboard/tests/e2e/auth.spec.ts` | Create | Auth flow tests |
| `apps/dashboard/tests/e2e/application.spec.ts` | Create | Application journey tests |
| `apps/dashboard/tests/e2e/reviewer.spec.ts` | Create | Reviewer workflow tests |
| `apps/dashboard/playwright.config.ts` | Create | Playwright configuration |
| `.github/workflows/dashboard-e2e.yml` | Create | E2E CI workflow |
| `apps/backend/tests/performance/locustfile.py` | Modify | Update load tests |

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

### Authentication E2E Tests

```typescript
// apps/dashboard/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should allow sign in with valid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    // Fill in test credentials (use Clerk test mode)
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Handle OTP or password step (depends on Clerk config)
    // ...

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should persist session across page reloads', async ({ page, context }) => {
    // Sign in first
    await page.goto('/sign-in');
    // ... sign in steps ...

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should handle sign out', async ({ page }) => {
    // Sign in first
    await page.goto('/dashboard');
    // ... assume authenticated ...

    // Click sign out
    await page.getByTestId('user-menu').click();
    await page.getByRole('button', { name: /sign out/i }).click();

    // Should redirect to home or sign-in
    await expect(page).toHaveURL(/sign-in|\/$/);
  });
});
```

### Applicant Journey E2E Tests

```typescript
// apps/dashboard/tests/e2e/application.spec.ts
import { test, expect } from '@playwright/test';
import { signIn, createTestApplicant } from './helpers';

test.describe('Application Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as test applicant
    await signIn(page, 'applicant');
  });

  test('should start new application', async ({ page }) => {
    await page.goto('/dashboard');

    // Click start application
    await page.getByRole('button', { name: /start application/i }).click();

    // Should navigate to application wizard
    await expect(page).toHaveURL(/application\/new/);
    await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible();
  });

  test('should complete personal information step', async ({ page }) => {
    await page.goto('/application/new');

    // Fill personal info
    await page.getByLabel(/first name/i).fill('Thabo');
    await page.getByLabel(/last name/i).fill('Mbeki');
    await page.getByLabel(/id number/i).fill('0001010000085');
    await page.getByLabel(/date of birth/i).fill('2000-01-01');
    await page.getByLabel(/email/i).fill('thabo@test.com');
    await page.getByLabel(/mobile/i).fill('+27821234567');

    // Submit step
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should move to next step
    await expect(page.getByRole('heading', { name: /academic information/i })).toBeVisible();
  });

  test('should complete academic information step', async ({ page }) => {
    await page.goto('/application/new/academic');

    // Fill academic info
    await page.getByLabel(/aps score/i).fill('42');
    await page.getByLabel(/mathematics/i).fill('85');
    await page.getByLabel(/physical science/i).fill('80');
    await page.getByLabel(/english/i).fill('75');

    // Submit step
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should move to course selection
    await expect(page.getByRole('heading', { name: /course selection/i })).toBeVisible();
  });

  test('should upload documents', async ({ page }) => {
    await page.goto('/application/new/documents');

    // Upload ID document
    const idUpload = page.getByTestId('upload-id-document');
    await idUpload.setInputFiles('./tests/fixtures/sample-id.pdf');

    // Wait for upload confirmation
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible();

    // Upload matric certificate
    const matricUpload = page.getByTestId('upload-matric-certificate');
    await matricUpload.setInputFiles('./tests/fixtures/sample-matric.pdf');

    await expect(page.getByText(/uploaded successfully/i)).toHaveCount(2);
  });

  test('should submit application', async ({ page }) => {
    await page.goto('/application/new/review');

    // Review summary should be visible
    await expect(page.getByRole('heading', { name: /review/i })).toBeVisible();

    // Accept terms
    await page.getByLabel(/i agree to the terms/i).check();

    // Submit
    await page.getByRole('button', { name: /submit application/i }).click();

    // Should show confirmation
    await expect(page.getByText(/application submitted/i)).toBeVisible();
    await expect(page.getByTestId('application-id')).toBeVisible();
  });

  test('should view application status', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on application
    await page.getByTestId('application-card').first().click();

    // Should show status page
    await expect(page.getByRole('heading', { name: /application status/i })).toBeVisible();
    await expect(page.getByTestId('status-badge')).toBeVisible();
  });
});
```

### Reviewer Journey E2E Tests

```typescript
// apps/dashboard/tests/e2e/reviewer.spec.ts
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test.describe('Reviewer Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as reviewer
    await signIn(page, 'reviewer');
  });

  test('should view application queue', async ({ page }) => {
    await page.goto('/reviewer/queue');

    // Should show applications table
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
  });

  test('should filter applications by status', async ({ page }) => {
    await page.goto('/reviewer/queue');

    // Filter by pending
    await page.getByRole('combobox', { name: /status/i }).selectOption('pending');

    // All visible rows should be pending
    const statusCells = page.getByTestId('status-cell');
    await expect(statusCells.first()).toContainText(/pending/i);
  });

  test('should review application details', async ({ page }) => {
    await page.goto('/reviewer/queue');

    // Click first application
    await page.getByRole('row').nth(1).click();

    // Should show application details
    await expect(page.getByRole('heading', { name: /application details/i })).toBeVisible();
    await expect(page.getByTestId('applicant-info')).toBeVisible();
    await expect(page.getByTestId('document-list')).toBeVisible();
  });

  test('should flag document with reason', async ({ page }) => {
    await page.goto('/reviewer/application/TEST-APP-123');

    // Click flag button on document
    await page.getByTestId('document-card').first().hover();
    await page.getByRole('button', { name: /flag/i }).click();

    // Enter reason
    await page.getByPlaceholder(/reason/i).fill('Document is blurry, please upload clearer image');
    await page.getByRole('button', { name: /submit flag/i }).click();

    // Should show flagged status
    await expect(page.getByTestId('document-card').first()).toContainText(/flagged/i);
  });

  test('should approve document', async ({ page }) => {
    await page.goto('/reviewer/application/TEST-APP-123');

    // Click approve button
    await page.getByTestId('document-card').first().hover();
    await page.getByRole('button', { name: /approve/i }).click();

    // Should show approved status
    await expect(page.getByTestId('document-card').first()).toContainText(/approved/i);
  });

  test('should update application status', async ({ page }) => {
    await page.goto('/reviewer/application/TEST-APP-123');

    // Change status
    await page.getByRole('combobox', { name: /status/i }).selectOption('accepted');

    // Confirm action
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show success message
    await expect(page.getByText(/status updated/i)).toBeVisible();
  });
});
```

### Performance Tests (Locust)

```python
# apps/backend/tests/performance/locustfile.py
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner
import json
import random
import uuid

class ApplicantUser(HttpUser):
    """Simulate applicant behavior."""
    wait_time = between(1, 3)
    weight = 8  # 80% of users are applicants

    def on_start(self):
        """Setup: Create test profile."""
        self.profile_id = f"PERF-{uuid.uuid4().hex[:8]}"
        self.session_token = None

    @task(3)
    def view_dashboard(self):
        """View dashboard (most common action)."""
        headers = {"X-Session-Token": self.session_token} if self.session_token else {}
        self.client.get("/api/dashboard", headers=headers, name="/api/dashboard")

    @task(2)
    def check_application_status(self):
        """Check application status."""
        if self.session_token:
            self.client.get(
                f"/api/applications/{self.profile_id}/status",
                headers={"X-Session-Token": self.session_token},
                name="/api/applications/[id]/status"
            )

    @task(1)
    def submit_application(self):
        """Submit new application (less frequent)."""
        payload = {
            "profile_id": self.profile_id,
            "first_name": "Perf",
            "last_name": "Test",
            "email": f"perf-{uuid.uuid4().hex[:4]}@test.com",
            "universities": ["UCT"],
            "first_choice_courses": {"UCT": "BSc Computer Science"},
            "total_aps_score": random.randint(30, 45),
        }
        self.client.post(
            "/api/applications/submit",
            json=payload,
            name="/api/applications/submit"
        )


class ReviewerUser(HttpUser):
    """Simulate reviewer behavior."""
    wait_time = between(2, 5)
    weight = 2  # 20% of users are reviewers

    @task(3)
    def view_queue(self):
        """View application queue."""
        self.client.get(
            "/api/reviewer/queue",
            headers={"X-API-Key": "test-api-key"},
            name="/api/reviewer/queue"
        )

    @task(2)
    def view_application(self):
        """View single application details."""
        self.client.get(
            f"/api/reviewer/application/TEST-{random.randint(1, 100)}",
            headers={"X-API-Key": "test-api-key"},
            name="/api/reviewer/application/[id]"
        )

    @task(1)
    def update_status(self):
        """Update application status."""
        self.client.patch(
            f"/api/reviewer/application/TEST-{random.randint(1, 100)}/status",
            json={"status": random.choice(["pending", "reviewing", "accepted"])},
            headers={"X-API-Key": "test-api-key"},
            name="/api/reviewer/application/[id]/status"
        )


# Performance thresholds
@events.quitting.add_listener
def check_thresholds(environment, **kw):
    """Fail if performance thresholds not met."""
    stats = environment.stats.total

    # P95 should be under 2000ms
    if stats.get_response_time_percentile(0.95) > 2000:
        print(f"FAIL: P95 latency {stats.get_response_time_percentile(0.95)}ms > 2000ms")
        environment.process_exit_code = 1

    # Error rate should be under 1%
    if stats.fail_ratio > 0.01:
        print(f"FAIL: Error rate {stats.fail_ratio * 100}% > 1%")
        environment.process_exit_code = 1

    # At least 50 RPS sustained
    if stats.total_rps < 50:
        print(f"WARN: RPS {stats.total_rps} < 50 target")
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
        run: pnpm exec playwright install --with-deps chromium

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
            --users 50 \
            --spawn-rate 5 \
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
            echo "Performance thresholds not met"
            exit 1
          fi
```

---

## Verification

### Running E2E Tests Locally

```bash
# Install Playwright
cd apps/dashboard && pnpm add -D @playwright/test
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run specific test file
pnpm exec playwright test auth.spec.ts

# Run with UI mode (debugging)
pnpm exec playwright test --ui

# Run headed (see browser)
pnpm exec playwright test --headed

# Generate report
pnpm exec playwright show-report
```

### Running Performance Tests

```bash
# Run Locust locally
cd apps/backend
locust -f tests/performance/locustfile.py --host http://localhost:8000

# Run headless for CI
locust -f tests/performance/locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --host http://localhost:8000
```

### Expected Outcomes

```
Playwright E2E Results:
  tests/e2e/auth.spec.ts
    ✓ should display login page (1.2s)
    ✓ should redirect unauthenticated users to login (0.8s)
    ✓ should allow sign in with valid credentials (3.5s)

  tests/e2e/application.spec.ts
    ✓ should start new application (2.1s)
    ✓ should complete personal information step (1.8s)
    ✓ should upload documents (4.2s)
    ✓ should submit application (2.9s)

  15 passed (45.2s)

Locust Performance Results:
  Type     Name                    # reqs   # fails  Avg     P95     P99
  GET      /api/dashboard          1250     0        145ms   890ms   1450ms
  GET      /api/applications/[id]   450     0        230ms   1200ms  1800ms
  POST     /api/applications        150     0        380ms   1500ms  1950ms

  Aggregated                       1850     0        195ms   1100ms  1750ms

  ✓ P95 latency: 1100ms < 2000ms threshold
  ✓ Error rate: 0% < 1% threshold
```

### Success Criteria Checklist

- [ ] Playwright tests pass for all user journeys
- [ ] E2E tests integrated into CI/CD
- [ ] Performance tests meet P95 < 2000ms
- [ ] Error rate < 1%
- [ ] Staging environment tested
- [ ] Dashboard builds successfully in CI
- [ ] Test reports generated and archived

---

## Summary

This phase completes the testing pyramid by adding:

1. **Browser-level E2E tests** via Playwright
2. **Full-stack integration** from Dashboard to Database
3. **Performance benchmarks** with automated gates
4. **CI/CD integration** for continuous quality assurance

With all 5 phases complete, the One For All platform will have comprehensive test coverage from unit tests through production-like E2E scenarios.

---

## Reference

- [Phase 1: Unit Tests](./PHASE_1_UNIT_TESTS.md)
- [Phase 2: VCR Integration](./PHASE_2_VCR_INTEGRATION.md)
- [Phase 3: Agent Trajectories](./PHASE_3_TRAJECTORY.md)
- [Phase 4: Security Tests](./PHASE_4_SECURITY.md)
- [Master Strategy](../AGENT_TESTING_STRATEGY.md)
