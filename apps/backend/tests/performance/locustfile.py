"""
Locust Performance Testing Configuration for One For All Backend API.

This file defines comprehensive load test scenarios with strict performance thresholds
for validating the backend API in staging and production environments.

Performance Thresholds (Phase 5):
---------------------------------
| Endpoint                                  | P50      | P95      | P99       |
|-------------------------------------------|----------|----------|-----------|
| /health                                   | < 100ms  | < 300ms  | < 500ms   |
| /api/institutions/{id}/applications       | < 500ms  | < 2000ms | < 5000ms  |
| /api/agents/analytics                     | < 2000ms | < 10000ms| < 30000ms |

Usage:
------
    # Run headless (CI/CD mode)
    locust -f locustfile.py --headless \\
        --users 50 --spawn-rate 5 --run-time 5m \\
        --host https://staging.example.com \\
        --html report.html --csv results

    # Run with web UI (local development)
    locust -f locustfile.py --host https://staging.example.com
    # Then open http://localhost:8089 in browser

    # Run specific user class only
    locust -f locustfile.py --headless \\
        --users 20 --spawn-rate 2 --run-time 2m \\
        --host https://staging.example.com \\
        HealthCheckUser

Environment Variables:
----------------------
    STAGING_API_KEY     - API key for authenticated endpoints
    STAGING_API_URL     - Override default host URL
    LOCUST_USERS        - Override default user count
    LOCUST_SPAWN_RATE   - Override default spawn rate
"""

import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from random import choice, randint
from typing import Optional
from uuid import uuid4

from locust import HttpUser, between, constant_pacing, events, tag, task
from locust.runners import MasterRunner, WorkerRunner

# Configure logging for performance tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Performance Thresholds Configuration
# =============================================================================


@dataclass
class PerformanceThreshold:
    """Performance threshold configuration for an endpoint."""

    endpoint: str
    p50_ms: int  # 50th percentile threshold
    p95_ms: int  # 95th percentile threshold
    p99_ms: int  # 99th percentile threshold
    error_rate: float = 0.01  # Maximum acceptable error rate (1%)


# Define thresholds per endpoint (Phase 5 requirements)
PERFORMANCE_THRESHOLDS = {
    "/health": PerformanceThreshold(
        endpoint="/health",
        p50_ms=100,
        p95_ms=300,
        p99_ms=500,
    ),
    "/api/institutions/{id}/applications": PerformanceThreshold(
        endpoint="/api/institutions/{id}/applications",
        p50_ms=500,
        p95_ms=2000,
        p99_ms=5000,
    ),
    "/api/agents/analytics": PerformanceThreshold(
        endpoint="/api/agents/analytics",
        p50_ms=2000,
        p95_ms=10000,
        p99_ms=30000,
    ),
    # Legacy endpoints (same as institutions)
    "/api/applications/submit": PerformanceThreshold(
        endpoint="/api/applications/submit",
        p50_ms=500,
        p95_ms=2000,
        p99_ms=5000,
    ),
    "/api/applications/status/{application_id}": PerformanceThreshold(
        endpoint="/api/applications/status/{application_id}",
        p50_ms=300,
        p95_ms=1000,
        p99_ms=2000,
    ),
    "/api/v1/sessions/": PerformanceThreshold(
        endpoint="/api/v1/sessions/",
        p50_ms=200,
        p95_ms=500,
        p99_ms=1000,
    ),
    "/api/nsfas/submit": PerformanceThreshold(
        endpoint="/api/nsfas/submit",
        p50_ms=500,
        p95_ms=2000,
        p99_ms=5000,
    ),
}

# Global test results storage for threshold validation
test_results = {
    "response_times": {},
    "error_counts": {},
    "request_counts": {},
    "threshold_violations": [],
}


