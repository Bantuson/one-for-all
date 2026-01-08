# API Test Suite

Comprehensive test suite for the One For All FastAPI backend endpoints.

## Overview

This test suite provides comprehensive coverage for all API endpoints including:

- **Health endpoints** - System health and database connectivity checks
- **Application endpoints** - University application submission and status tracking
- **NSFAS endpoints** - NSFAS funding application submission and status
- **Authentication** - API key verification for all protected endpoints
- **Validation** - Request payload validation and error handling
- **OpenAPI schema** - API documentation and schema validation

## Test Structure

```
tests/api/
├── __init__.py           # Package initialization
├── test_endpoints.py     # Main test suite (889 lines)
└── README.md            # This file
```

## Test Organization

### 1. Health Endpoint Tests
- `test_health_endpoint_returns_200` - Basic health check
- `test_database_health_endpoint` - Database connectivity check
- `test_openapi_docs_accessible` - API documentation accessibility

### 2. Application Endpoint Tests - Authentication
- `test_application_submit_requires_authentication` - Missing API key
- `test_application_submit_invalid_api_key` - Invalid API key rejection
- `test_application_status_requires_authentication` - Status check auth
- `test_application_v1_create_requires_authentication` - V1 endpoint auth

### 3. Application Endpoint Tests - Validation
- `test_application_submit_invalid_payload` - Schema validation
- `test_application_submit_missing_required_fields` - Required field check
- `test_application_submit_sanitizes_dangerous_keys` - Security sanitization

### 4. Application Endpoint Tests - Success Paths
- `test_application_submit_valid_payload_creates_application` - Create application
- `test_application_v1_list_returns_array` - List applications
- `test_application_v1_list_filters_by_applicant` - Filter by applicant ID

### 5. Application Endpoint Tests - Error Paths
- `test_application_status_invalid_id_returns_404` - Invalid ID handling
- `test_application_submit_expired_session_returns_401` - Session expiry
- `test_application_v1_get_nonexistent_returns_404` - Nonexistent record

### 6. NSFAS Endpoint Tests - Authentication
- `test_nsfas_submit_requires_authentication` - Missing API key
- `test_nsfas_submit_invalid_api_key` - Invalid API key rejection
- `test_nsfas_status_requires_authentication` - Status check auth

### 7. NSFAS Endpoint Tests - Validation
- `test_nsfas_submit_invalid_payload` - Schema validation
- `test_nsfas_submit_missing_bank_details` - Required bank info
- `test_nsfas_submit_sanitizes_dangerous_keys` - Security sanitization

### 8. NSFAS Endpoint Tests - Success Paths
- `test_nsfas_submit_valid_payload_creates_application` - Create NSFAS application
- `test_nsfas_response_excludes_bank_details` - Security: bank details exclusion

### 9. NSFAS Endpoint Tests - Error Paths
- `test_nsfas_status_invalid_id_returns_404` - Invalid ID handling
- `test_nsfas_submit_expired_session_returns_401` - Session expiry

### 10. OpenAPI Schema Tests
- `test_openapi_schema_includes_all_endpoints` - Complete endpoint documentation
- `test_openapi_schema_has_valid_structure` - Schema structure validation
- `test_openapi_schema_documents_authentication` - Auth documentation
- `test_openapi_schema_documents_request_schemas` - Request/response schemas
- `test_openapi_schema_has_tags` - Endpoint organization

### 11. Integration Tests
- `test_full_application_workflow` - Complete application lifecycle
- `test_full_nsfas_workflow` - Complete NSFAS lifecycle

## Running the Tests

### Prerequisites

1. **Install dependencies**:
   ```bash
   cd apps/backend
   source .venv/bin/activate
   pip install -e .
   pip install pytest pytest-asyncio
   ```

2. **Set environment variables** in root `.env.local`:
   ```bash
   BACKEND_API_KEY=your-test-api-key
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```

### Run All API Tests

```bash
cd apps/backend
source .venv/bin/activate
pytest tests/api/ -v
```

### Run Specific Test Categories

```bash
# Health endpoints only
pytest tests/api/ -v -k "health"

# Authentication tests only
pytest tests/api/ -v -k "authentication"

# Application endpoints only
pytest tests/api/ -v -k "application"

# NSFAS endpoints only
pytest tests/api/ -v -k "nsfas"

# OpenAPI schema tests only
pytest tests/api/ -v -k "openapi"

# Validation tests only
pytest tests/api/ -v -k "validation"
```

### Run with Test Markers

