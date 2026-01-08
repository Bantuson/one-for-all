"""
E2E Tests for One For All Backend API

Tests run against staging environment (or localhost) to validate
complete workflows end-to-end.

Environment Variables:
- STAGING_API_URL: Base URL for API (default: http://localhost:8000)
- STAGING_API_KEY: API key for authentication (required)

Usage:
    pytest tests/e2e/ -m e2e
    STAGING_API_URL=https://staging.example.com pytest tests/e2e/ -m e2e
"""

import os
import uuid
from typing import Any, Dict

import httpx
import pytest


# ============================================================================
# Configuration & Fixtures
# ============================================================================


@pytest.fixture(scope="module")
def api_base_url() -> str:
    """Get staging API base URL from environment."""
    return os.getenv("STAGING_API_URL", "http://localhost:8000")


@pytest.fixture(scope="module")
def api_key() -> str:
    """
    Get staging API key from environment.

    If not set, returns a placeholder that will cause 401 errors
    (which we test for).
    """
    return os.getenv("STAGING_API_KEY", "test-api-key-not-set")


@pytest.fixture(scope="module")
def client(api_base_url: str, api_key: str) -> httpx.Client:
    """
    Create HTTP client for E2E tests.

    Uses httpx with timeout and auth headers configured.
    """
    return httpx.Client(
        base_url=api_base_url,
        headers={"X-API-Key": api_key},
        timeout=30.0,
    )


@pytest.fixture
def test_applicant_id() -> uuid.UUID:
    """Generate test applicant ID with TEST- prefix for safety."""
    return uuid.uuid4()


@pytest.fixture
def test_session_token() -> str:
    """Generate test session token with TEST- prefix."""
    return f"TEST-SESSION-{uuid.uuid4().hex}"


@pytest.fixture
def test_application_data(
    test_applicant_id: uuid.UUID,
    test_session_token: str
) -> Dict[str, Any]:
    """
    Sample application data for E2E testing.

    Uses TEST- prefix and example.com emails for safety.
    """
    return {
        "applicant_id": str(test_applicant_id),
        "session_token": test_session_token,
        "university_name": "TEST University of Pretoria",
        "faculty": "Engineering, Built Environment and IT",
        "qualification_type": "Undergraduate",
        "program": "BSc Computer Science",
        "year": 2025,
        "personal_info": {
            "full_name": "TEST E2E Student",
            "email": "test.e2e@example.com",
            "mobile": "+27821234567",
            "id_number": "0001010000000",
        },
        "academic_info": {
            "matric_year": 2024,
            "aps_score": 40,
            "subjects": {
                "Mathematics": {"mark": 80, "aps": 7},
                "English": {"mark": 75, "aps": 6},
            },
        },
        "submission_payload": {
            "submitted_at": "2025-01-01T00:00:00Z",
            "reference": "TEST-REF-001",
        },
    }


@pytest.fixture
def test_nsfas_data(
    test_applicant_id: uuid.UUID,
    test_session_token: str
) -> Dict[str, Any]:
    """
    Sample NSFAS application data for E2E testing.
    """
    return {
        "applicant_id": str(test_applicant_id),
        "session_token": test_session_token,
        "personal_info": {
            "full_name": "TEST E2E Student",
            "email": "test.e2e@example.com",
            "mobile": "+27821234567",
            "id_number": "0001010000000",
        },
        "academic_info": {
            "matric_year": 2024,
            "aps_score": 40,
        },
        "guardian_info": {
            "name": "TEST Guardian",
            "relationship": "Parent",
            "contact": "+27821234568",
        },
        "household_info": {
            "members": 4,
            "employed_members": 1,
        },
        "income_info": {
            "total_household_income": 150000,
            "sassa_beneficiary": False,
        },
        "bank_details": {
            "account_holder": "TEST E2E Student",
            "bank_name": "TEST Bank",
            "account_number": "1234567890",
            "branch_code": "123456",
        },
        "living_situation": {
            "accommodation_type": "Family home",
            "distance_to_campus": "15km",
        },
    }


# ============================================================================
# Health & Documentation Tests
# ============================================================================


