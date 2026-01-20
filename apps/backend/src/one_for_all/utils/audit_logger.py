"""
Enhanced Audit Logging Module

Provides comprehensive audit logging with:
- Categorized audit events for security monitoring
- PII masking for South African context (ID numbers, phone numbers, emails)
- Structured JSON output for log aggregators
- Failed authentication attempt tracking for brute force detection

Usage:
    from one_for_all.utils.audit_logger import audit_logger, AuditEvent

    audit_logger.log(
        AuditEvent.AUTH_SUCCESS,
        user_id="user-123",
        ip_address="192.168.1.1",
        details={"method": "otp"}
    )

Environment Variables:
    AUDIT_LOG_FORMAT: "json" or "text" (default: "text")
    AUDIT_LOG_LEVEL: "DEBUG", "INFO", "WARNING", "ERROR" (default: "INFO")
"""

import json
import logging
import os
import re
import threading
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AuditEvent(Enum):
    """Categorized audit events for security monitoring."""

    # Authentication
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILURE = "auth.failure"
    AUTH_TOKEN_EXPIRED = "auth.token_expired"
    AUTH_TOKEN_INVALID = "auth.token_invalid"

    # Authorization
    AUTHZ_DENIED = "authz.denied"
    AUTHZ_INSUFFICIENT_ROLE = "authz.insufficient_role"
    IDOR_ATTEMPT = "authz.idor_attempt"

    # Request lifecycle
    REQUEST_START = "request.start"
    REQUEST_COMPLETE = "request.complete"
    REQUEST_ERROR = "request.error"

    # Agent operations
    AGENT_DECISION = "agent.decision"
    AGENT_TOOL_CALL = "agent.tool_call"
    AGENT_ERROR = "agent.error"

    # Security events
    SSRF_BLOCKED = "security.ssrf_blocked"
    RATE_LIMIT_EXCEEDED = "security.rate_limit"
    SUSPICIOUS_ACTIVITY = "security.suspicious"
    INPUT_VALIDATION_FAILED = "security.input_validation"

    # Data operations
    DATA_ACCESS = "data.access"
    DATA_MODIFICATION = "data.modification"
    DATA_EXPORT = "data.export"


# =============================================================================
# PII MASKING PATTERNS (South African Context)
# =============================================================================

# PII patterns for South African context
PII_PATTERNS = {
    # South African ID number: 13 digits (YYMMDD SSSS C A Z)
    "sa_id_number": re.compile(r"\b\d{13}\b"),
    # Email addresses
    "email": re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", re.IGNORECASE
    ),
    # South African phone numbers:
    # Format: +27XXXXXXXXX (11 chars total) or 0XXXXXXXXX (10 chars)
    # Mobile prefixes: 06X, 07X, 08X (local) or +276X, +277X, +278X (intl)
    "phone": re.compile(r"(?:\+27[6-8]\d{8}|0[6-8]\d{8})\b"),
    # UUIDs: standard format
    "uuid": re.compile(
        r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
        re.IGNORECASE,
    ),
    # JWT tokens: three base64url-encoded segments separated by dots
    "jwt_token": re.compile(r"\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b"),
    # API keys: common prefixes followed by alphanumeric string
    "api_key": re.compile(r"\b(sk_|pk_|api_|key_)[A-Za-z0-9]{20,}\b"),
}

MASK_CHAR = "***"


def mask_pii(text: str) -> str:
    """
    Mask PII patterns in text.

    Args:
        text: Text potentially containing PII

    Returns:
        Text with PII replaced by mask characters

    Examples:
        >>> mask_pii("Email: user@example.com")
        'Email: ***'
        >>> mask_pii("ID: 9001015001082")
        'ID: ***'
    """
    if not text:
        return text

    result = text
    for pattern_name, pattern in PII_PATTERNS.items():
        if pattern_name == "uuid":
            # Keep first 8 chars of UUID for correlation/debugging
            result = pattern.sub(lambda m: m.group()[:8] + "-" + MASK_CHAR, result)
        else:
            result = pattern.sub(MASK_CHAR, result)

    return result


