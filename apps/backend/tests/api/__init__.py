"""
API integration tests for One For All backend.

This module contains API endpoint tests covering:
- Health check endpoints (basic and database)
- Session management (create, validate, extend, delete, rotate)
- Agent execution endpoints (reviewer assistant, analytics)
- Authentication and authorization
- Security measures (input sanitization, IDOR prevention)

Test Categories:
- @pytest.mark.api: All API tests
- @pytest.mark.integration: Tests requiring database
- @pytest.mark.security: Security-focused tests
"""

import pytest

# Mark all tests in this module as api tests
pytestmark = pytest.mark.api
