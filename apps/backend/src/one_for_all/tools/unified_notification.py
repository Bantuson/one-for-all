"""
Unified Notification Tool

Single entry point for all notifications with smart channel routing.
Provides CrewAI-compatible tools that internally use the notification router.

Primary channel: WhatsApp (80%) - $0.005/msg
Fallback: SMS (15%) - $0.04/msg
Archive: Email (5%) - $0.001/msg

SECURITY:
- OTP sends are rate limited to 3 per 15 minutes per phone number (CWE-307)
- Prevents SMS/email spam and cost abuse
- Uses in-memory rate limiting for tool-level protection
"""

import asyncio
from typing import Optional

from crewai.tools import tool

from .notification_router import (
    NotificationType,
    NotificationPriority,
    NotificationResult,
    route_notification,
    normalize_phone_number,
    is_valid_phone_number,
    is_valid_email,
)
from .otp_store import generate_otp, store_otp
from ..utils.db_audit import audit_service_role_access

# Import rate limiter for OTP protection
from one_for_all.utils.rate_limit import tool_limiter, ToolRateLimits, check_tool_rate_limit


# =============================================================================
# MAIN NOTIFICATION TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="insert")
@tool
def send_notification(
    recipient: str,
    message: str,
    notification_type: str = "application_update",
    priority: str = "normal",
    subject: str = "One For All Notification",
    email_fallback: str = "",
    applicant_id: str = ""
) -> str:
    """
    Send a notification via the optimal channel (WhatsApp > SMS > Email).

    Automatically routes through the best available channel based on:
    - User preferences (if stored)
    - Channel availability
    - Notification type and priority

    Includes automatic failover if primary channel fails.

    Args:
        recipient: Phone number (SA format: 0821234567 or +27821234567) or email address
        message: The notification message content
        notification_type: Type of notification - 'otp', 'application_update', 'reminder', 'marketing'
        priority: Priority level - 'high', 'normal', 'low'
        subject: Email subject line (used if email channel is selected)
        email_fallback: Optional email address for failover if phone delivery fails
        applicant_id: Optional applicant UUID for logging and tracking

    Returns:
        Success message with channel used and delivery status, or error details
    """
    async def async_logic():
        # Map string to enum
        type_map = {
            "otp": NotificationType.OTP,
            "application_update": NotificationType.APPLICATION_UPDATE,
            "reminder": NotificationType.REMINDER,
            "marketing": NotificationType.MARKETING,
        }
        priority_map = {
            "high": NotificationPriority.HIGH,
            "normal": NotificationPriority.NORMAL,
            "low": NotificationPriority.LOW,
        }

        notif_type = type_map.get(notification_type.lower(), NotificationType.APPLICATION_UPDATE)
        notif_priority = priority_map.get(priority.lower(), NotificationPriority.NORMAL)

        result = await route_notification(
            recipient=recipient,
            message=message,
            notification_type=notif_type,
            priority=notif_priority,
            subject=subject,
            email_fallback=email_fallback if email_fallback else None,
            applicant_id=applicant_id if applicant_id else None,
        )

        if result.success:
            response = f"Notification sent via {result.channel.upper()}"
            if result.provider_message_id:
                response += f". ID: {result.provider_message_id}"
            if result.was_failover:
                response += f" (failover from {result.original_channel})"
            if result.cost_usd:
                response += f". Cost: ${result.cost_usd}"
            return response
        else:
            response = f"Notification failed via {result.channel.upper()}"
            if result.error_code:
                response += f". Error [{result.error_code}]: {result.error_message}"
            if result.was_failover:
                response += f". All channels exhausted (started with {result.original_channel})"
            return response

    return asyncio.run(async_logic())


