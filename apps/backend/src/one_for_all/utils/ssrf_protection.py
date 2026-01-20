"""
SSRF Protection Module

Provides URL validation and protection against Server-Side Request Forgery (SSRF) attacks.
This module validates URLs before fetching them to prevent access to internal services,
cloud metadata endpoints, and other sensitive resources.

Security Features:
- Domain allowlisting for trusted university domains
- Private IP range blocking
- Cloud metadata endpoint protection
- Scheme validation (HTTPS only in production)
- DNS rebinding protection via IP resolution
- Redirect validation
"""

import os
import socket
import ipaddress
import logging
from dataclasses import dataclass
from typing import Optional, Set, List
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# South African universities and trusted domains
ALLOWED_DOMAINS: Set[str] = {
    # Universities
    "uct.ac.za", "www.uct.ac.za",
    "wits.ac.za", "www.wits.ac.za",
    "up.ac.za", "www.up.ac.za",
    "sun.ac.za", "www.sun.ac.za",
    "ukzn.ac.za", "www.ukzn.ac.za",
    "uj.ac.za", "www.uj.ac.za",
    "unisa.ac.za", "www.unisa.ac.za",
    "nwu.ac.za", "www.nwu.ac.za",
    "ufs.ac.za", "www.ufs.ac.za",
    "ru.ac.za", "www.ru.ac.za",
    "ufh.ac.za", "www.ufh.ac.za",
    "ul.ac.za", "www.ul.ac.za",
    "univen.ac.za", "www.univen.ac.za",
    "uwc.ac.za", "www.uwc.ac.za",
    "nmmu.ac.za", "www.nmmu.ac.za",
    "mandela.ac.za", "www.mandela.ac.za",
    "wsu.ac.za", "www.wsu.ac.za",
    "unizulu.ac.za", "www.unizulu.ac.za",
    "spu.ac.za", "www.spu.ac.za",
    "ump.ac.za", "www.ump.ac.za",
    # Universities of Technology
    "tut.ac.za", "www.tut.ac.za",
    "dut.ac.za", "www.dut.ac.za",
    "cput.ac.za", "www.cput.ac.za",
    "vut.ac.za", "www.vut.ac.za",
    "cut.ac.za", "www.cut.ac.za",
    "mut.ac.za", "www.mut.ac.za",
    # Private institutions
    "eduvos.com", "www.eduvos.com",
    "stadio.ac.za", "www.stadio.ac.za",
    "mancosa.co.za", "www.mancosa.co.za",
    "iie.ac.za", "www.iie.ac.za",
    "varsitycollege.co.za", "www.varsitycollege.co.za",
    "boston.co.za", "www.boston.co.za",
    "damelin.co.za", "www.damelin.co.za",
    "rosebank.co.za", "www.rosebank.co.za",
    # Funding
    "nsfas.org.za", "www.nsfas.org.za",
    # Storage (Supabase)
    "supabase.co",
}

# Private IP ranges that should never be accessed
PRIVATE_RANGES: List[str] = [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "127.0.0.0/8",
    "169.254.0.0/16",  # Link-local
    "0.0.0.0/8",
    "100.64.0.0/10",  # Carrier-grade NAT
    "192.0.0.0/24",
    "192.0.2.0/24",   # TEST-NET-1
    "198.51.100.0/24", # TEST-NET-2
    "203.0.113.0/24",  # TEST-NET-3
    "224.0.0.0/4",     # Multicast
    "240.0.0.0/4",     # Reserved
]

# AWS/Cloud metadata endpoints
METADATA_IPS: Set[str] = {
    "169.254.169.254",  # AWS/GCP/Azure metadata
    "169.254.170.2",    # AWS ECS metadata
    "fd00:ec2::254",    # AWS IPv6 metadata
}

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"


@dataclass
class SSRFValidationResult:
    """Result of SSRF URL validation."""
    is_valid: bool
    url: str
    reason: Optional[str] = None
    resolved_ip: Optional[str] = None

    def __bool__(self) -> bool:
        return self.is_valid


def _get_allowed_domains() -> Set[str]:
    """Get allowed domains, including any from environment."""
    domains = ALLOWED_DOMAINS.copy()

    # Add custom domains from environment
    custom = os.getenv("SSRF_ALLOWED_DOMAINS", "")
    if custom:
        for domain in custom.split(","):
            domain = domain.strip().lower()
            if domain:
                domains.add(domain)
                if not domain.startswith("www."):
                    domains.add(f"www.{domain}")

    return domains


def _is_private_ip(ip: str) -> bool:
    """Check if IP address is in private/reserved ranges."""
    try:
        ip_obj = ipaddress.ip_address(ip)

        # Check metadata IPs first
        if ip in METADATA_IPS:
            return True

        # Check private ranges
        for cidr in PRIVATE_RANGES:
            if ip_obj in ipaddress.ip_network(cidr):
                return True

        return False
    except ValueError:
        # Invalid IP, treat as unsafe
        return True