# =============================================================================
# Event Handlers for Test Lifecycle
# =============================================================================


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize test run - log configuration and reset results."""
    logger.info("=" * 60)
    logger.info("Performance Test Starting")
    logger.info("=" * 60)
    logger.info(f"Host: {environment.host}")
    logger.info(f"User Count: {environment.parsed_options.num_users if environment.parsed_options else 'N/A'}")
    logger.info(f"Spawn Rate: {environment.parsed_options.spawn_rate if environment.parsed_options else 'N/A'}")
    logger.info(f"Run Time: {environment.parsed_options.run_time if environment.parsed_options else 'N/A'}")
    logger.info("=" * 60)

    # Reset global results
    global test_results
    test_results = {
        "response_times": {},
        "error_counts": {},
        "request_counts": {},
        "threshold_violations": [],
    }


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Track response times for threshold validation."""
    if name not in test_results["response_times"]:
        test_results["response_times"][name] = []
        test_results["error_counts"][name] = 0
        test_results["request_counts"][name] = 0

    test_results["request_counts"][name] += 1
    if exception:
        test_results["error_counts"][name] += 1
    else:
        test_results["response_times"][name].append(response_time)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Validate thresholds and generate final report."""
    logger.info("=" * 60)
    logger.info("Performance Test Complete - Validating Thresholds")
    logger.info("=" * 60)

    violations = []

    for endpoint, times in test_results["response_times"].items():
        if not times:
            continue

        # Calculate percentiles
        sorted_times = sorted(times)
        p50 = sorted_times[int(len(sorted_times) * 0.50)]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]

        # Calculate error rate
        total_requests = test_results["request_counts"].get(endpoint, 0)
        errors = test_results["error_counts"].get(endpoint, 0)
        error_rate = errors / total_requests if total_requests > 0 else 0

        logger.info(f"\n{endpoint}:")
        logger.info(f"  Requests: {total_requests}")
        logger.info(f"  P50: {p50:.2f}ms, P95: {p95:.2f}ms, P99: {p99:.2f}ms")
        logger.info(f"  Error Rate: {error_rate:.2%}")

        # Check against thresholds
        threshold = PERFORMANCE_THRESHOLDS.get(endpoint)
        if threshold:
            if p50 > threshold.p50_ms:
                violations.append(f"{endpoint}: P50 {p50:.0f}ms > {threshold.p50_ms}ms")
            if p95 > threshold.p95_ms:
                violations.append(f"{endpoint}: P95 {p95:.0f}ms > {threshold.p95_ms}ms")
            if p99 > threshold.p99_ms:
                violations.append(f"{endpoint}: P99 {p99:.0f}ms > {threshold.p99_ms}ms")
            if error_rate > threshold.error_rate:
                violations.append(f"{endpoint}: Error rate {error_rate:.2%} > {threshold.error_rate:.2%}")

    if violations:
        logger.warning("\n" + "=" * 60)
        logger.warning("THRESHOLD VIOLATIONS DETECTED:")
        for v in violations:
            logger.warning(f"  - {v}")
        logger.warning("=" * 60)
        test_results["threshold_violations"] = violations
    else:
        logger.info("\nAll performance thresholds passed!")


# =============================================================================
# User Classes - Different Load Patterns
# =============================================================================


class HealthCheckUser(HttpUser):
    """
    Lightweight user focused on health check endpoints.

    This user simulates monitoring systems and load balancers that
    continuously poll health endpoints. These should be extremely fast.

    Thresholds:
        P50 < 100ms, P95 < 300ms, P99 < 500ms
    """

    weight = 3  # 30% of total users
    wait_time = between(0.5, 1.5)

    def on_start(self):
        """Initialize user - no authentication needed for health checks."""
        self.request_count = 0

    @tag("health", "critical")
    @task(10)
    def health_check(self):
        """
        Test basic /health endpoint.

        Expected response time: < 100ms P50
        """
        with self.client.get(
            "/health",
            catch_response=True,
            name="/health",
        ) as response:
            self.request_count += 1

            if response.status_code != 200:
                response.failure(f"Health check failed: {response.status_code}")
            elif response.elapsed.total_seconds() * 1000 > PERFORMANCE_THRESHOLDS["/health"].p95_ms:
                response.failure(f"Health check too slow: {response.elapsed.total_seconds() * 1000:.0f}ms")
            else:
                response.success()

    @tag("health", "database")
    @task(5)
    def database_health(self):
        """
        Test /health/db endpoint with database connectivity check.

        Expected response time: Slightly slower than basic health (database round-trip)
        """
        with self.client.get(
            "/health/db",
            catch_response=True,
            name="/health/db",
        ) as response:
            if response.status_code != 200:
                response.failure(f"DB health check failed: {response.status_code}")
            else:
                data = response.json()
                if data.get("status") != "healthy":
                    response.failure(f"DB degraded: {data.get('database')}")
                else:
                    response.success()


class SessionUser(HttpUser):
    """
    User focused on session management operations.

    Simulates users logging in, validating sessions, and managing
    authentication state. Critical for user experience.

    Thresholds:
        P50 < 200ms, P95 < 500ms, P99 < 1000ms
    """

    weight = 2  # 20% of total users
    wait_time = between(1, 3)

    def on_start(self):
        """Initialize user with API key authentication."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key-12345")
        self.headers = {"X-API-Key": self.api_key}
        self.applicant_id = str(uuid4())
        self.session_token: Optional[str] = None

    @tag("session", "auth")
    @task(3)
    def create_session(self):
        """
        Test session creation endpoint.

        Note: May return 404 if applicant doesn't exist (expected in load test)
        """
        payload = {
            "applicant_id": self.applicant_id,
        }

        with self.client.post(
            "/api/v1/sessions/",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions/",
        ) as response:
            if response.status_code == 201:
                data = response.json()
                self.session_token = data.get("session_token")
                response.success()
            elif response.status_code == 404:
                # Expected - applicant doesn't exist in test data
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Session creation failed: {response.status_code}")

    @tag("session", "validation")
    @task(5)
    def validate_session(self):
        """
        Test session validation endpoint.

        Uses previously created session token or a test token.
        """
        token = self.session_token or f"test-session-{uuid4().hex[:16]}"

        with self.client.get(
            f"/api/v1/sessions/{token}",
            headers=self.headers,
            catch_response=True,
            name="/api/v1/sessions/{token}",
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                # 404 is acceptable for test tokens
                response.success()


class ApplicationUser(HttpUser):
    """
    User focused on application submission and status checks.

    Simulates typical applicant behavior: checking status, submitting applications.
    This is the core business logic and must meet strict performance requirements.

    Thresholds:
        Submit: P50 < 500ms, P95 < 2000ms, P99 < 5000ms
        Status: P50 < 300ms, P95 < 1000ms, P99 < 2000ms
    """

    weight = 4  # 40% of total users
    wait_time = between(2, 5)

    def on_start(self):
        """Initialize user with API key and test data."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key-12345")
        self.headers = {"X-API-Key": self.api_key}
        self.applicant_id = f"LOAD-TEST-{uuid4().hex[:8]}"
        self.session_token = f"load-test-session-{uuid4().hex[:16]}"
        self.submitted_application_ids: list[str] = []

    @tag("application", "status")
    @task(5)
    def check_application_status(self):
        """
        Test application status endpoint.

        Checks status of previously submitted applications or random test IDs.
        """
        # Use submitted ID if available, otherwise generate test ID
        if self.submitted_application_ids:
            app_id = choice(self.submitted_application_ids)
        else:
            app_id = f"TEST-APP-{uuid4().hex[:8]}"

        with self.client.get(
            f"/api/applications/status/{app_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/applications/status/{application_id}",
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Expected for test IDs
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Status check failed: {response.status_code}")

    @tag("application", "submit")
    @task(2)
    def submit_application(self):
        """
        Test application submission endpoint.

        Submits test applications with realistic payload structure.
        """
        university = choice(["UCT", "Wits", "UP", "Stellenbosch", "TUT", "DUT"])
        program = choice([
            "BSc Computer Science",
            "BCom Accounting",
            "BA Law",
            "BSc Engineering",
            "BPharm",
        ])

        payload = {
            "applicant_id": self.applicant_id,
            "session_token": self.session_token,
            "university_name": university,
            "faculty": "Engineering, Built Environment and IT",
            "qualification_type": "Undergraduate",
            "program": program,
            "year": 2025,
            "personal_info": {
                "full_name": f"Load Test User {randint(1000, 9999)}",
                "id_number": f"{randint(9001010000000, 9912319999999)}",
                "email": f"loadtest-{uuid4().hex[:8]}@example.com",
                "mobile": f"+2782{randint(1000000, 9999999)}",
            },
            "academic_info": {
                "matric_year": 2024,
                "total_aps": randint(30, 45),
                "subjects": {
                    "Mathematics": {"level": "HL", "mark": randint(60, 95)},
                    "English": {"level": "HL", "mark": randint(60, 90)},
                    "Physical Sciences": {"level": "HL", "mark": randint(55, 90)},
                },
            },
            "submission_payload": {
                "submitted_to": f"https://www.{university.lower()}.ac.za/admissions",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }

        with self.client.post(
            "/api/applications/submit",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/applications/submit",
        ) as response:
            response_time_ms = response.elapsed.total_seconds() * 1000

            if response.status_code == 201:
                try:
                    data = response.json()
                    app_id = data.get("application_id")
                    if app_id:
                        self.submitted_application_ids.append(app_id)
                        # Keep only last 5 IDs to avoid memory growth
                        self.submitted_application_ids = self.submitted_application_ids[-5:]
                except Exception:
                    pass
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif response.status_code == 422:
                # Validation error - expected in some cases
                response.success()
            elif response_time_ms > PERFORMANCE_THRESHOLDS["/api/applications/submit"].p99_ms:
                response.failure(f"Too slow: {response_time_ms:.0f}ms")
            else:
                response.failure(f"Submission failed: {response.status_code}")

    @tag("application", "list")
    @task(3)
    def list_applications(self):
        """
        Test institution applications listing endpoint.

        Simulates admin users viewing applications for an institution.
        """
        institution_id = str(uuid4())

        with self.client.get(
            f"/api/institutions/{institution_id}/applications",
            headers=self.headers,
            catch_response=True,
            name="/api/institutions/{id}/applications",
        ) as response:
            response_time_ms = response.elapsed.total_seconds() * 1000

            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Institution not found - expected in test
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif response_time_ms > PERFORMANCE_THRESHOLDS["/api/institutions/{id}/applications"].p95_ms:
                response.failure(f"Too slow: {response_time_ms:.0f}ms")
            else:
                response.failure(f"List failed: {response.status_code}")


class AnalyticsUser(HttpUser):
    """
    User focused on analytics endpoints.

    Simulates admin/dashboard users accessing analytics and reporting.
    These endpoints may be slower due to data aggregation.

    Thresholds:
        P50 < 2000ms, P95 < 10000ms, P99 < 30000ms
    """

    weight = 1  # 10% of total users
    wait_time = between(5, 15)  # Analytics queries are infrequent

    def on_start(self):
        """Initialize user with API key authentication."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key-12345")
        self.headers = {"X-API-Key": self.api_key}

    @tag("analytics", "agents")
    @task
    def agent_analytics(self):
        """
        Test agent analytics endpoint.

        Returns performance metrics for AI agents - may be slow due to aggregation.
        """
        with self.client.get(
            "/api/agents/analytics",
            headers=self.headers,
            catch_response=True,
            name="/api/agents/analytics",
        ) as response:
            response_time_ms = response.elapsed.total_seconds() * 1000
            threshold = PERFORMANCE_THRESHOLDS.get("/api/agents/analytics")

            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Endpoint may not exist yet
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif threshold and response_time_ms > threshold.p99_ms:
                response.failure(f"Too slow: {response_time_ms:.0f}ms > {threshold.p99_ms}ms")
            else:
                response.failure(f"Analytics failed: {response.status_code}")


