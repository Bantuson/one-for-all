"""
API Client Base

Shared HTTP client configuration for all API client tools.
Provides authenticated requests to the internal API.
"""

import os
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv

# Load env from monorepo root (local dev) or use Render env vars (production)
_env_paths = [
    Path(__file__).resolve().parents[5] / ".env.local",
    Path(__file__).resolve().parents[4] / ".env.local",
    Path.cwd() / ".env.local",
]
for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

# API configuration
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")

# Timeout configuration
DEFAULT_TIMEOUT = 30.0


def get_headers() -> dict[str, str]:
    """Get headers with API key authentication."""
    return {
        "X-API-Key": BACKEND_API_KEY,
        "Content-Type": "application/json",
    }


def api_get(
    endpoint: str,
    params: Optional[dict[str, Any]] = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """
    Make a GET request to the internal API.

    Args:
        endpoint: API endpoint path (e.g., "/api/v1/applicants/lookup")
        params: Query parameters
        timeout: Request timeout in seconds

    Returns:
        Response data as dict, or error dict with "error" key
    """
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(
                f"{BACKEND_API_URL}{endpoint}",
                headers=get_headers(),
                params=params,
            )

            if response.status_code == 404:
                return {"not_found": True}

            if response.status_code >= 400:
                return {
                    "error": True,
                    "status_code": response.status_code,
                    "detail": response.text,
                }

            return response.json()

    except httpx.TimeoutException:
        return {"error": True, "detail": "Request timeout"}
    except Exception as e:
        return {"error": True, "detail": str(e)}


def api_post(
    endpoint: str,
    data: dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """
    Make a POST request to the internal API.

    Args:
        endpoint: API endpoint path
        data: Request body data
        timeout: Request timeout in seconds

    Returns:
        Response data as dict, or error dict with "error" key
    """
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                f"{BACKEND_API_URL}{endpoint}",
                headers=get_headers(),
                json=data,
            )

            if response.status_code >= 400:
                return {
                    "error": True,
                    "status_code": response.status_code,
                    "detail": response.text,
                }

            return response.json()

    except httpx.TimeoutException:
        return {"error": True, "detail": "Request timeout"}
    except Exception as e:
        return {"error": True, "detail": str(e)}


def api_patch(
    endpoint: str,
    data: dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """
    Make a PATCH request to the internal API.

    Args:
        endpoint: API endpoint path
        data: Request body data
        timeout: Request timeout in seconds

    Returns:
        Response data as dict, or error dict with "error" key
    """
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.patch(
                f"{BACKEND_API_URL}{endpoint}",
                headers=get_headers(),
                json=data,
            )

            if response.status_code >= 400:
                return {
                    "error": True,
                    "status_code": response.status_code,
                    "detail": response.text,
                }

            return response.json()

    except httpx.TimeoutException:
        return {"error": True, "detail": "Request timeout"}
    except Exception as e:
        return {"error": True, "detail": str(e)}


def api_delete(
    endpoint: str,
    timeout: float = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """
    Make a DELETE request to the internal API.

    Args:
        endpoint: API endpoint path
        timeout: Request timeout in seconds

    Returns:
        Success dict or error dict with "error" key
    """
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.delete(
                f"{BACKEND_API_URL}{endpoint}",
                headers=get_headers(),
            )

            if response.status_code == 204:
                return {"success": True}

            if response.status_code >= 400:
                return {
                    "error": True,
                    "status_code": response.status_code,
                    "detail": response.text,
                }

            return {"success": True}

    except httpx.TimeoutException:
        return {"error": True, "detail": "Request timeout"}
    except Exception as e:
        return {"error": True, "detail": str(e)}