```bash
# All API tests
pytest tests/api/ -m api -v

# Integration tests (require database)
pytest tests/api/ -m integration -v

# Skip integration tests
pytest tests/api/ -m "api and not integration" -v
```

### Run with Coverage

```bash
pytest tests/api/ --cov=one_for_all.api --cov-report=html --cov-report=term
```

## Test Modes

### Unit Test Mode (No Database)

By default, tests run without requiring a database connection. Session validation is mocked to allow testing endpoint logic without external dependencies.

```bash
export ONEFORALL_TEST_MODE=true
pytest tests/api/ -m "api and not integration" -v
```

### Integration Test Mode (With Database)

Integration tests require a live Supabase database connection:

```bash
unset ONEFORALL_TEST_MODE
pytest tests/api/ -m integration -v
```

Integration tests are automatically skipped when `ONEFORALL_TEST_MODE=true`.

## Test Fixtures

### Module-Level Fixtures
- `api_client` - FastAPI TestClient for making requests
- `api_key` - API key from environment
- `auth_headers` - Pre-configured authentication headers

### Function-Level Fixtures
- `test_applicant_id` - Unique UUID for test applicant
- `test_session_token` - Unique session token for tests
- `mock_session_data` - Mocked session validation (no database required)
- `sample_application_payload` - Valid application submission payload
- `sample_nsfas_payload` - Valid NSFAS submission payload

## Expected Test Results

### Without Database (Unit Tests)

Most tests will pass or return predictable status codes:
- Authentication tests: PASS (401/422 expected)
- Validation tests: PASS (422 expected)
- OpenAPI tests: PASS (documentation generation works)
- Success path tests: SKIP or 401/500 (no database)

### With Database (Integration Tests)

All tests should pass with actual database:
- Create operations: 201 Created
- Read operations: 200 OK or 404 Not Found
- List operations: 200 OK with arrays
- Status updates: 200 OK with updated data

## Continuous Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd apps/backend
          pip install -e .
          pip install pytest pytest-asyncio pytest-cov

      - name: Run unit tests
        env:
          ONEFORALL_TEST_MODE: true
          BACKEND_API_KEY: ${{ secrets.BACKEND_API_KEY }}
        run: |
          cd apps/backend
          pytest tests/api/ -m "api and not integration" -v

      - name: Run integration tests
        if: github.ref == 'refs/heads/main'
        env:
          BACKEND_API_KEY: ${{ secrets.BACKEND_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          cd apps/backend
          pytest tests/api/ -m integration -v
```

## Test Coverage

Current test coverage includes:

- ✅ All health endpoints
- ✅ All application endpoints (legacy + v1)
- ✅ All NSFAS endpoints (legacy + v1)
- ✅ API key authentication
- ✅ Request validation
- ✅ Error handling
- ✅ OpenAPI schema documentation
- ✅ Security (XSS prevention, data sanitization)
- ✅ Session validation
- ✅ Complete workflows (with database)

## Known Limitations

1. **Database Dependency**: Full integration tests require Supabase connection
2. **Session Validation**: Mocked in unit tests to avoid database dependency
3. **External Services**: No testing of actual email/SMS OTP delivery
4. **Rate Limiting**: Not yet implemented or tested

## Future Enhancements

- [ ] Add performance/load tests
- [ ] Add contract tests for external integrations
- [ ] Add mutation testing for schema validation
- [ ] Add concurrent request tests
- [ ] Add rate limiting tests when implemented
- [ ] Add WebSocket tests (if realtime features added)

## Troubleshooting

### ModuleNotFoundError

```bash
# Ensure you're in the venv and dependencies are installed
cd apps/backend
source .venv/bin/activate
pip install -e .
```

### 401 Unauthorized on All Tests

```bash
# Check BACKEND_API_KEY is set
echo $BACKEND_API_KEY

# Or set in .env.local
export BACKEND_API_KEY=your-test-key
```

### Import Errors

```bash
# Ensure src path is correct
cd apps/backend
python3 -c "from one_for_all.api.app import create_app; print('OK')"
```

### Database Connection Errors

```bash
# Skip integration tests if no database
pytest tests/api/ -m "api and not integration" -v
```

## Contributing

When adding new endpoints:

1. Add corresponding tests in `test_endpoints.py`
2. Include auth, validation, success, and error test cases
3. Update OpenAPI schema tests if adding new routes
4. Add integration tests for full workflows
5. Update this README with new test descriptions

## References

- FastAPI TestClient: https://fastapi.tiangolo.com/tutorial/testing/
- Pytest Fixtures: https://docs.pytest.org/en/stable/fixture.html
- OpenAPI Schema: https://spec.openapis.org/oas/v3.1.0