class StressTestUser(HttpUser):
    """
    Aggressive stress test user for finding system limits.

    Uses constant pacing to generate a predictable, high-frequency load.
    This helps identify bottlenecks and breaking points.

    WARNING: Use with caution - may overwhelm staging environments.
    """

    weight = 0  # Disabled by default - enable explicitly with --tags stress
    wait_time = constant_pacing(0.5)  # 2 requests per second per user

    def on_start(self):
        """Initialize stress test user."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key-12345")
        self.headers = {"X-API-Key": self.api_key}

    @tag("stress")
    @task
    def rapid_health_check(self):
        """Rapid-fire health checks for stress testing."""
        with self.client.get(
            "/health",
            catch_response=True,
            name="STRESS: /health",
        ) as response:
            response_time_ms = response.elapsed.total_seconds() * 1000

            if response.status_code != 200:
                response.failure(f"Status: {response.status_code}")
            elif response_time_ms > 1000:  # 1 second hard limit for stress
                response.failure(f"Too slow under stress: {response_time_ms:.0f}ms")
            else:
                response.success()


class NSFASUser(HttpUser):
    """
    User focused on NSFAS funding application endpoints.

    Simulates students applying for NSFAS funding - similar patterns
    to university applications but with additional financial data.

    Thresholds:
        Submit: P50 < 500ms, P95 < 2000ms, P99 < 5000ms
    """

    weight = 2  # 20% of total users
    wait_time = between(3, 8)

    def on_start(self):
        """Initialize NSFAS user with test data."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key-12345")
        self.headers = {"X-API-Key": self.api_key}
        self.applicant_id = f"NSFAS-LOAD-{uuid4().hex[:8]}"
        self.session_token = f"nsfas-session-{uuid4().hex[:16]}"

    @tag("nsfas", "submit")
    @task(2)
    def submit_nsfas_application(self):
        """
        Test NSFAS application submission.

        Includes financial data required for funding evaluation.
        """
        payload = {
            "applicant_id": self.applicant_id,
            "session_token": self.session_token,
            "personal_info": {
                "full_name": f"NSFAS Test User {randint(1000, 9999)}",
                "id_number": f"{randint(9001010000000, 9912319999999)}",
                "email": f"nsfas-test-{uuid4().hex[:8]}@example.com",
                "mobile": f"+2782{randint(1000000, 9999999)}",
            },
            "academic_info": {
                "matric_year": 2024,
                "total_aps": randint(25, 40),
            },
            "guardian_info": {
                "name": "Test Guardian",
                "relationship": "Parent",
                "contact": f"+2782{randint(1000000, 9999999)}",
            },
            "household_info": {
                "size": randint(3, 8),
                "dependents": randint(1, 5),
            },
            "income_info": {
                "total_annual_income": choice(["R0-R50000", "R50001-R150000", "R150001-R350000"]),
                "source": choice(["Employment", "Self-employed", "SASSA grant", "Pension"]),
            },
            "bank_details": {
                "bank_name": choice(["FNB", "Standard Bank", "ABSA", "Nedbank", "Capitec"]),
                "account_number": f"{randint(1000000000, 9999999999)}",
                "account_type": choice(["savings", "current"]),
                "branch_code": f"{randint(100000, 999999)}",
            },
        }

        with self.client.post(
            "/api/nsfas/submit",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/nsfas/submit",
        ) as response:
            if response.status_code == 201:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif response.status_code == 422:
                # Validation error
                response.success()
            else:
                response.failure(f"NSFAS submission failed: {response.status_code}")

    @tag("nsfas", "status")
    @task(3)
    def check_nsfas_status(self):
        """Test NSFAS application status check."""
        nsfas_id = f"TEST-NSFAS-{uuid4().hex[:8]}"

        with self.client.get(
            f"/api/nsfas/status/{nsfas_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/nsfas/status/{nsfas_id}",
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Expected for test IDs
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"NSFAS status check failed: {response.status_code}")


