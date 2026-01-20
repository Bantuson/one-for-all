"""
In-Memory Rate Limiting for CrewAI Tools

Provides thread-safe rate limiting for tool functions that don't go through
the HTTP API layer. Essential for preventing abuse of OTP generation,
notification sending, and other resource-intensive operations.

Security Features:
- Per-identifier tracking (phone number, email, user ID)
- Per-action limits (different limits for different operations)
- Sliding window algorithm for smooth rate limiting
- Thread-safe implementation for concurrent CrewAI agent execution
- Automatic cleanup of old entries to prevent memory leaks

Usage:
    from one_for_all.utils.rate_limit import tool_limiter

    @tool
    def send_otp(phone_number: str) -> str:
        # Check rate limit before expensive operation
        allowed, retry_after = tool_limiter.check(
            identifier=phone_number,
            action="otp_send",
            limit=3,
            window_seconds=900  # 15 minutes
        )
        if not allowed:
            return f"RATE_LIMITED: Please wait {retry_after} seconds before requesting another OTP"

        # ... proceed with OTP sending
"""

import logging
import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """
    Thread-safe in-memory rate limiter using sliding window algorithm.

    Tracks request timestamps per (action, identifier) pair and enforces
    configurable limits within time windows.

    Attributes:
        _attempts: Dict mapping keys to list of timestamps
        _lock: Threading lock for safe concurrent access
        _last_cleanup: Timestamp of last cleanup run
        _cleanup_interval: Seconds between cleanup runs (default 300 = 5 min)
    """

    def __init__(self, cleanup_interval: int = 300):
        """
        Initialize the rate limiter.

        Args:
            cleanup_interval: Seconds between automatic cleanup of old entries
        """
        self._attempts: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = cleanup_interval

    def check(
        self,
        identifier: str,
        action: str,
        limit: int,
        window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Check if an action is allowed for the given identifier.

        Uses a sliding window algorithm: counts requests within the last
        `window_seconds` and allows if under `limit`.

        Args:
            identifier: Unique identifier (phone number, email, user ID, etc.)
            action: Action type (e.g., "otp_send", "otp_verify", "notification")
            limit: Maximum allowed requests within the window
            window_seconds: Time window in seconds

        Returns:
            Tuple of (allowed: bool, retry_after: int)
            - allowed: True if request should proceed, False if rate limited
            - retry_after: Seconds until the request would be allowed (0 if allowed)

        Example:
            >>> limiter = InMemoryRateLimiter()
            >>> allowed, retry = limiter.check("0821234567", "otp_send", 3, 900)
            >>> if not allowed:
            ...     print(f"Rate limited. Try again in {retry} seconds")
        """
        key = f"{action}:{identifier}"
        now = time.time()

        with self._lock:
            # Run cleanup periodically
            self._maybe_cleanup(now)

            # Filter to only timestamps within the window
            window_start = now - window_seconds
            self._attempts[key] = [
                t for t in self._attempts[key] if t > window_start
            ]

            current_count = len(self._attempts[key])

            # Check if over limit
            if current_count >= limit:
                # Calculate retry_after from oldest timestamp in window
                if self._attempts[key]:
                    oldest = min(self._attempts[key])
                    retry_after = int(window_seconds - (now - oldest)) + 1
                else:
                    retry_after = window_seconds

                logger.warning(
                    f"Rate limit exceeded: {action} for {identifier[:20]}... "
                    f"({current_count}/{limit} in {window_seconds}s window)"
                )

                return False, max(retry_after, 1)

            # Record this attempt
            self._attempts[key].append(now)

            remaining = limit - current_count - 1
            logger.debug(
                f"Rate limit check passed: {action} for {identifier[:20]}... "
                f"({current_count + 1}/{limit}, {remaining} remaining)"
            )

            return True, 0

    def reset(self, identifier: str, action: str) -> None:
        """
        Reset rate limit for a specific identifier and action.

        Useful after successful verification to allow immediate retry
        on the next authentication cycle.

        Args:
            identifier: The identifier to reset
            action: The action to reset
        """
        key = f"{action}:{identifier}"
        with self._lock:
            if key in self._attempts:
                del self._attempts[key]
                logger.debug(f"Rate limit reset: {action} for {identifier[:20]}...")

    def get_remaining(
        self,
        identifier: str,
        action: str,
        limit: int,
        window_seconds: int
    ) -> int:
        """
        Get remaining requests allowed within the current window.

        Args:
            identifier: Unique identifier
            action: Action type
            limit: Maximum allowed requests
            window_seconds: Time window in seconds

        Returns:
            Number of remaining requests allowed
        """
        key = f"{action}:{identifier}"
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            current_attempts = [
                t for t in self._attempts.get(key, []) if t > window_start
            ]
            return max(0, limit - len(current_attempts))

    def _maybe_cleanup(self, now: float) -> None:
        """
        Periodically clean up old entries to prevent memory growth.

        Called during check() while holding the lock.
        """
        if now - self._last_cleanup < self._cleanup_interval:
            return

        self._last_cleanup = now

        # Remove entries with no recent attempts (older than 1 hour)
        cutoff = now - 3600
        keys_to_remove = []

        for key, timestamps in self._attempts.items():
            # Filter old timestamps
            self._attempts[key] = [t for t in timestamps if t > cutoff]
            # Mark empty entries for removal
            if not self._attempts[key]:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self._attempts[key]

        if keys_to_remove:
            logger.debug(f"Rate limiter cleanup: removed {len(keys_to_remove)} stale entries")

    def get_stats(self) -> Dict[str, int]:
        """
        Get statistics about current rate limiter state.

        Returns:
            Dict with stats: total_keys, total_attempts
        """
        with self._lock:
            total_keys = len(self._attempts)
            total_attempts = sum(len(v) for v in self._attempts.values())
            return {
                "total_keys": total_keys,
                "total_attempts": total_attempts,
            }


# =============================================================================
# GLOBAL RATE LIMITER INSTANCE
# =============================================================================
# Single instance shared across all tools for consistent rate limiting

tool_limiter = InMemoryRateLimiter()


# =============================================================================
# PREDEFINED RATE LIMIT CONFIGURATIONS
# =============================================================================
# Standard limits for common tool operations

class ToolRateLimits:
    """
    Predefined rate limit configurations for tool operations.

    These limits are designed to balance user experience with abuse prevention.

    Attributes:
        OTP_SEND: Limit for sending OTPs (3 per 15 minutes)
        OTP_VERIFY: Limit for verification attempts (5 per 5 minutes)
        NOTIFICATION: Limit for general notifications (10 per minute)
        BATCH_NOTIFICATION: Limit for batch operations (5 per hour)
        RAG_QUERY: Limit for RAG/LLM operations (20 per minute)
        APPLICATION_SUBMIT: Limit for application submissions (5 per hour)
    """

    OTP_SEND = {"limit": 3, "window_seconds": 900}  # 15 minutes
    OTP_VERIFY = {"limit": 5, "window_seconds": 300}  # 5 minutes
    NOTIFICATION = {"limit": 10, "window_seconds": 60}  # 1 minute
    BATCH_NOTIFICATION = {"limit": 5, "window_seconds": 3600}  # 1 hour
    RAG_QUERY = {"limit": 20, "window_seconds": 60}  # 1 minute
    APPLICATION_SUBMIT = {"limit": 5, "window_seconds": 3600}  # 1 hour


def check_tool_rate_limit(
    identifier: str,
    action: str,
    config: Dict[str, int]
) -> Tuple[bool, str]:
    """
    Convenience function to check rate limit with standard error message.

    Args:
        identifier: Unique identifier for the requester
        action: Action being performed
        config: Dict with 'limit' and 'window_seconds' keys

    Returns:
        Tuple of (allowed: bool, error_message: str)
        - If allowed, error_message is empty string
        - If not allowed, error_message contains user-friendly message
    """
    allowed, retry_after = tool_limiter.check(
        identifier=identifier,
        action=action,
        limit=config["limit"],
        window_seconds=config["window_seconds"]
    )

    if allowed:
        return True, ""

    # Format friendly message
    if retry_after < 60:
        wait_str = f"{retry_after} seconds"
    elif retry_after < 3600:
        wait_str = f"{retry_after // 60} minutes"
    else:
        wait_str = f"{retry_after // 3600} hours"

    return False, f"RATE_LIMITED: Too many requests. Please wait {wait_str} before trying again."
