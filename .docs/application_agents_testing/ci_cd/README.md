# GitHub Actions Workflows

This directory contains CI/CD workflows for the One For All monorepo.

## Available Workflows

### Backend CI/CD (`backend-ci.yml`)
Comprehensive testing and deployment pipeline for the Python CrewAI backend.

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Changes to `apps/backend/**` or workflow files

**Stages:**
1. Unit Tests (10 min)
2. Integration Tests (30 min)
3. API Tests (15 min)
4. Code Quality (10 min, non-blocking)
5. Staging Deploy (10 min, main/develop only)
6. E2E + Performance Tests (30 min)
7. Production Gate (5 min, main only)

**Required Secrets:**
- `DEEPSEEK_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `STAGING_API_KEY`
- `RENDER_DEPLOY_HOOK`
- `CODECOV_TOKEN`

See `apps/backend/CI_CD_SETUP.md` for detailed setup instructions.

## Setting Up Secrets

1. Go to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add each required secret with its value

## Viewing Workflow Runs

- **Actions Tab:** Click "Actions" in repository navigation
- **Status Badges:** Add to README.md:
  ```markdown
  ![Backend CI](https://github.com/your-org/your-repo/workflows/Backend%20CI%2FCD/badge.svg)
  ```

## Artifacts

Workflows generate artifacts available for download:
- Coverage reports (7 days)
- Test results (7 days)
- Performance reports (30 days)
- Production readiness summaries (90 days)

---

**Last Updated:** 2026-01-08