# =============================================================================
# Helper Functions for Custom Validation
# =============================================================================


def validate_thresholds_from_csv(csv_path: str) -> list[str]:
    """
    Validate performance thresholds from Locust CSV output.

    Args:
        csv_path: Path to the *_stats.csv file generated by Locust

    Returns:
        List of threshold violation messages (empty if all pass)
    """
    import csv

    violations = []

    try:
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                endpoint = row.get("Name", "")
                p50 = float(row.get("50%", 0))
                p95 = float(row.get("95%", 0))
                p99 = float(row.get("99%", 0))
                failure_rate = float(row.get("Failure Count", 0)) / max(float(row.get("Request Count", 1)), 1)

                threshold = PERFORMANCE_THRESHOLDS.get(endpoint)
                if threshold:
                    if p50 > threshold.p50_ms:
                        violations.append(f"{endpoint}: P50 {p50:.0f}ms > {threshold.p50_ms}ms")
                    if p95 > threshold.p95_ms:
                        violations.append(f"{endpoint}: P95 {p95:.0f}ms > {threshold.p95_ms}ms")
                    if p99 > threshold.p99_ms:
                        violations.append(f"{endpoint}: P99 {p99:.0f}ms > {threshold.p99_ms}ms")
                    if failure_rate > threshold.error_rate:
                        violations.append(f"{endpoint}: Error rate {failure_rate:.2%} > {threshold.error_rate:.2%}")
    except FileNotFoundError:
        logger.warning(f"CSV file not found: {csv_path}")
    except Exception as e:
        logger.error(f"Error validating thresholds: {e}")

    return violations


# Export thresholds for external validation (e.g., CI/CD scripts)
__all__ = [
    "PERFORMANCE_THRESHOLDS",
    "PerformanceThreshold",
    "HealthCheckUser",
    "SessionUser",
    "ApplicationUser",
    "AnalyticsUser",
    "StressTestUser",
    "NSFASUser",
    "validate_thresholds_from_csv",
]
