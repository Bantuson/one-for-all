"""
Locust load testing configuration for One For All Backend API.

This file defines load test scenarios for performance testing the staging environment.

Usage:
    # Run headless (CI/CD)
    locust -f locustfile.py --headless --users 50 --spawn-rate 5 --run-time 5m --host https://staging.example.com

    # Run with web UI (local development)
    locust -f locustfile.py --host https://staging.example.com
    # Then open http://localhost:8089 in browser
"""

import os
from locust import HttpUser, task, between, constant_pacing
from random import randint, choice


class BackendAPIUser(HttpUser):
    """
    Simulates a typical user interacting with the One For All backend API.

    Load distribution:
    - 40% Health checks and status queries (lightweight)
    - 30% Application submissions (heavy)
    - 20% NSFAS submissions (heavy)
    - 10% RAG queries (medium)
    """

    # Wait 1-3 seconds between tasks
    wait_time = between(1, 3)

    def on_start(self):
        """Initialize user session with API key authentication."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key")
        self.headers = {"X-API-Key": self.api_key}

    @task(40)
    def health_check(self):
        """Lightweight health check endpoint."""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(30)
    def submit_application(self):
        """Heavy operation: Submit university application."""
        application_data = {
            "applicant_id": f"TEST-LOAD-{randint(1000, 9999)}",
            "session_token": f"session-{randint(1000, 9999)}",
            "university_name": choice(["UCT", "Wits", "UP", "Stellenbosch"]),
            "personal_info": {
                "name": "Load Test User",
                "email": "loadtest@example.com",
                "phone": "+27821234567",
                "id_number": "9001010000000",
            },
            "academic_info": {
                "matric_year": "2023",
                "matric_average": 75.5,
                "subjects": [
                    {"name": "Mathematics", "grade": 80},
                    {"name": "English", "grade": 75},
                    {"name": "Physical Science", "grade": 70},
                ],
            },
            "program_preferences": [
                {"program": "BSc Computer Science", "campus": "Main Campus"}
            ],
        }

        with self.client.post(
            "/api/applications/submit",
            json=application_data,
            headers=self.headers,
            catch_response=True,
            name="/api/applications/submit",
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif response.status_code == 422:
                response.failure("Validation error")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(20)
    def submit_nsfas_application(self):
        """Heavy operation: Submit NSFAS funding application."""
        nsfas_data = {
            "applicant_id": f"TEST-LOAD-{randint(1000, 9999)}",
            "session_token": f"session-{randint(1000, 9999)}",
            "personal_info": {
                "name": "Load Test User",
                "email": "loadtest@example.com",
                "phone": "+27821234567",
                "id_number": "9001010000000",
            },
            "academic_info": {
                "matric_year": "2023",
                "matric_average": 75.5,
            },
            "guardian_info": {
                "name": "Guardian Name",
                "relationship": "Parent",
                "contact": "+27821234567",
            },
            "household_info": {
                "size": 4,
                "monthly_income": "0-50000",
            },
            "income_info": {
                "total": "0-50000",
                "sources": ["Employment"],
            },
            "bank_details": {
                "bank_name": "FNB",
                "account_number": "12345678901",
                "account_type": "savings",
            },
        }

        with self.client.post(
            "/api/nsfas/submit",
            json=nsfas_data,
            headers=self.headers,
            catch_response=True,
            name="/api/nsfas/submit",
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            elif response.status_code == 422:
                response.failure("Validation error")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(10)
    def query_application_status(self):
        """Medium operation: Query application status."""
        # Use a test application ID (would be created by previous submit)
        test_app_id = f"TEST-LOAD-{randint(1000, 9999)}"

        with self.client.get(
            f"/api/applications/status/{test_app_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/applications/status/{application_id}",
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # Expected for test IDs that don't exist
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")


class StressTestUser(HttpUser):
    """
    Stress test user with constant pacing for consistent load.

    This user type generates a more aggressive, constant load pattern
    to test system limits and identify bottlenecks.
    """

    # Generate exactly 1 request every 0.5 seconds
    wait_time = constant_pacing(0.5)

    def on_start(self):
        """Initialize user session with API key authentication."""
        self.api_key = os.getenv("STAGING_API_KEY", "test-api-key")
        self.headers = {"X-API-Key": self.api_key}

    @task
    def rapid_application_submit(self):
        """Rapid-fire application submissions for stress testing."""
        application_data = {
            "applicant_id": f"TEST-STRESS-{randint(10000, 99999)}",
            "session_token": f"stress-session-{randint(10000, 99999)}",
            "university_name": "UCT",
            "personal_info": {
                "name": "Stress Test User",
                "email": "stresstest@example.com",
            },
            "academic_info": {
                "matric_year": "2023",
                "matric_average": 70.0,
            },
        }

        with self.client.post(
            "/api/applications/submit",
            json=application_data,
            headers=self.headers,
            catch_response=True,
            name="STRESS: /api/applications/submit",
        ) as response:
            if response.elapsed.total_seconds() > 5.0:
                response.failure(f"Too slow: {response.elapsed.total_seconds()}s")
            elif response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")


# Performance thresholds for CI/CD validation
# These are checked in the GitHub Actions workflow
PERFORMANCE_THRESHOLDS = {
    "p50": 500,   # 50th percentile < 500ms
    "p95": 2000,  # 95th percentile < 2000ms
    "p99": 5000,  # 99th percentile < 5000ms
    "error_rate": 0.01,  # Error rate < 1%
}
