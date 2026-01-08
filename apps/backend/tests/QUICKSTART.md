# Test Suite Quick Start

## Installation

```bash
cd /home/mzansi_agentive/projects/portfolio/apps/backend
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run Tests

```bash
# All tests
pytest

# Integration tests only
pytest tests/integration/

# Unit tests only
pytest tests/unit/

# Specific file
pytest tests/integration/test_undergraduate_flow.py

# With coverage
pytest --cov=one_for_all --cov-report=html
```

## Test Categories

### Integration Tests (tests/integration/)

- **test_undergraduate_flow.py** - Complete undergraduate workflows
- **test_postgraduate_flow.py** - Honours and Masters workflows
- **test_nsfas_flow.py** - NSFAS eligibility and submission
- **test_document_upload.py** - Document handling

### Unit Tests (tests/unit/)

- **test_otp_verification.py** - OTP generation and verification
- **test_profile_parser.py** - Markdown profile parsing

## Key Features

✅ **2,726 lines of comprehensive test coverage**
✅ **Shared fixtures** for all test profiles
✅ **Automatic cleanup** after each test
✅ **Test mode** prevents actual API calls
✅ **Mocked dependencies** for external services

## Common Commands

```bash
# Run with verbose output
pytest -v

# Run specific test
pytest tests/integration/test_undergraduate_flow.py::TestUndergraduateApplicationFlow::test_complete_flow_eligible_student

# Show print statements
pytest -s

# Run marked tests
pytest -m integration
pytest -m unit
```

## Test Profiles Available

1. `undergraduate_profile` - High achiever (APS 40)
2. `undergraduate_profile_low_aps` - Low APS (28)
3. `postgraduate_profile_honours` - Honours candidate
4. `postgraduate_profile_masters` - Masters candidate
5. `mature_student_profile` - Career change

All profiles in `conftest.py` are ready to use in any test!
