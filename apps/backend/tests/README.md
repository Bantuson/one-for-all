# Tests Directory

This directory contains all automated tests for the One For All backend.

## Test Structure

```
tests/
├── unit/              # Fast, isolated unit tests
├── integration/       # Multi-component integration tests
├── api/              # API endpoint tests
├── e2e/              # End-to-end user flow tests
└── performance/      # Load and performance tests
```

## Running Tests Locally

### Setup
```bash
cd apps/backend
source .venv/bin/activate
pip install -e ".[dev]"
```

### Run All Tests
```bash
pytest
```

### Run Specific Test Type
```bash
# Unit tests only
pytest tests/unit/ -m unit

# Integration tests only
pytest tests/integration/ -m integration

# API tests only
pytest tests/api/ -m api
```

### Run with Coverage
```bash
pytest tests/unit/ --cov=src/one_for_all --cov-report=html
```

## CI/CD Integration

Tests are automatically run in GitHub Actions. See `.github/workflows/backend-ci.yml` for configuration.

See full documentation in CI_CD_SETUP.md
