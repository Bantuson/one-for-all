# E2E Test Suite for One For All Backend

This directory contains end-to-end (E2E) tests for the One For All backend API. These tests validate complete workflows against a deployed staging environment or local server.

## Overview

E2E tests verify:
- Health check endpoints for monitoring
- Complete application submission workflows
- NSFAS application submission flows
- Document upload and validation
- API error handling and edge cases
- Security measures (authentication, session validation)

## Prerequisites

1. **Install dependencies** (if not already installed):
   ```bash
   cd apps/backend
   pip install -e ".[dev]"
   ```

2. **Set environment variables**:
   ```bash
   export STAGING_API_URL="https://your-staging-url.com"  # or http://localhost:8000
   export STAGING_API_KEY="your-api-key-here"
   ```

   Optional:
   ```bash
   export SKIP_DOCUMENT_TESTS="true"  # Skip document tests if storage not configured
   ```

## Running E2E Tests

### Run all E2E tests
```bash
pytest tests/e2e/ -m e2e
```

### Run with verbose output
```bash
pytest tests/e2e/ -m e2e -v
```

### Run specific test class
```bash
pytest tests/e2e/test_full_workflow.py::TestHealthEndpoints -m e2e
```

### Run against localhost (default)
```bash
# No environment variables needed - defaults to http://localhost:8000
pytest tests/e2e/ -m e2e
```

### Run against staging environment
```bash
STAGING_API_URL=https://staging.render.com \
STAGING_API_KEY=your-staging-key \
pytest tests/e2e/ -m e2e
```

## Test Categories

### 1. Health & Documentation Tests
- `/health` - Basic health check
- `/health/db` - Database connectivity
- `/docs` - OpenAPI documentation
- `/redoc` - ReDoc documentation

### 2. Application Submission Tests
- Legacy endpoints: `/api/applications/submit`, `/api/applications/status/{id}`
- RESTful endpoints: `/api/v1/applications/` (CRUD operations)
- Session validation
- Authentication requirements
- Validation errors

### 3. NSFAS Submission Tests
- Legacy endpoints: `/api/nsfas/submit`, `/api/nsfas/status/{id}`
- RESTful endpoints: `/api/v1/nsfas/` (CRUD operations)
- Session validation
- Security (bank details exclusion from responses)

### 4. Document Upload Tests
- Document validation endpoints
- File upload workflows
- Application document attachment
- Security validations

### 5. Error Handling Tests
- Invalid JSON handling
- Invalid UUID formats
- Missing authentication headers
- Missing required fields

## Safety Features

All E2E tests follow strict safety protocols:

1. **TEST- Prefix**: All test data uses `TEST-` prefix for easy identification
2. **Example.com Emails**: All test emails use `@example.com` domain
3. **Fake IDs**: All applicant/session IDs are random UUIDs
4. **No Real Data**: Tests never use production user data
5. **Cleanup**: Test data can be easily identified and removed via `TEST-` prefix

Example test data:
```python
{
    "university_name": "TEST University of Pretoria",
    "personal_info": {
        "email": "test.e2e@example.com",
        "full_name": "TEST E2E Student"
    }
}
```

## Expected Test Results

### Against Localhost (without database setup)
Most tests will return **401 Unauthorized** or **422 Validation Error** because:
- Database doesn't have test sessions/applicants
- This validates authentication and validation logic works correctly

### Against Staging (with database)
Tests will properly validate:
- Session validation fails for non-existent sessions (expected 401)
- Application/NSFAS submission requires valid sessions
- Document uploads require valid applications

### Successful Health Checks
These should always pass:
- `test_health_check_returns_200` ✓
- `test_openapi_docs_available` ✓
- `test_database_health_check` ✓

## Troubleshooting

### All tests fail with connection errors
**Problem**: Cannot connect to API
**Solution**:
1. Check `STAGING_API_URL` is correct
2. Ensure API server is running
3. Check firewall/network settings

### Tests fail with 403 Forbidden
**Problem**: API key authentication failed
**Solution**:
1. Verify `STAGING_API_KEY` environment variable is set
2. Check API key is valid for the environment
3. Ensure API key matches server configuration

### Tests timeout
**Problem**: API responses are slow
**Solution**:
1. Check API server performance
2. Verify database connectivity
3. Increase timeout in `client` fixture if needed

### Document tests fail
**Problem**: Storage not configured
**Solution**:
```bash
export SKIP_DOCUMENT_TESTS="true"
pytest tests/e2e/ -m e2e
```

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run E2E Tests
  env:
    STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
    STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}
  run: |
    cd apps/backend
    pytest tests/e2e/ -m e2e --junit-xml=e2e-results.xml
```

## Adding New E2E Tests

When adding new E2E tests:

1. **Use `@pytest.mark.e2e` decorator**:
   ```python
   @pytest.mark.e2e
   def test_my_new_endpoint(client: httpx.Client):
       response = client.get("/api/my-endpoint")
       assert response.status_code == 200
   ```

2. **Use TEST- prefix for all test data**:
   ```python
   test_data = {
       "name": "TEST My Test Data",
       "email": "test@example.com"
   }
   ```

3. **Handle expected failures gracefully**:
   ```python
   # Session doesn't exist, so 401 is expected
   assert response.status_code == 401
   ```

4. **Document what the test validates**:
   ```python
   def test_endpoint_requires_auth(client: httpx.Client):
       """Test that endpoint requires API key authentication."""
       # ...
   ```

## Performance Considerations

- Tests use 30-second timeout per request
- Health checks should respond within 5 seconds
- Consider marking slow tests with `@pytest.mark.slow`
- Use `httpx.Client` (synchronous) for simplicity

## Security Notes

- **Never commit API keys** to version control
- Use environment variables for all secrets
- Test data uses fake/randomized values only
- Bank details are never exposed in test responses
- All test accounts use `@example.com` emails
