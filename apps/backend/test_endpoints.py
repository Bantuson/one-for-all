"""
Test script for Phase 2 API endpoints.

Tests the new submission and status endpoints that CrewAI tools expect.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from fastapi.testclient import TestClient
from one_for_all.api.app import app

# Create test client
client = TestClient(app)


def test_routes_exist():
    """Test that the legacy routes are registered."""
    routes = [route.path for route in app.routes if hasattr(route, "path")]

    assert "/api/applications/submit" in routes, "POST /api/applications/submit not found"
    assert "/api/applications/status/{application_id}" in routes, "GET /api/applications/status/{application_id} not found"
    assert "/api/nsfas/submit" in routes, "POST /api/nsfas/submit not found"
    assert "/api/nsfas/status/{nsfas_id}" in routes, "GET /api/nsfas/status/{nsfas_id} not found"

    print("✓ All required routes are registered")


def test_application_submit_requires_auth():
    """Test that application submission requires API key."""
    response = client.post(
        "/api/applications/submit",
        json={
            "applicant_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_token": "test-session-token",
            "university_name": "Test University",
            "personal_info": {"name": "Test User"},
            "academic_info": {"matric": "2023"},
        }
    )

    assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
    print("✓ Application submit endpoint requires authentication")


def test_nsfas_submit_requires_auth():
    """Test that NSFAS submission requires API key."""
    response = client.post(
        "/api/nsfas/submit",
        json={
            "applicant_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_token": "test-session-token",
            "personal_info": {"name": "Test User"},
            "academic_info": {"matric": "2023"},
            "guardian_info": {"name": "Guardian"},
            "household_info": {"size": 4},
            "income_info": {"total": "0-50000"},
            "bank_details": {
                "bank_name": "Test Bank",
                "account_number": "123456789",
                "account_type": "savings"
            },
        }
    )

    assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
    print("✓ NSFAS submit endpoint requires authentication")


def test_application_status_requires_auth():
    """Test that application status check requires API key."""
    response = client.get("/api/applications/status/123e4567-e89b-12d3-a456-426614174000")

    assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
    print("✓ Application status endpoint requires authentication")


def test_nsfas_status_requires_auth():
    """Test that NSFAS status check requires API key."""
    response = client.get("/api/nsfas/status/123e4567-e89b-12d3-a456-426614174000")

    assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
    print("✓ NSFAS status endpoint requires authentication")


def test_openapi_docs():
    """Test that OpenAPI docs include the new endpoints."""
    response = client.get("/openapi.json")
    assert response.status_code == 200

    openapi = response.json()
    paths = openapi.get("paths", {})

    assert "/api/applications/submit" in paths, "Application submit not in OpenAPI docs"
    assert "/api/applications/status/{application_id}" in paths, "Application status not in OpenAPI docs"
    assert "/api/nsfas/submit" in paths, "NSFAS submit not in OpenAPI docs"
    assert "/api/nsfas/status/{nsfas_id}" in paths, "NSFAS status not in OpenAPI docs"

    print("✓ All endpoints documented in OpenAPI spec")


if __name__ == "__main__":
    print("\nTesting Phase 2 API Endpoints...")
    print("=" * 60)

    try:
        test_routes_exist()
        test_application_submit_requires_auth()
        test_nsfas_submit_requires_auth()
        test_application_status_requires_auth()
        test_nsfas_status_requires_auth()
        test_openapi_docs()

        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("\nEndpoints implemented:")
        print("  - POST   /api/applications/submit")
        print("  - GET    /api/applications/status/{application_id}")
        print("  - POST   /api/nsfas/submit")
        print("  - GET    /api/nsfas/status/{nsfas_id}")
        print("\nThese endpoints are now available for CrewAI tools.")

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