def mask_url_path(path: str) -> str:
    """
    Mask potential IDs and sensitive data in URL paths.

    Args:
        path: URL path potentially containing IDs

    Returns:
        Path with IDs masked for logging

    Examples:
        >>> mask_url_path("/api/users/12345/profile")
        '/api/users/***/profile'
        >>> mask_url_path("/api/v1/applicants/a1b2c3d4-...")
        '/api/v1/applicants/a1b2c3d4-***'
    """
    if not path:
        return path

    # Mask numeric IDs in paths (e.g., /users/12345 -> /users/***)
    path = re.sub(r"/\d+(?=/|$)", f"/{MASK_CHAR}", path)

    # Mask UUIDs (keep first 8 chars for correlation)
    path = PII_PATTERNS["uuid"].sub(lambda m: m.group()[:8] + "-" + MASK_CHAR, path)

    return path


def mask_query_params(query_string: str) -> str:
    """
    Mask sensitive query parameters.

    Args:
        query_string: Query string from URL

    Returns:
        Query string with sensitive values masked
    """
    if not query_string:
        return query_string

    # Sensitive parameter names to mask
    sensitive_params = {
        "token",
        "api_key",
        "apikey",
        "key",
        "secret",
        "password",
        "pwd",
        "auth",
        "authorization",
        "access_token",
        "refresh_token",
        "id_token",
        "session",
        "otp",
        "code",
    }

    result = query_string
    for param in sensitive_params:
        # Match param=value patterns (case insensitive)
        result = re.sub(
            rf"({param})=([^&]*)",
            rf"\1={MASK_CHAR}",
            result,
            flags=re.IGNORECASE,
        )

    return result


# =============================================================================
# AUDIT ENTRY DATACLASS
# =============================================================================


