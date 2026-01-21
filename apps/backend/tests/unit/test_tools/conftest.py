"""
Conftest for unit tests in test_tools directory.

This conftest provides lightweight fixtures for unit tests that don't
require the full CrewAI crew to be loaded. This helps avoid import
issues when running isolated unit tests with coverage.
"""

import pytest
import os
import sys
from pathlib import Path
from datetime import datetime

# Add src to path for imports
src_path = Path(__file__).resolve().parent.parent.parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))


@pytest.fixture(scope="session", autouse=True)
def set_test_mode():
    """
    Enable test mode for unit test session.

    Sets ONEFORALL_TEST_MODE environment variable to prevent
    actual API calls and database modifications during testing.
    """
    os.environ["ONEFORALL_TEST_MODE"] = "true"
    yield
    os.environ.pop("ONEFORALL_TEST_MODE", None)


@pytest.fixture
def test_user_data():
    """Sample user data for testing with TEST- prefix."""
    return {
        "id": "TEST-USER-001",
        "username": "test_user",
        "email": "test@example.com",
        "phone": "+27821234567",
        "full_name": "Test User",
        "id_number": "0001010000000",
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_session_data():
    """Sample session data for testing."""
    from datetime import timedelta
    return {
        "id": "TEST-SESSION-001",
        "user_id": "TEST-USER-001",
        "session_token": "TEST-TOKEN-ABC123",
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def test_application_data():
    """Sample application data for testing."""
    return {
        "id": "TEST-APP-001",
        "user_id": "TEST-USER-001",
        "confirmation_number": "TEST-CONF-123",
        "institution": "University of Pretoria",
        "programme": "BSc Computer Science",
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat()
    }