# =============================================================================
# OTP NOTIFICATION TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="insert")
@tool
def send_otp_notification(phone_number: str, email_fallback: str = "") -> str:
    """
    Generate and send an OTP via the optimal channel.

    Generates a 6-digit OTP, stores it in the database, and sends via
    WhatsApp (primary) with SMS/Email failover.

    This is the recommended way to send OTPs as it:
    - Uses WhatsApp for cost efficiency ($0.005 vs $0.04 for SMS)
    - Automatically falls back to SMS if WhatsApp fails
    - Can fall back to email if phone delivery fails

    SECURITY: Rate limited to 3 OTPs per 15 minutes per phone number
    to prevent spam and brute force attacks (CWE-307).

    Args:
        phone_number: Recipient phone number (SA format: 0821234567 or +27821234567)
        email_fallback: Optional email address for failover

    Returns:
        Success message with channel used, or error details
    """
    async def async_logic():
        # Validate phone number
        if not is_valid_phone_number(phone_number):
            return f"ERROR: Invalid phone number format: {phone_number}"

        # Normalize phone for consistent rate limiting
        normalized_phone = normalize_phone_number(phone_number)

        # SECURITY: Check rate limit before expensive OTP generation/sending
        allowed, error_msg = check_tool_rate_limit(
            identifier=normalized_phone,
            action="otp_send",
            config=ToolRateLimits.OTP_SEND
        )
        if not allowed:
            return error_msg

        # Generate and store OTP
        otp = generate_otp()

        if not store_otp(identifier=normalized_phone, channel="multi", code=otp):
            return f"Failed to store OTP for {phone_number}. Notification not sent."

        # Compose OTP message
        message = (
            f"Your One For All verification code is: {otp}\n\n"
            "This code expires in 10 minutes. Do not share this code with anyone."
        )

        # Route through notification system with high priority
        result = await route_notification(
            recipient=phone_number,
            message=message,
            notification_type=NotificationType.OTP,
            priority=NotificationPriority.HIGH,
            subject="Your One For All OTP Code",
            email_fallback=email_fallback if email_fallback else None,
            metadata={"otp_sent": True}
        )

        if result.success:
            response = f"OTP sent to {phone_number} via {result.channel.upper()}"
            if result.was_failover:
                response += f" (failover from {result.original_channel})"
            response += ". Code expires in 10 minutes."
            return response
        else:
            return f"Failed to send OTP: [{result.error_code}] {result.error_message}"

    return asyncio.run(async_logic())


# =============================================================================
# APPLICATION UPDATE NOTIFICATION TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="insert")
@tool
def send_application_update(
    phone_number: str,
    application_id: str,
    status: str,
    institution: str = "",
    additional_info: str = "",
    email_fallback: str = ""
) -> str:
    """
    Send an application status update notification.

    Notifies applicants about changes to their application status via
    the optimal channel (WhatsApp preferred for cost efficiency).

    Args:
        phone_number: Recipient phone number
        application_id: The application reference ID
        status: New application status (e.g., 'submitted', 'under_review', 'accepted', 'rejected')
        institution: Institution name (optional)
        additional_info: Any additional details to include
        email_fallback: Optional email for failover

    Returns:
        Success message with channel used, or error details
    """
    async def async_logic():
        # Compose status update message
        status_display = status.replace("_", " ").title()

        if institution:
            message = f"Application Update - {institution}\n\n"
        else:
            message = "Application Update\n\n"

        message += f"Your application ({application_id}) status: {status_display}\n"

        if additional_info:
            message += f"\n{additional_info}\n"

        message += "\nLog in to One For All for more details."

        # Route through notification system
        result = await route_notification(
            recipient=phone_number,
            message=message,
            notification_type=NotificationType.APPLICATION_UPDATE,
            priority=NotificationPriority.NORMAL,
            subject=f"Application Update: {status_display}",
            email_fallback=email_fallback if email_fallback else None,
            metadata={
                "application_id": application_id,
                "status": status,
                "institution": institution
            }
        )

        if result.success:
            response = f"Application update sent via {result.channel.upper()}"
            if result.provider_message_id:
                response += f". ID: {result.provider_message_id}"
            return response
        else:
            return f"Failed to send update: [{result.error_code}] {result.error_message}"

    return asyncio.run(async_logic())