@dataclass
class AuditEntry:
    """
    Structured audit log entry.

    Attributes:
        timestamp: ISO 8601 timestamp with Z suffix
        event: Event type from AuditEvent enum
        level: Log level (INFO, WARNING, ERROR)
        request_id: Unique request identifier for tracing
        user_id: User identifier (institution member ID)
        institution_id: Institution/tenant identifier
        role: User role within institution
        ip_address: Client IP address
        method: HTTP method
        path: URL path (PII masked)
        status_code: HTTP response status code
        duration_ms: Request processing time in milliseconds
        details: Additional event-specific details
    """

    timestamp: str
    event: str
    level: str = "INFO"
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    institution_id: Optional[str] = None
    role: Optional[str] = None
    ip_address: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, removing None values for cleaner output."""
        return {k: v for k, v in asdict(self).items() if v is not None}

    def to_json(self) -> str:
        """Convert to JSON string for log aggregators."""
        return json.dumps(self.to_dict(), default=str)

    def to_text(self) -> str:
        """Convert to human-readable text format for console output."""
        parts = [f"[{self.timestamp}]", f"[{self.level}]", f"[{self.event}]"]

        if self.request_id:
            parts.append(f"req={self.request_id[:8]}")
        if self.user_id:
            parts.append(f"user={mask_pii(self.user_id)}")
        if self.institution_id:
            parts.append(f"inst={mask_pii(self.institution_id)}")
        if self.role:
            parts.append(f"role={self.role}")
        if self.method and self.path:
            parts.append(f"{self.method} {mask_url_path(self.path)}")
        if self.status_code:
            parts.append(f"status={self.status_code}")
        if self.duration_ms is not None:
            parts.append(f"duration={self.duration_ms:.2f}ms")
        if self.details:
            # Mask PII in details values
            masked_details = {}
            for k, v in self.details.items():
                if isinstance(v, str):
                    masked_details[k] = mask_pii(v)
                else:
                    masked_details[k] = v
            parts.append(f"details={json.dumps(masked_details, default=str)}")

        return " ".join(parts)


# =============================================================================
# FAILED AUTHENTICATION TRACKER
# =============================================================================


class FailedAuthTracker:
    """
    Track failed authentication attempts for brute force detection.

    Uses a sliding window approach to count failed attempts per IP address.
    When the threshold is exceeded, the tracker flags the IP for potential
    brute force attack detection.

    Attributes:
        window_seconds: Time window for counting failures (default: 300s = 5min)
        max_failures: Maximum failures before flagging (default: 5)

    Thread Safety:
        This class is thread-safe and can be used in async contexts.
    """

    def __init__(self, window_seconds: int = 300, max_failures: int = 5):
        """
        Initialize the tracker.

        Args:
            window_seconds: Sliding window duration in seconds
            max_failures: Number of failures before threshold exceeded
        """
        self.window_seconds = window_seconds
        self.max_failures = max_failures
        self._failures: Dict[str, List[datetime]] = defaultdict(list)
        self._lock = threading.Lock()

    def record_failure(self, ip_address: str) -> bool:
        """
        Record a failed authentication attempt.

        Args:
            ip_address: Client IP address

        Returns:
            True if failure threshold is exceeded after this attempt
        """
        now = datetime.utcnow()
        cutoff = now.timestamp() - self.window_seconds

        with self._lock:
            # Clean old entries outside the window
            self._failures[ip_address] = [
                t for t in self._failures[ip_address] if t.timestamp() > cutoff
            ]

            # Add new failure
            self._failures[ip_address].append(now)

            # Check threshold
            return len(self._failures[ip_address]) >= self.max_failures

    def get_failure_count(self, ip_address: str) -> int:
        """
        Get current failure count for an IP within the window.

        Args:
            ip_address: Client IP address

        Returns:
            Number of failures in the current window
        """
        now = datetime.utcnow()
        cutoff = now.timestamp() - self.window_seconds

        with self._lock:
            return len(
                [
                    t
                    for t in self._failures.get(ip_address, [])
                    if t.timestamp() > cutoff
                ]
            )

    def clear_failures(self, ip_address: str) -> None:
        """
        Clear failure history for an IP (e.g., after successful auth).

        Args:
            ip_address: Client IP address
        """
        with self._lock:
            if ip_address in self._failures:
                del self._failures[ip_address]


# =============================================================================
# MAIN AUDIT LOGGER CLASS
# =============================================================================


class AuditLogger:
    """
    Main audit logger with configurable output format.

    Provides structured audit logging with automatic PII masking,
    failed auth tracking, and support for both JSON and text output formats.

    Configuration via environment variables:
        AUDIT_LOG_FORMAT: "json" or "text" (default: "text")
        AUDIT_LOG_LEVEL: "DEBUG", "INFO", "WARNING", "ERROR" (default: "INFO")

    Example:
        >>> from one_for_all.utils.audit_logger import audit_logger, AuditEvent
        >>> audit_logger.log(
        ...     AuditEvent.REQUEST_COMPLETE,
        ...     request_id="abc12345",
        ...     method="GET",
        ...     path="/api/v1/users/123",
        ...     status_code=200,
        ...     duration_ms=45.2
        ... )
    """

    def __init__(self):
        """Initialize the audit logger with configuration from environment."""
        self.format = os.getenv("AUDIT_LOG_FORMAT", "text").lower()
        self.level = os.getenv("AUDIT_LOG_LEVEL", "INFO").upper()
        self.failed_auth_tracker = FailedAuthTracker()
        self._logger = logging.getLogger("audit")

        # Set log level
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
        }
        self._logger.setLevel(level_map.get(self.level, logging.INFO))

        # Configure handler if not already present
        if not self._logger.handlers:
            handler = logging.StreamHandler()
            # Use simple format - the AuditEntry handles formatting
            handler.setFormatter(logging.Formatter("%(message)s"))
            self._logger.addHandler(handler)

    def log(
        self,
        event: AuditEvent,
        level: str = "INFO",
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        method: Optional[str] = None,
        path: Optional[str] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log an audit event.

        Args:
            event: The type of audit event (from AuditEvent enum)
            level: Log level ("INFO", "WARNING", "ERROR")
            request_id: Unique request identifier for tracing
            user_id: User identifier (masked in output)
            institution_id: Institution/tenant identifier (masked in output)
            role: User role within institution
            ip_address: Client IP address
            method: HTTP method (GET, POST, etc.)
            path: URL path (will be masked for PII)
            status_code: HTTP response status code
            duration_ms: Request duration in milliseconds
            details: Additional event-specific details
        """
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat() + "Z",
            event=event.value,
            level=level,
            request_id=request_id,
            user_id=user_id,
            institution_id=institution_id,
            role=role,
            ip_address=ip_address,
            method=method,
            path=mask_url_path(path) if path else None,
            status_code=status_code,
            duration_ms=duration_ms,
            details=details or {},
        )

        # Output based on configured format
        if self.format == "json":
            output = entry.to_json()
        else:
            output = entry.to_text()

        # Log at appropriate level
        log_level = getattr(logging, level.upper(), logging.INFO)
        self._logger.log(log_level, output)

        # Track failed auth attempts for brute force detection
        if event == AuditEvent.AUTH_FAILURE and ip_address:
            if self.failed_auth_tracker.record_failure(ip_address):
                # Threshold exceeded - log suspicious activity
                self.log(
                    AuditEvent.SUSPICIOUS_ACTIVITY,
                    level="WARNING",
                    ip_address=ip_address,
                    request_id=request_id,
                    details={
                        "reason": "brute_force_detected",
                        "failures": self.failed_auth_tracker.get_failure_count(
                            ip_address
                        ),
                        "window_seconds": self.failed_auth_tracker.window_seconds,
                    },
                )

    def log_auth_success(
        self,
        user_id: str,
        ip_address: str,
        request_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        role: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Convenience method for logging successful authentication.

        Also clears failed auth history for the IP address.
        """
        self.failed_auth_tracker.clear_failures(ip_address)
        self.log(
            AuditEvent.AUTH_SUCCESS,
            level="INFO",
            request_id=request_id,
            user_id=user_id,
            institution_id=institution_id,
            role=role,
            ip_address=ip_address,
            details=details,
        )

    def log_auth_failure(
        self,
        ip_address: str,
        request_id: Optional[str] = None,
        reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Convenience method for logging failed authentication."""
        failure_details = details or {}
        if reason:
            failure_details["reason"] = reason
        self.log(
            AuditEvent.AUTH_FAILURE,
            level="WARNING",
            request_id=request_id,
            ip_address=ip_address,
            details=failure_details,
        )

    def log_request_start(
        self,
        request_id: str,
        method: str,
        path: str,
        ip_address: str,
        user_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> None:
        """Convenience method for logging request start."""
        self.log(
            AuditEvent.REQUEST_START,
            level="INFO",
            request_id=request_id,
            user_id=user_id,
            institution_id=institution_id,
            role=role,
            ip_address=ip_address,
            method=method,
            path=path,
        )

    def log_request_complete(
        self,
        request_id: str,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Convenience method for logging request completion."""
        level = "INFO" if status_code < 400 else "WARNING"
        self.log(
            AuditEvent.REQUEST_COMPLETE,
            level=level,
            request_id=request_id,
            user_id=user_id,
            institution_id=institution_id,
            role=role,
            ip_address=ip_address,
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
        )

    def log_request_error(
        self,
        request_id: str,
        method: str,
        path: str,
        duration_ms: float,
        error: str,
        user_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Convenience method for logging request errors."""
        self.log(
            AuditEvent.REQUEST_ERROR,
            level="ERROR",
            request_id=request_id,
            user_id=user_id,
            institution_id=institution_id,
            ip_address=ip_address,
            method=method,
            path=path,
            duration_ms=duration_ms,
            details={"error": mask_pii(str(error))},
        )


# =============================================================================
# GLOBAL SINGLETON
# =============================================================================

# Global singleton instance for application-wide use
audit_logger = AuditLogger()
