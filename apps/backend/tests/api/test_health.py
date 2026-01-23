"""
Health Endpoint Tests

Tests for /health and /health/db endpoints to verify:
1. Basic health check returns healthy status
2. Database health check verifies Supabase connection
3. Health endpoints do not require authentication
4. Response time is acceptable (< 500ms)

These tests use FastAPI TestClient for synchronous testing.
"""

import time
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from one_for_all.api.app import create_app


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(scope="module")
def api_client() -> Generator[TestClient, None, None]:
    """
    Create FastAPI test client for the module.

    Uses TestClient which handles ASGI lifecycle and provides
    synchronous test interface.
    """
    app = create_app()
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_supabase_client():
    """
    Create a mock Supabase client for testing database health checks.

    Returns a mock that simulates successful database queries.
    """
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"id": "test-id"}]
    )
    return mock_client


@pytest.fixture
def mock_supabase_client_error():
    """
    Create a mock Supabase client that raises an error.

    Returns a mock that simulates database connection failure.
    """
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception(
        "Database connection failed"
    )
    return mock_client


# =============================================================================
# Health Check Tests
# =============================================================================


@pytest.mark.api
def test_basic_health_check(api_client: TestClient):
    """
    Test GET /health returns healthy status.

    Verifies:
    - Response status code is 200
    - Response contains 'status': 'healthy'
    - Response contains 'service': 'one-for-all-api'
    """
    response = api_client.get("/health")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert data["status"] == "healthy", f"Expected 'healthy', got {data.get('status')}"
    assert data["service"] == "one-for-all-api", f"Expected 'one-for-all-api', got {data.get('service')}"


@pytest.mark.api
def test_database_health_check(api_client: TestClient, mock_supabase_client):
    """
    Test GET /health/db checks Supabase connection.

    Verifies:
    - Response status code is 200
    - Response contains database status
    - Response contains 'service': 'one-for-all-api'

    Note: This test mocks the Supabase client via FastAPI dependency override
    to avoid requiring actual database connection during unit tests.
    """
    from one_for_all.api.app import create_app
    from one_for_all.api.dependencies import get_supabase_client

    app = create_app()
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase_client

    with TestClient(app) as client:
        response = client.get("/health/db")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert "status" in data, "Response should contain 'status' field"
    assert "database" in data, "Response should contain 'database' field"
    assert data["service"] == "one-for-all-api", f"Expected 'one-for-all-api', got {data.get('service')}"

    # When database is connected, status should be healthy
    assert data["status"] == "healthy", f"Expected 'healthy' with mock, got {data['status']}"
    assert data["database"] == "connected", f"Expected 'connected' with mock, got {data['database']}"


@pytest.mark.api
def test_database_health_check_handles_connection_error(
    api_client: TestClient,
    mock_supabase_client_error
):
    """
    Test GET /health/db handles database connection errors gracefully.

    Verifies:
    - Response status code is still 200 (health check returns degraded, not error)
    - Response contains 'status': 'degraded' when database is unavailable
    - Response contains error information
    """
    from one_for_all.api.app import create_app
    from one_for_all.api.dependencies import get_supabase_client

    app = create_app()
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase_client_error

    with TestClient(app) as client:
        response = client.get("/health/db")

    # Health check should return 200 even when degraded
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert data["status"] == "degraded", f"Expected 'degraded', got {data.get('status')}"
    assert data["database"] == "error", f"Expected 'error', got {data.get('database')}"
    assert "error" in data, "Response should contain error details"


@pytest.mark.api
def test_health_endpoints_no_auth_required(api_client: TestClient):
    """
    Verify health endpoints do not require API key authentication.

    Health endpoints should be accessible without authentication for:
    - Load balancer health probes
    - Kubernetes liveness/readiness probes
    - External monitoring services
    """
    # Test basic health without any headers
    response_health = api_client.get("/health", headers={})
    assert response_health.status_code == 200, "Basic health check should not require auth"

    # Test database health without any headers
    response_db = api_client.get("/health/db", headers={})
    assert response_db.status_code == 200, "Database health check should not require auth"

    # Verify that providing invalid API key still allows access
    response_invalid_key = api_client.get(
        "/health",
        headers={"X-API-Key": "invalid-key-12345"}
    )
    assert response_invalid_key.status_code == 200, "Health check should ignore invalid API key"


@pytest.mark.api
def test_health_response_time(api_client: TestClient):
    """
    Test that health endpoint responds within acceptable time (< 500ms).

    Fast response time is critical for:
    - Load balancer health checks (typically timeout at 2-5 seconds)
    - Kubernetes probes (default timeout is 1 second)
    - Monitoring systems expecting quick responses

    Note: This test measures the basic /health endpoint which should
    not perform any external calls. The /health/db endpoint may be
    slower due to database round-trip time.
    """
    # Warm up request (first request may be slower due to app initialization)
    api_client.get("/health")

    # Measure response time for subsequent requests
    start_time = time.time()
    response = api_client.get("/health")
    end_time = time.time()

    response_time_ms = (end_time - start_time) * 1000

    assert response.status_code == 200, f"Health check failed: {response.status_code}"
    assert response_time_ms < 500, (
        f"Health check too slow: {response_time_ms:.2f}ms (expected < 500ms). "
        f"This may indicate a performance issue."
    )

    # Log response time for diagnostics (visible in verbose pytest output)
    print(f"Health check response time: {response_time_ms:.2f}ms")


@pytest.mark.api
def test_health_response_structure(api_client: TestClient):
    """
    Test that health endpoint returns expected JSON structure.

    Verifies the response conforms to expected schema for
    monitoring systems that parse health check responses.
    """
    response = api_client.get("/health")

    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/json"

    data = response.json()

    # Required fields
    assert "status" in data, "Missing 'status' field"
    assert "service" in data, "Missing 'service' field"

    # Type validation
    assert isinstance(data["status"], str), "Status should be a string"
    assert isinstance(data["service"], str), "Service should be a string"


@pytest.mark.api
def test_database_health_response_structure(api_client: TestClient):
    """
    Test that database health endpoint returns expected JSON structure.

    Verifies the response includes database-specific information
    for comprehensive health monitoring.
    """
    response = api_client.get("/health/db")

    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/json"

    data = response.json()

    # Required fields
    assert "status" in data, "Missing 'status' field"
    assert "database" in data, "Missing 'database' field"
    assert "service" in data, "Missing 'service' field"

    # Status should be either healthy or degraded
    assert data["status"] in ["healthy", "degraded"], (
        f"Invalid status value: {data['status']}"
    )

    # Database should be either connected or error
    assert data["database"] in ["connected", "error"], (
        f"Invalid database value: {data['database']}"
    )