# =============================================================================
# REMINDER NOTIFICATION TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="insert")
@tool
def send_reminder(
    phone_number: str,
    reminder_type: str,
    deadline: str = "",
    action_required: str = "",
    email_fallback: str = ""
) -> str:
    """
    Send a reminder notification to an applicant.

    Used for deadline reminders, document submission reminders, etc.
    Lower priority than OTPs and application updates.

    Args:
        phone_number: Recipient phone number
        reminder_type: Type of reminder (e.g., 'document_deadline', 'application_deadline', 'payment_due')
        deadline: Deadline date/time if applicable
        action_required: What action the user needs to take
        email_fallback: Optional email for failover

    Returns:
        Success message with channel used, or error details
    """
    async def async_logic():
        # Compose reminder message
        reminder_display = reminder_type.replace("_", " ").title()
        message = f"Reminder: {reminder_display}\n\n"

        if deadline:
            message += f"Deadline: {deadline}\n"

        if action_required:
            message += f"Action Required: {action_required}\n"

        message += "\nLog in to One For All to complete this action."

        # Route through notification system with lower priority
        result = await route_notification(
            recipient=phone_number,
            message=message,
            notification_type=NotificationType.REMINDER,
            priority=NotificationPriority.LOW,
            subject=f"Reminder: {reminder_display}",
            email_fallback=email_fallback if email_fallback else None,
            metadata={
                "reminder_type": reminder_type,
                "deadline": deadline
            }
        )

        if result.success:
            return f"Reminder sent via {result.channel.upper()}"
        else:
            return f"Failed to send reminder: [{result.error_code}] {result.error_message}"

    return asyncio.run(async_logic())


# =============================================================================
# BATCH NOTIFICATION TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="insert")
@tool
def send_batch_notifications(
    recipients_json: str,
    message: str,
    notification_type: str = "application_update"
) -> str:
    """
    Send the same notification to multiple recipients.

    Useful for announcements or bulk status updates.
    Processes recipients sequentially to avoid rate limiting.

    Args:
        recipients_json: JSON array of recipient phone numbers, e.g., '["0821234567", "0831234567"]'
        message: The notification message content
        notification_type: Type of notification - 'application_update', 'reminder', 'marketing'

    Returns:
        Summary of delivery results (success/failure counts)
    """
    import json

    async def async_logic():
        try:
            recipients = json.loads(recipients_json)
            if not isinstance(recipients, list):
                return "ERROR: recipients_json must be a JSON array of phone numbers"
        except json.JSONDecodeError:
            return "ERROR: Invalid JSON format for recipients"

        if len(recipients) == 0:
            return "ERROR: No recipients provided"

        if len(recipients) > 100:
            return "ERROR: Maximum 100 recipients per batch"

        # Map notification type
        type_map = {
            "application_update": NotificationType.APPLICATION_UPDATE,
            "reminder": NotificationType.REMINDER,
            "marketing": NotificationType.MARKETING,
        }
        notif_type = type_map.get(notification_type.lower(), NotificationType.APPLICATION_UPDATE)

        # Process each recipient
        success_count = 0
        failure_count = 0
        channels_used = {"whatsapp": 0, "sms": 0, "email": 0}

        for recipient in recipients:
            result = await route_notification(
                recipient=recipient,
                message=message,
                notification_type=notif_type,
                priority=NotificationPriority.LOW,  # Batch = lower priority
            )

            if result.success:
                success_count += 1
                channels_used[result.channel] = channels_used.get(result.channel, 0) + 1
            else:
                failure_count += 1

            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)

        # Build summary
        total = len(recipients)
        summary = f"Batch complete: {success_count}/{total} delivered, {failure_count} failed\n"
        summary += f"Channels: WhatsApp={channels_used['whatsapp']}, SMS={channels_used['sms']}, Email={channels_used['email']}"

        return summary

    return asyncio.run(async_logic())


# =============================================================================
# NOTIFICATION STATUS CHECK TOOL
# =============================================================================