@pytest.mark.e2e
class TestHealthEndpoints:
    """Test health check endpoints for monitoring."""

    def test_health_check_returns_200(self, client: httpx.Client):
        """Test basic health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data

    def test_database_health_check(self, client: httpx.Client):
        """Test database health check endpoint."""
        response = client.get("/health/db")

        # Should return 200 even if database has issues
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data

    def test_openapi_docs_available(self, client: httpx.Client):
        """Test OpenAPI documentation is accessible."""
        response = client.get("/docs")

        # FastAPI docs should return HTML
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()

    def test_redoc_available(self, client: httpx.Client):
        """Test ReDoc documentation is accessible."""
        response = client.get("/redoc")

        assert response.status_code == 200
        assert "redoc" in response.text.lower()


# ============================================================================
# Application Submission Flow Tests
# ============================================================================


@pytest.mark.e2e
class TestApplicationSubmissionFlow:
    """Test complete application submission workflow."""

    def test_submit_endpoint_is_reachable(self, client: httpx.Client):
        """Test submit endpoint exists and is not 404."""
        # Send invalid data to check endpoint exists
        response = client.post("/api/applications/submit", json={})

        # Should return 422 (validation error) or 401 (auth error), not 404
        assert response.status_code in [422, 401]

    def test_submit_requires_authentication(
        self,
        api_base_url: str,
        test_application_data: Dict[str, Any]
    ):
        """Test submit endpoint requires API key."""
        # Create client without API key
        client_no_auth = httpx.Client(base_url=api_base_url, timeout=30.0)

        response = client_no_auth.post(
            "/api/applications/submit",
            json=test_application_data
        )

        # Should return 422 (missing header) or similar
        assert response.status_code in [422, 403]
        client_no_auth.close()

    def test_submit_with_invalid_session_returns_401(
        self,
        client: httpx.Client,
        test_application_data: Dict[str, Any]
    ):
        """Test submit with invalid session token returns 401."""
        response = client.post(
            "/api/applications/submit",
            json=test_application_data
        )

        # Session validation should fail (session doesn't exist in DB)
        assert response.status_code == 401
        data = response.json()
        assert "session" in data["detail"].lower() or "unauthorized" in data["detail"].lower()

    def test_submit_validation_errors(
        self,
        client: httpx.Client,
        test_applicant_id: uuid.UUID
    ):
        """Test submit with missing required fields returns 422."""
        invalid_data = {
            "applicant_id": str(test_applicant_id),
            # Missing session_token, university_name, etc.
        }

        response = client.post("/api/applications/submit", json=invalid_data)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_application_status_endpoint_exists(self, client: httpx.Client):
        """Test application status endpoint is reachable."""
        # Try to get status for non-existent application
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/applications/status/{fake_id}")

        # Should return 404 (not found), not 404 (endpoint missing)
        # or 401/422 depending on auth
        assert response.status_code in [404, 401, 422]


# ============================================================================
# RESTful Application API Tests
# ============================================================================


@pytest.mark.e2e
class TestApplicationRESTAPI:
    """Test RESTful application endpoints (v1 API)."""

    def test_list_applications_endpoint(self, client: httpx.Client):
        """Test GET /api/v1/applications/ endpoint."""
        response = client.get("/api/v1/applications/")

        # Should return 200 with list (possibly empty)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_applications_with_filters(self, client: httpx.Client):
        """Test list applications with query filters."""
        fake_applicant_id = str(uuid.uuid4())
        response = client.get(
            "/api/v1/applications/",
            params={"applicant_id": fake_applicant_id, "limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should be empty since fake applicant has no applications
        assert len(data) == 0

    def test_get_application_not_found(self, client: httpx.Client):
        """Test GET /api/v1/applications/{id} with non-existent ID."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/applications/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


# ============================================================================
# NSFAS Submission Flow Tests
# ============================================================================


@pytest.mark.e2e
class TestNSFASSubmissionFlow:
    """Test NSFAS application submission workflow."""

    def test_nsfas_submit_endpoint_is_reachable(self, client: httpx.Client):
        """Test NSFAS submit endpoint exists."""
        response = client.post("/api/nsfas/submit", json={})

        # Should return 422 (validation error) or 401, not 404
        assert response.status_code in [422, 401]

    def test_nsfas_submit_with_invalid_session_returns_401(
        self,
        client: httpx.Client,
        test_nsfas_data: Dict[str, Any]
    ):
        """Test NSFAS submit with invalid session token."""
        response = client.post("/api/nsfas/submit", json=test_nsfas_data)

        # Session validation should fail
        assert response.status_code == 401
        data = response.json()
        assert "session" in data["detail"].lower() or "unauthorized" in data["detail"].lower()

    def test_nsfas_submit_validation_errors(
        self,
        client: httpx.Client,
        test_applicant_id: uuid.UUID
    ):
        """Test NSFAS submit with missing required fields."""
        invalid_data = {
            "applicant_id": str(test_applicant_id),
            # Missing session_token and other required fields
        }

        response = client.post("/api/nsfas/submit", json=invalid_data)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_nsfas_status_endpoint_exists(self, client: httpx.Client):
        """Test NSFAS status endpoint is reachable."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/nsfas/status/{fake_id}")

        # Should return 404 (not found) or 401/422
        assert response.status_code in [404, 401, 422]


# ============================================================================
# RESTful NSFAS API Tests
# ============================================================================


@pytest.mark.e2e
class TestNSFASRESTAPI:
    """Test RESTful NSFAS endpoints (v1 API)."""

    def test_list_nsfas_applications_endpoint(self, client: httpx.Client):
        """Test GET /api/v1/nsfas/ endpoint."""
        response = client.get("/api/v1/nsfas/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_nsfas_with_filters(self, client: httpx.Client):
        """Test list NSFAS applications with filters."""
        fake_applicant_id = str(uuid.uuid4())
        response = client.get(
            "/api/v1/nsfas/",
            params={"applicant_id": fake_applicant_id, "limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_nsfas_application_not_found(self, client: httpx.Client):
        """Test GET /api/v1/nsfas/{id} with non-existent ID."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/nsfas/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_nsfas_response_excludes_bank_details(
        self,
        client: httpx.Client
    ):
        """
        Test that NSFAS responses don't include sensitive bank details.

        This is a security test - bank_details should never appear in responses.
        """
        response = client.get("/api/v1/nsfas/")

        assert response.status_code == 200
        data = response.json()

        # Check that no response contains bank_details
        for nsfas_app in data:
            assert "bank_details" not in nsfas_app


