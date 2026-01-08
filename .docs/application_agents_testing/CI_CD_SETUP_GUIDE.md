# CI/CD Setup Guide

This guide documents the manual configuration steps needed to complete the CI/CD pipeline setup for the One For All application agents.

## Prerequisites

- GitHub repository admin access
- Render account (free tier is sufficient for staging)
- Codecov account (optional, for coverage tracking)
- Access to production Supabase project

---

## 1. GitHub Secrets Configuration

Navigate to: **Repository Settings > Secrets and variables > Actions**

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `DEEPSEEK_API_KEY` | DeepSeek LLM API key | From DeepSeek dashboard |
| `SUPABASE_URL` | Production Supabase project URL | Supabase > Project Settings > API |
| `SUPABASE_KEY` | Service role key (NOT anon key) | Supabase > Project Settings > API |
| `STAGING_API_KEY` | API key for staging backend | Generate a secure random string |
| `RENDER_DEPLOY_HOOK` | Render deployment webhook URL | See Render Setup below |
| `CODECOV_TOKEN` | Codecov upload token (optional) | Codecov > Repository Settings |

### Adding Secrets

1. Go to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Enter the secret name exactly as shown above
4. Paste the value
5. Click "Add secret"

### Generating a Secure API Key

For `STAGING_API_KEY`, generate a random string:

```bash
# Using openssl
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 2. Render Staging Setup

### Step 1: Create Render Account

1. Sign up at https://render.com
2. Connect your GitHub account

### Step 2: Create Web Service

1. Go to Render Dashboard > New > Web Service
2. Connect repository: `your-username/portfolio`
3. Configure service:
   - **Name**: `oneforall-backend-staging`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `develop`
   - **Root Directory**: `apps/backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -e .`
   - **Start Command**: `uvicorn one_for_all.api:app --host 0.0.0.0 --port $PORT`

### Step 3: Configure Environment Variables

In Render service settings, add:

| Key | Value |
|-----|-------|
| `ONEFORALL_TEST_MODE` | `false` |
| `PYTHON_VERSION` | `3.12` |
| `NEXT_PUBLIC_SUPABASE_URL` | (your Supabase URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service role key) |
| `DEEPSEEK_API_KEY` | (your DeepSeek key) |
| `BACKEND_API_KEY` | (same as STAGING_API_KEY) |

### Step 4: Get Deploy Hook

1. Go to service Settings > Deploy Hooks
2. Click "Create Deploy Hook"
3. Name it: `github-ci`
4. Copy the URL
5. Add to GitHub secrets as `RENDER_DEPLOY_HOOK`

### Step 5: Verify Deployment

After first deploy:

```bash
curl https://your-service.onrender.com/health
# Should return: {"status": "healthy", ...}
```

---

## 3. Branch Protection Rules

Navigate to: **Repository Settings > Branches**

### Protect `main` Branch

1. Click "Add branch protection rule"
2. Branch name pattern: `main`
3. Enable:
   - [x] Require a pull request before merging
   - [x] Require approvals (1)
   - [x] Require status checks to pass before merging
   - [x] Require branches to be up to date before merging
4. Required status checks:
   - `unit-tests`
   - `integration-tests`
   - `api-tests`
   - `production-gate`
5. Enable:
   - [x] Require conversation resolution before merging
   - [x] Do not allow bypassing the above settings
6. Click "Create"

### Protect `develop` Branch

1. Add another rule for: `develop`
2. Enable:
   - [x] Require a pull request before merging
   - [x] Require approvals (1)
   - [x] Require status checks to pass before merging
3. Required status checks:
   - `unit-tests`
   - `integration-tests`
   - `api-tests`
4. Click "Create"

---

## 4. Codecov Setup (Optional)

### Step 1: Sign Up

1. Go to https://codecov.io
2. Sign up with GitHub
3. Grant access to repository

### Step 2: Get Token

1. Navigate to repository in Codecov
2. Go to Settings > General
3. Copy the "Repository Upload Token"
4. Add to GitHub secrets as `CODECOV_TOKEN`

### Step 3: Verify Integration

After first CI run with coverage:
- Check Codecov dashboard for coverage reports
- Coverage badge will be available in repository settings

---

## 5. Phase 3 Database Migrations

The Phase 3 document upload migrations need to be applied to Supabase.

### Option A: Via Supabase Dashboard

1. Go to Supabase > SQL Editor
2. Run migrations in order:

```sql
-- First: Create storage buckets
-- Copy content from: apps/backend/supabase/migrations/20260107_document_storage.sql

-- Second: Update document tables
-- Copy content from: apps/backend/supabase/migrations/20260107_update_document_tables.sql
```

### Option B: Via Supabase CLI

```bash
cd apps/backend
supabase db push
```

### Verify Migrations

Check that storage buckets exist:

```sql
SELECT * FROM storage.buckets WHERE id IN ('application-documents', 'nsfas-documents');
```

Check that columns exist:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'application_documents'
AND column_name IN ('file_name', 'storage_path', 'file_size', 'mime_type');
```

---

## 6. Verification Checklist

### GitHub Configuration

- [ ] All 6 secrets configured
- [ ] Branch protection on `main`
- [ ] Branch protection on `develop`

### Render Staging

- [ ] Service created and deployed
- [ ] Environment variables configured
- [ ] Health check passing
- [ ] Deploy hook added to GitHub secrets

### Database

- [ ] Storage buckets created
- [ ] Document table columns added
- [ ] RLS policies applied

### First CI Run

- [ ] Push to `develop` branch
- [ ] All stages pass (unit, integration, API tests)
- [ ] Staging deployment triggers
- [ ] E2E tests run against staging
- [ ] Performance tests complete

---

## Troubleshooting

### CI Fails on Integration Tests

**Cause**: Missing Supabase secrets
**Fix**: Verify `SUPABASE_URL` and `SUPABASE_KEY` are set correctly

### Staging Deploy Fails

**Cause**: Invalid deploy hook or build error
**Fix**:
1. Check Render logs for build errors
2. Verify deploy hook URL is correct
3. Ensure `pip install -e .` works locally

### E2E Tests Fail

**Cause**: Staging not responding or wrong API key
**Fix**:
1. Verify staging is healthy: `curl $STAGING_URL/health`
2. Check `STAGING_API_KEY` matches Render's `BACKEND_API_KEY`

### Coverage Upload Fails

**Cause**: Invalid Codecov token
**Fix**: Regenerate token in Codecov dashboard

---

## Quick Reference

### Running Tests Locally

```bash
cd apps/backend
source .venv/bin/activate

# Unit tests
pytest tests/unit/ -m unit -v

# Integration tests
pytest tests/integration/ -m integration -v

# API tests
pytest tests/api/ -m api -v

# All tests with coverage
pytest --cov=src/one_for_all --cov-report=html
```

### Manual Staging Deploy

```bash
# Trigger via webhook
curl -X POST $RENDER_DEPLOY_HOOK

# Or push to develop
git push origin develop
```

### Checking CI Status

1. Go to repository > Actions tab
2. Click on latest workflow run
3. Expand failed job for details

---

## Support

- **GitHub Actions**: Check logs in Actions tab
- **Render**: Check logs in Render dashboard
- **Supabase**: Check logs in Supabase > Logs
- **Codecov**: Check status at codecov.io
