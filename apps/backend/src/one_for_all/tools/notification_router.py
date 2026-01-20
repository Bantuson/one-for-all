"""
Notification Router

Smart channel routing for notifications with WhatsApp as primary (80%),
SMS as failover (15%), and email for archival (5%).

Implements:
- Channel selection based on user preferences and availability
- Failover chain: WhatsApp -> SMS -> Email
- Exponential backoff retry logic
- Delivery status tracking and cost estimation
"""

import os
import asyncio
import re
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Optional, Tuple
from dataclasses import dataclass

import aiohttp
from dotenv import load_dotenv

# Load env from monorepo root
_env_paths = [
    Path(__file__).resolve().parents[5] / '.env.local',
    Path(__file__).resolve().parents[4] / '.env.local',
    Path.cwd() / '.env.local',
]
for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break

# =============================================================================
# CONFIGURATION (Feature Flags)
# =============================================================================

NOTIFICATION_PRIMARY_CHANNEL = os.getenv("NOTIFICATION_PRIMARY_CHANNEL", "whatsapp")
NOTIFICATION_FAILOVER_ENABLED = os.getenv("NOTIFICATION_FAILOVER_ENABLED", "true").lower() == "true"
NOTIFICATION_LOG_ENABLED = os.getenv("NOTIFICATION_LOG_ENABLED", "true").lower() == "true"

# Twilio credentials
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

# SendGrid credentials
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "no-reply@oneforall.app")

# =============================================================================
# CONSTANTS
# =============================================================================

# Cost per message in USD (for tracking and optimization)
CHANNEL_COSTS = {
    "whatsapp": Decimal("0.005"),
    "sms": Decimal("0.04"),
    "email": Decimal("0.001"),
}

# Default channel priority (can be overridden by user preferences)
DEFAULT_CHANNEL_PRIORITY = {
    "whatsapp": 1,
    "sms": 2,
    "email": 3,
}

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [5, 30, 120]  # Exponential backoff: 5s, 30s, 2min


class NotificationChannel(Enum):
    """Supported notification channels."""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"


class NotificationStatus(Enum):
    """Notification delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    EXPIRED = "expired"


class NotificationType(Enum):
    """Types of notifications for routing decisions."""
    OTP = "otp"                        # High priority, immediate delivery
    APPLICATION_UPDATE = "application_update"  # Normal priority
    REMINDER = "reminder"              # Low priority, can wait
    MARKETING = "marketing"            # Lowest priority, respect quiet hours


class NotificationPriority(Enum):
    """Priority levels affecting retry behavior."""
    HIGH = "high"      # OTPs, urgent updates - aggressive retry
    NORMAL = "normal"  # Standard notifications
    LOW = "low"        # Marketing, reminders - minimal retry


@dataclass
class NotificationResult:
    """Result of a notification delivery attempt."""
    success: bool
    channel: str
    status: NotificationStatus
    provider_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    cost_usd: Optional[Decimal] = None
    was_failover: bool = False
    original_channel: Optional[str] = None


@dataclass
class ChannelAvailability:
    """Availability status for a notification channel."""
    channel: NotificationChannel
    available: bool
    reason: Optional[str] = None


# =============================================================================
# PHONE NUMBER UTILITIES
# =============================================================================

def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number to international format (+27...).

    Args:
        phone: Phone number in various formats

    Returns:
        Normalized phone number with country code
    """
    # Remove all non-digit characters except +
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')

    # Handle South African number formats
    if cleaned.startswith('0'):
        # Convert 0XX to +27XX
        cleaned = '+27' + cleaned[1:]
    elif cleaned.startswith('27') and not cleaned.startswith('+'):
        # Add + prefix
        cleaned = '+' + cleaned
    elif not cleaned.startswith('+'):
        # Assume South African if no country code
        cleaned = '+27' + cleaned

    return cleaned


def format_whatsapp_number(phone: str) -> str:
    """Format phone number to WhatsApp format (whatsapp:+27...)."""
    normalized = normalize_phone_number(phone)
    return f"whatsapp:{normalized}"