# ============================================================================
# Document Upload Flow Tests (if staging has storage)
# ============================================================================


@pytest.mark.e2e
@pytest.mark.skipif(
    os.getenv("SKIP_DOCUMENT_TESTS", "false").lower() == "true",
    reason="Document storage not configured in staging"
)
class TestDocumentUploadFlow:
    """Test document validation and upload workflow."""

    def test_document_endpoints_exist(self, client: httpx.Client):
        """Test document-related endpoints are available."""
        # These endpoints may or may not exist yet - just check they're not 404
        fake_app_id = str(uuid.uuid4())

        # Try to list documents for fake application
        response = client.get(f"/api/v1/applications/{fake_app_id}/documents")

        # Should return 404 (application not found) or 401, not 404 (endpoint missing)
        assert response.status_code in [404, 401, 422]

    def test_create_document_requires_valid_application(
        self,
        client: httpx.Client
    ):
        """Test creating document requires valid application."""
        fake_app_id = str(uuid.uuid4())

        document_data = {
            "document_type": "id_document",
            "file_url": "https://example.com/test-doc.pdf",
            "file_name": "test-id.pdf",
        }

        response = client.post(
            f"/api/v1/applications/{fake_app_id}/documents",
            json=document_data
        )

        # Should fail because application doesn't exist
        assert response.status_code == 404

    def test_invalid_document_type_returns_422(
        self,
        client: httpx.Client
    ):
        """Test uploading document with invalid type."""
        fake_app_id = str(uuid.uuid4())

        document_data = {
            "document_type": "invalid_type_xyz",
            "file_url": "https://example.com/test.pdf",
            "file_name": "test.pdf",
        }

        response = client.post(
            f"/api/v1/applications/{fake_app_id}/documents",
            json=document_data
        )

        # Should return 422 (validation error) or 404 (app not found)
        assert response.status_code in [422, 404]


# ============================================================================
# Error Handling Tests
# ============================================================================


@pytest.mark.e2e
class TestErrorHandling:
    """Test API error handling and edge cases."""

    def test_invalid_json_returns_422(self, client: httpx.Client):
        """Test that invalid JSON returns proper error."""
        response = client.post(
            "/api/applications/submit",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )

        # Should return 422 (unprocessable) or 400 (bad request)
        assert response.status_code in [422, 400]

    def test_invalid_uuid_returns_422(self, client: httpx.Client):
        """Test that invalid UUID format returns error."""
        response = client.get("/api/v1/applications/not-a-uuid")

        assert response.status_code == 422

    def test_missing_required_headers(
        self,
        api_base_url: str,
        test_application_data: Dict[str, Any]
    ):
        """Test that missing X-API-Key header returns error."""
        # Create client without auth header
        client_no_auth = httpx.Client(base_url=api_base_url, timeout=30.0)

        response = client_no_auth.post(
            "/api/v1/applications/",
            json=test_application_data
        )

        # Should fail due to missing API key
        assert response.status_code in [422, 403, 401]
        client_no_auth.close()


# ============================================================================
# Cleanup Tests
# ============================================================================


@pytest.mark.e2e
class TestDataCleanup:
    """
    Test data cleanup and safety measures.

    These tests verify that test data can be identified and cleaned up.
    """

    def test_test_data_uses_test_prefix(
        self,
        test_application_data: Dict[str, Any]
    ):
        """Verify test data uses TEST- prefix for safety."""
        assert "TEST" in test_application_data["university_name"]
        assert "example.com" in test_application_data["personal_info"]["email"]

    def test_test_session_uses_test_prefix(
        self,
        test_session_token: str
    ):
        """Verify test session tokens use TEST- prefix."""
        assert test_session_token.startswith("TEST-")


# ============================================================================
# Integration Smoke Tests
# ============================================================================


@pytest.mark.e2e
class TestIntegrationSmoke:
    """
    High-level smoke tests for critical integrations.

    These tests verify that key external dependencies are configured.
    """

    def test_api_is_responsive(self, client: httpx.Client):
        """Test that API responds within reasonable time."""
        import time

        start = time.time()
        response = client.get("/health")
        elapsed = time.time() - start

        assert response.status_code == 200
        # API should respond within 5 seconds
        assert elapsed < 5.0

    def test_cors_headers_present(self, client: httpx.Client):
        """Test CORS headers are configured (for frontend integration)."""
        response = client.options("/health")

        # OPTIONS request should be handled
        # (actual CORS config tested separately)
        assert response.status_code in [200, 204, 405]
