# API Test Suite - Quick Start

## Installation

```bash
cd apps/backend
source .venv/bin/activate
pip install -e .
pip install pytest pytest-asyncio pytest-cov
```

## Run Tests

### All API Tests
```bash
pytest tests/api/ -v
```

### Quick Smoke Test (Health Endpoints)
```bash
pytest tests/api/ -v -k "health"
```

### Unit Tests Only (No Database Required)
```bash
export ONEFORALL_TEST_MODE=true
pytest tests/api/ -m "api and not integration" -v
```

### With Coverage Report
```bash
pytest tests/api/ --cov=one_for_all.api --cov-report=term
```

## Test Categories

| Category | Command | Count |
|----------|---------|-------|
| Health | `pytest tests/api/ -k "health"` | 3 tests |
| Authentication | `pytest tests/api/ -k "authentication"` | 7 tests |
| Validation | `pytest tests/api/ -k "invalid OR missing OR sanitize"` | 6 tests |
| Applications | `pytest tests/api/ -k "application"` | 12 tests |
| NSFAS | `pytest tests/api/ -k "nsfas"` | 8 tests |
| OpenAPI | `pytest tests/api/ -k "openapi"` | 5 tests |
| Integration | `pytest tests/api/ -m integration` | 2 tests |

**Total: 35 test functions**

## Environment Setup

Create or update `/home/mzansi_agentive/projects/portfolio/.env.local`:

```bash
# Required for tests
BACKEND_API_KEY=your-test-api-key-12345

# Required for integration tests
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Expected Output

### Without Database
```
tests/api/test_endpoints.py::test_health_endpoint_returns_200 PASSED
tests/api/test_endpoints.py::test_application_submit_requires_authentication PASSED
tests/api/test_endpoints.py::test_nsfas_submit_invalid_api_key PASSED
...

========== 33 passed, 2 skipped in 2.45s ==========
```

### With Database
```
tests/api/test_endpoints.py::test_full_application_workflow PASSED
tests/api/test_endpoints.py::test_full_nsfas_workflow PASSED
...

========== 35 passed in 5.12s ==========
```

## Common Issues

### 401 Errors on All Tests
```bash
# Set API key
export BACKEND_API_KEY=your-test-key
```

### Import Errors
```bash
# Reinstall package
pip install -e .
```

### Skip Integration Tests
```bash
# Unit tests only
pytest tests/api/ -m "not integration" -v
```

## Test File Structure

```
tests/api/
├── __init__.py              # Package init
├── test_endpoints.py        # Main test suite (889 lines, 35 tests)
├── README.md               # Full documentation
└── QUICK_START.md          # This file
```

## Test Markers

- `@pytest.mark.api` - All API tests (33 tests)
- `@pytest.mark.integration` - Requires database (2 tests)

## Next Steps

1. Run smoke test: `pytest tests/api/ -k "health" -v`
2. Run all unit tests: `pytest tests/api/ -m "not integration" -v`
3. Set up database for integration tests
4. Run full suite: `pytest tests/api/ -v`
5. Generate coverage: `pytest tests/api/ --cov=one_for_all.api --cov-report=html`

## Documentation

See `README.md` for comprehensive documentation including:
- Detailed test descriptions
- Fixture documentation
- CI/CD integration examples
- Troubleshooting guide