def is_valid_phone_number(phone: str) -> bool:
    """
    Validate phone number format for South African numbers.

    Args:
        phone: Phone number to validate

    Returns:
        True if valid SA phone number format
    """
    normalized = normalize_phone_number(phone)
    # SA mobile numbers: +27 followed by 6, 7, or 8, then 8 more digits
    pattern = r'^\+27[678]\d{8}$'
    return bool(re.match(pattern, normalized))


def is_valid_email(email: str) -> bool:
    """Basic email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# =============================================================================
# CHANNEL AVAILABILITY CHECKS
# =============================================================================

def check_whatsapp_availability(phone: str) -> ChannelAvailability:
    """
    Check if WhatsApp is available for the given phone number.

    Args:
        phone: Recipient phone number

    Returns:
        ChannelAvailability indicating if WhatsApp can be used
    """
    if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER]):
        return ChannelAvailability(
            channel=NotificationChannel.WHATSAPP,
            available=False,
            reason="WhatsApp credentials not configured"
        )

    if not is_valid_phone_number(phone):
        return ChannelAvailability(
            channel=NotificationChannel.WHATSAPP,
            available=False,
            reason="Invalid phone number format"
        )

    return ChannelAvailability(
        channel=NotificationChannel.WHATSAPP,
        available=True
    )


def check_sms_availability(phone: str) -> ChannelAvailability:
    """
    Check if SMS is available for the given phone number.

    Args:
        phone: Recipient phone number

    Returns:
        ChannelAvailability indicating if SMS can be used
    """
    if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER]):
        return ChannelAvailability(
            channel=NotificationChannel.SMS,
            available=False,
            reason="SMS credentials not configured"
        )

    if not is_valid_phone_number(phone):
        return ChannelAvailability(
            channel=NotificationChannel.SMS,
            available=False,
            reason="Invalid phone number format"
        )

    return ChannelAvailability(
        channel=NotificationChannel.SMS,
        available=True
    )


def check_email_availability(email: str) -> ChannelAvailability:
    """
    Check if email is available for the given address.

    Args:
        email: Recipient email address

    Returns:
        ChannelAvailability indicating if email can be used
    """
    if not SENDGRID_API_KEY:
        return ChannelAvailability(
            channel=NotificationChannel.EMAIL,
            available=False,
            reason="SendGrid credentials not configured"
        )

    if not is_valid_email(email):
        return ChannelAvailability(
            channel=NotificationChannel.EMAIL,
            available=False,
            reason="Invalid email format"
        )

    return ChannelAvailability(
        channel=NotificationChannel.EMAIL,
        available=True
    )


# =============================================================================
# CHANNEL SELECTION LOGIC
# =============================================================================

def get_user_preferences(identifier: str) -> Optional[dict]:
    """
    Retrieve user notification preferences from database.

    Args:
        identifier: Phone number or email

    Returns:
        User preferences dict or None if not found
    """
    from .supabase_client import supabase

    if not supabase:
        return None

    try:
        result = supabase.table("notification_preferences")\
            .select("*")\
            .eq("identifier", identifier)\
            .limit(1)\
            .execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    except Exception:
        # If table doesn't exist yet, return None
        return None


def select_channel(
    recipient: str,
    notification_type: NotificationType = NotificationType.APPLICATION_UPDATE,
    email_fallback: Optional[str] = None
) -> Tuple[NotificationChannel, Optional[str]]:
    """
    Select the best notification channel based on:
    1. User preferences (if stored)
    2. Channel availability
    3. Default priority order

    Args:
        recipient: Phone number or email address
        notification_type: Type of notification for priority decisions
        email_fallback: Optional email address for email failover

    Returns:
        Tuple of (selected channel, error message if none available)
    """
    # Determine recipient type
    is_email = is_valid_email(recipient)
    is_phone = is_valid_phone_number(recipient) if not is_email else False

    # If recipient is an email, use email channel directly
    if is_email:
        availability = check_email_availability(recipient)
        if availability.available:
            return NotificationChannel.EMAIL, None
        return None, availability.reason

    # For phone numbers, follow channel priority
    if is_phone:
        # Check user preferences
        preferences = get_user_preferences(recipient)

        if preferences:
            # Use user's preferred channel order
            channel_order = preferences.get("channel_priority", DEFAULT_CHANNEL_PRIORITY)
            # Sort channels by priority (lower number = higher priority)
            sorted_channels = sorted(channel_order.items(), key=lambda x: x[1])
        else:
            # Use default priority based on primary channel config
            if NOTIFICATION_PRIMARY_CHANNEL == "sms":
                sorted_channels = [("sms", 1), ("whatsapp", 2), ("email", 3)]
            else:
                sorted_channels = [("whatsapp", 1), ("sms", 2), ("email", 3)]

        # Try each channel in priority order
        for channel_name, _ in sorted_channels:
            if channel_name == "whatsapp":
                availability = check_whatsapp_availability(recipient)
                if availability.available:
                    # Check user opt-in
                    if preferences and not preferences.get("whatsapp_opt_in", True):
                        continue
                    return NotificationChannel.WHATSAPP, None

            elif channel_name == "sms":
                availability = check_sms_availability(recipient)
                if availability.available:
                    if preferences and not preferences.get("sms_opt_in", True):
                        continue
                    return NotificationChannel.SMS, None

            elif channel_name == "email":
                # For email, need an email address
                email_addr = email_fallback
                if preferences:
                    email_addr = preferences.get("email_address") or email_fallback

                if email_addr:
                    availability = check_email_availability(email_addr)
                    if availability.available:
                        if preferences and not preferences.get("email_opt_in", True):
                            continue
                        return NotificationChannel.EMAIL, None

        return None, "No available channels for recipient"

    return None, "Invalid recipient format (must be phone number or email)"


def get_failover_channel(
    current_channel: NotificationChannel,
    recipient: str,
    email_fallback: Optional[str] = None
) -> Optional[NotificationChannel]:
    """
    Get the next failover channel after a delivery failure.

    Args:
        current_channel: The channel that failed
        recipient: Phone number or email
        email_fallback: Optional email for email failover

    Returns:
        Next channel to try, or None if no more options
    """
    if not NOTIFICATION_FAILOVER_ENABLED:
        return None

    # Failover chain: WhatsApp -> SMS -> Email
    if current_channel == NotificationChannel.WHATSAPP:
        availability = check_sms_availability(recipient)
        if availability.available:
            return NotificationChannel.SMS

        # Try email if SMS not available
        if email_fallback:
            availability = check_email_availability(email_fallback)
            if availability.available:
                return NotificationChannel.EMAIL

    elif current_channel == NotificationChannel.SMS:
        if email_fallback:
            availability = check_email_availability(email_fallback)
            if availability.available:
                return NotificationChannel.EMAIL

    return None


# =============================================================================
# NOTIFICATION DELIVERY
# =============================================================================

async def send_via_whatsapp(phone: str, message: str) -> NotificationResult:
    """
    Send notification via WhatsApp using Twilio.

    Args:
        phone: Recipient phone number
        message: Message content

    Returns:
        NotificationResult with delivery status
    """
    formatted_to = format_whatsapp_number(phone)
    formatted_from = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}" if not TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:") else TWILIO_WHATSAPP_NUMBER

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
    data = {
        "To": formatted_to,
        "From": formatted_from,
        "Body": message
    }

    auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                response_body = await resp.json()

                if 200 <= resp.status < 300:
                    return NotificationResult(
                        success=True,
                        channel="whatsapp",
                        status=NotificationStatus.SENT,
                        provider_message_id=response_body.get("sid"),
                        cost_usd=CHANNEL_COSTS["whatsapp"]
                    )

                return NotificationResult(
                    success=False,
                    channel="whatsapp",
                    status=NotificationStatus.FAILED,
                    error_code=str(response_body.get("code", resp.status)),
                    error_message=response_body.get("message", "Unknown error"),
                    cost_usd=Decimal("0")
                )

    except Exception as e:
        return NotificationResult(
            success=False,
            channel="whatsapp",
            status=NotificationStatus.FAILED,
            error_code="CONNECTION_ERROR",
            error_message=str(e),
            cost_usd=Decimal("0")
        )


async def send_via_sms(phone: str, message: str) -> NotificationResult:
    """
    Send notification via SMS using Twilio.

    Args:
        phone: Recipient phone number
        message: Message content

    Returns:
        NotificationResult with delivery status
    """
    normalized_phone = normalize_phone_number(phone)

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
    data = {
        "To": normalized_phone,
        "From": TWILIO_NUMBER,
        "Body": message
    }

    auth = aiohttp.BasicAuth(TWILIO_SID, TWILIO_AUTH_TOKEN)

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, auth=auth) as resp:
                response_body = await resp.json()

                if 200 <= resp.status < 300:
                    return NotificationResult(
                        success=True,
                        channel="sms",
                        status=NotificationStatus.SENT,
                        provider_message_id=response_body.get("sid"),
                        cost_usd=CHANNEL_COSTS["sms"]
                    )

                return NotificationResult(
                    success=False,
                    channel="sms",
                    status=NotificationStatus.FAILED,
                    error_code=str(response_body.get("code", resp.status)),
                    error_message=response_body.get("message", "Unknown error"),
                    cost_usd=Decimal("0")
                )

    except Exception as e:
        return NotificationResult(
            success=False,
            channel="sms",
            status=NotificationStatus.FAILED,
            error_code="CONNECTION_ERROR",
            error_message=str(e),
            cost_usd=Decimal("0")
        )


async def send_via_email(email: str, subject: str, message: str) -> NotificationResult:
    """
    Send notification via email using SendGrid.

    Args:
        email: Recipient email address
        subject: Email subject
        message: Message content

    Returns:
        NotificationResult with delivery status
    """
    url = "https://api.sendgrid.com/v3/mail/send"

    payload = {
        "personalizations": [
            {"to": [{"email": email}], "subject": subject}
        ],
        "from": {"email": SENDGRID_FROM_EMAIL},
        "content": [{"type": "text/plain", "value": message}],
    }

    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status in [200, 202]:
                    # SendGrid doesn't return message ID in success response
                    # but we can get it from headers
                    message_id = resp.headers.get("X-Message-Id", "unknown")
                    return NotificationResult(
                        success=True,
                        channel="email",
                        status=NotificationStatus.SENT,
                        provider_message_id=message_id,
                        cost_usd=CHANNEL_COSTS["email"]
                    )

                body = await resp.text()
                return NotificationResult(
                    success=False,
                    channel="email",
                    status=NotificationStatus.FAILED,
                    error_code=str(resp.status),
                    error_message=body,
                    cost_usd=Decimal("0")
                )

    except Exception as e:
        return NotificationResult(
            success=False,
            channel="email",
            status=NotificationStatus.FAILED,
            error_code="CONNECTION_ERROR",
            error_message=str(e),
            cost_usd=Decimal("0")
        )


# =============================================================================
# NOTIFICATION LOGGING
# =============================================================================

async def log_notification(
    recipient: str,
    notification_type: str,
    channel: str,
    status: str,
    result: NotificationResult,
    message_preview: str = "",
    priority: str = "normal",
    was_failover: bool = False,
    original_channel: Optional[str] = None,
    applicant_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> Optional[str]:
    """
    Log notification attempt to database.

    Args:
        recipient: Phone number or email
        notification_type: Type of notification
        channel: Channel used
        status: Delivery status
        result: NotificationResult from delivery attempt
        message_preview: First 100 chars of message
        priority: Notification priority
        was_failover: Whether this was a failover attempt
        original_channel: Original channel if failover
        applicant_id: Optional applicant UUID
        metadata: Additional context

    Returns:
        Log entry ID if successful, None otherwise
    """
    if not NOTIFICATION_LOG_ENABLED:
        return None

    from .supabase_client import supabase

    if not supabase:
        return None

    try:
        log_entry = {
            "recipient": recipient,
            "recipient_type": "email" if is_valid_email(recipient) else "phone",
            "notification_type": notification_type,
            "message_preview": message_preview[:100] if message_preview else None,
            "priority": priority,
            "channel": channel,
            "channel_priority": 2 if was_failover else 1,
            "was_failover": was_failover,
            "original_channel": original_channel,
            "status": status,
            "provider_message_id": result.provider_message_id,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "estimated_cost_usd": float(result.cost_usd) if result.cost_usd else None,
            "sent_at": datetime.utcnow().isoformat() if result.success else None,
            "failed_at": datetime.utcnow().isoformat() if not result.success else None,
            "metadata": metadata or {},
        }

        if applicant_id:
            log_entry["applicant_id"] = applicant_id

        db_result = supabase.table("notification_logs").insert(log_entry).execute()

        if db_result.data and len(db_result.data) > 0:
            return db_result.data[0].get("id")

        return None

    except Exception as e:
        # Don't fail the notification if logging fails
        print(f"Warning: Failed to log notification: {e}")
        return None


# =============================================================================
# MAIN ROUTING FUNCTION
# =============================================================================

async def route_notification(
    recipient: str,
    message: str,
    notification_type: NotificationType = NotificationType.APPLICATION_UPDATE,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    subject: str = "One For All Notification",
    email_fallback: Optional[str] = None,
    applicant_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    enable_failover: bool = True
) -> NotificationResult:
    """
    Route a notification through the appropriate channel with failover.

    This is the main entry point for sending notifications. It:
    1. Selects the best channel based on preferences and availability
    2. Attempts delivery on the primary channel
    3. Falls back to secondary channels on failure (if enabled)
    4. Logs all delivery attempts

    Args:
        recipient: Phone number or email address
        message: Message content
        notification_type: Type of notification for routing decisions
        priority: Priority level affecting retry behavior
        subject: Email subject (used if email channel selected)
        email_fallback: Optional email address for email failover
        applicant_id: Optional applicant UUID for logging
        metadata: Additional context for logging

    Returns:
        NotificationResult with final delivery status
    """
    # Select primary channel
    channel, error = select_channel(recipient, notification_type, email_fallback)

    if channel is None:
        return NotificationResult(
            success=False,
            channel="none",
            status=NotificationStatus.FAILED,
            error_code="NO_CHANNEL",
            error_message=error or "No available channel"
        )

    original_channel = channel.value
    was_failover = False

    # Attempt delivery with failover
    while channel:
        # Send via selected channel
        if channel == NotificationChannel.WHATSAPP:
            result = await send_via_whatsapp(recipient, message)
        elif channel == NotificationChannel.SMS:
            result = await send_via_sms(recipient, message)
        elif channel == NotificationChannel.EMAIL:
            email_addr = recipient if is_valid_email(recipient) else email_fallback
            if email_addr:
                result = await send_via_email(email_addr, subject, message)
            else:
                result = NotificationResult(
                    success=False,
                    channel="email",
                    status=NotificationStatus.FAILED,
                    error_code="NO_EMAIL",
                    error_message="No email address available"
                )
        else:
            result = NotificationResult(
                success=False,
                channel=channel.value,
                status=NotificationStatus.FAILED,
                error_code="UNKNOWN_CHANNEL",
                error_message=f"Unknown channel: {channel}"
            )

        # Update result with failover info
        result.was_failover = was_failover
        result.original_channel = original_channel if was_failover else None

        # Log the attempt
        await log_notification(
            recipient=recipient,
            notification_type=notification_type.value,
            channel=result.channel,
            status=result.status.value,
            result=result,
            message_preview=message,
            priority=priority.value,
            was_failover=was_failover,
            original_channel=original_channel if was_failover else None,
            applicant_id=applicant_id,
            metadata=metadata
        )

        # If successful or failover disabled, return result
        if result.success or not enable_failover or not NOTIFICATION_FAILOVER_ENABLED:
            return result

        # Get next failover channel
        next_channel = get_failover_channel(channel, recipient, email_fallback)
        if next_channel is None:
            return result  # No more channels to try

        channel = next_channel
        was_failover = True

    return result


def route_notification_sync(
    recipient: str,
    message: str,
    notification_type: NotificationType = NotificationType.APPLICATION_UPDATE,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    subject: str = "One For All Notification",
    email_fallback: Optional[str] = None,
    applicant_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    enable_failover: bool = True
) -> NotificationResult:
    """
    Synchronous wrapper for route_notification.

    Use this from non-async contexts (like CrewAI tools).
    """
    return asyncio.run(route_notification(
        recipient=recipient,
        message=message,
        notification_type=notification_type,
        priority=priority,
        subject=subject,
        email_fallback=email_fallback,
        applicant_id=applicant_id,
        metadata=metadata,
        enable_failover=enable_failover
    ))
