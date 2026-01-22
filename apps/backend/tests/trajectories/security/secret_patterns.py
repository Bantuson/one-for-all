"""
Unified Secret Detection Patterns

Centralized patterns for detecting secrets in VCR cassettes.
Both conftest.py and cassette_auditor.py import from here.

Security fixes applied:
- Bounded quantifiers to prevent ReDoS
- Fixed DeepSeek pattern (uses sk- prefix, not deepseek-)
- Added Clerk authentication keys
- Consistent case handling
"""

import re
from typing import Pattern

# Bounded max lengths prevent ReDoS
MAX_TOKEN_LENGTH = 500
MAX_KEY_LENGTH = 100

SECRET_PATTERNS: dict[str, Pattern[str]] = {
    # JWT tokens (generic)
    "jwt_token": re.compile(
        r'eyJ[A-Za-z0-9_-]{20,200}\.[A-Za-z0-9_-]{20,500}\.[A-Za-z0-9_-]{20,200}'
    ),

    # Supabase keys (JWT format, flexible header)
    "supabase_key": re.compile(
        r'eyJ[A-Za-z0-9_-]{20,100}\.[A-Za-z0-9_-]{50,500}\.[A-Za-z0-9_-]{20,100}'
    ),

    # OpenAI API keys (sk-... or sk-proj-...)
    "openai_key": re.compile(
        r'sk-(?:proj-)?[A-Za-z0-9]{20,100}'
    ),

    # DeepSeek API keys (FIXED: uses sk- prefix with hex chars)
    "deepseek_key": re.compile(
        r'sk-[a-f0-9]{32,64}'
    ),

    # Clerk authentication keys (ADDED: used by this project)
    "clerk_secret_key": re.compile(
        r'sk_(?:live|test)_[A-Za-z0-9]{20,60}'
    ),
    "clerk_publishable_key": re.compile(
        r'pk_(?:live|test)_[A-Za-z0-9]{20,60}'
    ),

    # SendGrid API keys (two-part format)
    "sendgrid_key": re.compile(
        r'SG\.[A-Za-z0-9_-]{20,30}\.[A-Za-z0-9_-]{40,50}'
    ),

    # Twilio credentials
    "twilio_account_sid": re.compile(
        r'AC[a-f0-9]{32}'
    ),
    "twilio_auth_token": re.compile(
        r'SK[a-f0-9]{32}'
    ),

    # AWS access keys
    "aws_access_key": re.compile(
        r'AKIA[0-9A-Z]{16}'
    ),

    # Generic API key patterns (with bounded length)
    "generic_api_key": re.compile(
        r'(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token)'
        r'["\']?\s*[:=]\s*["\']?'
        r'([A-Za-z0-9_-]{20,100})'
        r'["\']?',
        re.IGNORECASE
    ),

    # Authorization headers
    "auth_header": re.compile(
        r'(?:apiKey|api[_-]key|authorization)\s*:\s*["\']?[A-Za-z0-9_.-]{16,100}["\']?',
        re.IGNORECASE
    ),

    # PostgreSQL/Supabase connection strings
    "postgres_connection": re.compile(
        r'postgres(?:ql)?://[^:]+:[^@]+@[^\s]{10,200}',
        re.IGNORECASE
    ),

    # Private keys (PEM format)
    "private_key_pem": re.compile(
        r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----',
        re.IGNORECASE
    ),
}

# Headers to filter from VCR recordings (comprehensive list)
SECURITY_FILTER_HEADERS: list[str] = [
    # Authorization variants
    "authorization", "Authorization", "AUTHORIZATION",
    # API key variants (CRITICAL for Supabase)
    "apiKey", "apikey", "ApiKey", "APIKEY",
    "api-key", "Api-Key", "API-KEY",
    "x-api-key", "X-Api-Key", "X-API-KEY",
    # Bearer variants
    "bearer", "Bearer", "BEARER",
    # Supabase specific
    "supabase-key", "x-supabase-api-key",
    # Other service keys
    "openai-api-key", "deepseek-api-key",
    # Cookies
    "Cookie", "cookie", "COOKIE",
    "Set-Cookie", "set-cookie", "SET-COOKIE",
]

def scan_text_for_secrets(text: str) -> list[dict]:
    """
    Scan text for secrets using all patterns.

    Returns list of findings with pattern name and matched text (truncated).
    """
    findings = []
    for name, pattern in SECRET_PATTERNS.items():
        for match in pattern.finditer(text):
            matched = match.group()
            findings.append({
                "pattern": name,
                "matched": matched[:20] + "..." if len(matched) > 20 else matched,
                "position": match.start(),
            })
    return findings


def redact_secrets(text: str) -> str:
    """
    Replace detected secrets with [REDACTED] placeholder.
    """
    result = text
    for name, pattern in SECRET_PATTERNS.items():
        result = pattern.sub(f"[REDACTED-{name.upper()}]", result)
    return result