@audit_service_role_access(table="notification_logs", operation="select")
@tool
def get_notification_stats(recipient: str = "", days: int = 7) -> str:
    """
    Get notification delivery statistics.

    Args:
        recipient: Optional - filter by recipient phone/email. Leave empty for overall stats.
        days: Number of days to look back (default 7)

    Returns:
        Summary of notification delivery statistics
    """
    from .supabase_client import supabase

    if not supabase:
        return "ERROR: Database not configured"

    try:
        from datetime import datetime, timedelta

        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Build query
        query = supabase.table("notification_logs")\
            .select("channel, status, estimated_cost_usd")\
            .gte("created_at", cutoff)

        if recipient:
            query = query.eq("recipient", recipient)

        result = query.execute()

        if not result.data:
            return f"No notifications found in the last {days} days"

        # Aggregate stats
        total = len(result.data)
        by_channel = {}
        by_status = {}
        total_cost = 0.0

        for row in result.data:
            channel = row.get("channel", "unknown")
            status = row.get("status", "unknown")
            cost = row.get("estimated_cost_usd") or 0

            by_channel[channel] = by_channel.get(channel, 0) + 1
            by_status[status] = by_status.get(status, 0) + 1
            total_cost += float(cost)

        # Build response
        lines = [f"Notification Stats (last {days} days):"]
        lines.append(f"Total: {total}")
        lines.append(f"By Channel: {by_channel}")
        lines.append(f"By Status: {by_status}")
        lines.append(f"Total Cost: ${total_cost:.4f}")

        delivered = by_status.get("delivered", 0) + by_status.get("sent", 0)
        if total > 0:
            delivery_rate = (delivered / total) * 100
            lines.append(f"Delivery Rate: {delivery_rate:.1f}%")

        return "\n".join(lines)

    except Exception as e:
        return f"ERROR: Failed to get stats: {str(e)}"


# =============================================================================
# UPDATE USER NOTIFICATION PREFERENCES TOOL
# =============================================================================

@audit_service_role_access(table="notification_preferences", operation="upsert")
@tool
def update_notification_preferences(
    identifier: str,
    preferred_channel: str = "whatsapp",
    whatsapp_opt_in: str = "true",
    sms_opt_in: str = "true",
    email_opt_in: str = "true",
    email_address: str = ""
) -> str:
    """
    Update notification preferences for a user.

    Allows users to set their preferred notification channel and opt-in/out
    of specific channels.

    Args:
        identifier: Phone number or email that identifies the user
        preferred_channel: Preferred channel - 'whatsapp', 'sms', 'email'
        whatsapp_opt_in: Whether to receive WhatsApp notifications - 'true' or 'false'
        sms_opt_in: Whether to receive SMS notifications - 'true' or 'false'
        email_opt_in: Whether to receive email notifications - 'true' or 'false'
        email_address: Optional email address for email notifications

    Returns:
        Confirmation of updated preferences
    """
    from .supabase_client import supabase

    if not supabase:
        return "ERROR: Database not configured"

    try:
        # Determine identifier type
        identifier_type = "email" if is_valid_email(identifier) else "phone"

        # Build channel priority based on preferred channel
        if preferred_channel == "sms":
            channel_priority = {"sms": 1, "whatsapp": 2, "email": 3}
        elif preferred_channel == "email":
            channel_priority = {"email": 1, "whatsapp": 2, "sms": 3}
        else:  # default to whatsapp
            channel_priority = {"whatsapp": 1, "sms": 2, "email": 3}

        # Prepare data
        data = {
            "identifier": identifier,
            "identifier_type": identifier_type,
            "preferred_channel": preferred_channel,
            "channel_priority": channel_priority,
            "whatsapp_opt_in": whatsapp_opt_in.lower() == "true",
            "sms_opt_in": sms_opt_in.lower() == "true",
            "email_opt_in": email_opt_in.lower() == "true",
        }

        if email_address:
            data["email_address"] = email_address

        # Upsert preferences
        result = supabase.table("notification_preferences")\
            .upsert(data, on_conflict="identifier")\
            .execute()

        if result.data:
            return f"Notification preferences updated for {identifier}. Preferred channel: {preferred_channel}"
        else:
            return f"Failed to update preferences for {identifier}"

    except Exception as e:
        return f"ERROR: Failed to update preferences: {str(e)}"