def _resolve_hostname(hostname: str) -> Optional[str]:
    """Resolve hostname to IP address."""
    try:
        return socket.gethostbyname(hostname)
    except socket.gaierror:
        return None


def _is_domain_allowed(hostname: str, allowed_domains: Set[str]) -> bool:
    """Check if hostname matches allowed domains (including subdomains)."""
    hostname = hostname.lower()

    # Direct match
    if hostname in allowed_domains:
        return True

    # Subdomain match (e.g., admissions.up.ac.za matches up.ac.za)
    for domain in allowed_domains:
        if hostname.endswith(f".{domain}"):
            return True

    return False


def validate_url(
    url: str,
    require_allowlist: bool = True,
    allow_http: bool = False,
) -> SSRFValidationResult:
    """
    Validate URL for SSRF safety.

    Checks:
    1. Scheme must be HTTPS (or HTTP if allow_http=True in dev)
    2. Domain must be in allowlist (if require_allowlist=True)
    3. Resolved IP must not be private/metadata

    Args:
        url: URL to validate
        require_allowlist: Whether to require domain in allowlist
        allow_http: Whether to allow HTTP (only in development)

    Returns:
        SSRFValidationResult with validation status and details
    """
    if not url:
        return SSRFValidationResult(False, url, "Empty URL")

    try:
        parsed = urlparse(url)
    except Exception as e:
        return SSRFValidationResult(False, url, f"Invalid URL format: {e}")

    # Check scheme
    allowed_schemes = ["https"]
    if allow_http and not IS_PRODUCTION:
        allowed_schemes.append("http")

    if parsed.scheme.lower() not in allowed_schemes:
        return SSRFValidationResult(
            False, url,
            f"Invalid scheme: {parsed.scheme}. Allowed: {allowed_schemes}"
        )

    # Check hostname exists
    hostname = parsed.hostname
    if not hostname:
        return SSRFValidationResult(False, url, "No hostname in URL")

    hostname = hostname.lower()

    # Check allowlist
    if require_allowlist:
        allowed_domains = _get_allowed_domains()
        if not _is_domain_allowed(hostname, allowed_domains):
            return SSRFValidationResult(
                False, url,
                f"Domain not in allowlist: {hostname}"
            )

    # Resolve and check IP
    resolved_ip = _resolve_hostname(hostname)
    if not resolved_ip:
        return SSRFValidationResult(
            False, url,
            f"Could not resolve hostname: {hostname}"
        )

    if _is_private_ip(resolved_ip):
        logger.warning(f"SSRF blocked: {url} resolved to private IP {resolved_ip}")
        return SSRFValidationResult(
            False, url,
            f"Hostname resolves to private/reserved IP: {resolved_ip}",
            resolved_ip
        )

    return SSRFValidationResult(True, url, resolved_ip=resolved_ip)


def validate_website_url(url: str) -> SSRFValidationResult:
    """Validate URL for website scraping (strict allowlist)."""
    return validate_url(url, require_allowlist=True, allow_http=False)


def validate_image_url(url: str) -> SSRFValidationResult:
    """
    Validate URL for image fetching.

    Allows Supabase storage URLs and other image hosts.
    """
    if not url:
        return SSRFValidationResult(False, url, "Empty URL")

    try:
        parsed = urlparse(url)
        hostname = parsed.hostname.lower() if parsed.hostname else ""

        # Allow Supabase storage
        if hostname.endswith(".supabase.co") or hostname.endswith(".supabase.in"):
            # Still check for private IP
            resolved_ip = _resolve_hostname(hostname)
            if resolved_ip and _is_private_ip(resolved_ip):
                return SSRFValidationResult(False, url, f"Private IP: {resolved_ip}", resolved_ip)
            return SSRFValidationResult(True, url, resolved_ip=resolved_ip)

        # Fall back to standard validation
        return validate_url(url, require_allowlist=True, allow_http=False)

    except Exception as e:
        return SSRFValidationResult(False, url, f"Validation error: {e}")


def validate_redirect(original_url: str, redirect_url: str) -> SSRFValidationResult:
    """
    Validate a redirect URL.

    Ensures redirects don't bypass SSRF protections.
    """
    # Parse original to get expected domain
    try:
        original_parsed = urlparse(original_url)
        redirect_parsed = urlparse(redirect_url)

        original_host = original_parsed.hostname.lower() if original_parsed.hostname else ""
        redirect_host = redirect_parsed.hostname.lower() if redirect_parsed.hostname else ""

        # Same domain redirects are allowed
        if redirect_host == original_host:
            # Still validate the redirect URL
            return validate_url(redirect_url, require_allowlist=True, allow_http=False)

        # Cross-domain redirects need full validation
        result = validate_url(redirect_url, require_allowlist=True, allow_http=False)
        if not result:
            logger.warning(f"Blocked cross-domain redirect: {original_url} -> {redirect_url}")
        return result

    except Exception as e:
        return SSRFValidationResult(False, redirect_url, f"Redirect validation error: {e}")
