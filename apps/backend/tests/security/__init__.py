"""
Security & Adversarial Tests - Phase 4

This package contains security tests for the One For All admissions platform:
- Prompt injection defense tests
- Tool abuse prevention tests
- Session hijacking tests
- Cross-tenant isolation verification
"""
import pytest

# Apply security marker to all tests in this package
pytestmark = pytest.mark.security
