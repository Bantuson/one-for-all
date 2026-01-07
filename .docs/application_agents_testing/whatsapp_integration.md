# WhatsApp Integration Guide

This document covers the Twilio WhatsApp Business API setup, environment configuration, tool implementation, and webhook design for the application agents.

---

## Table of Contents

1. [Overview](#overview)
2. [Twilio WhatsApp Business API Setup](#twilio-whatsapp-business-api-setup)
3. [Environment Variables](#environment-variables)
4. [Tool Implementation](#tool-implementation)
5. [Webhook Endpoint Design](#webhook-endpoint-design)
6. [Message Templates](#message-templates)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)

---

## Overview

### Architecture

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|    WhatsApp      |<--->|     Twilio       |<--->|   Backend API    |
|    User          |     |  WhatsApp API    |     |   (CrewAI)       |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                         |
                                                         v
                                                 +------------------+
                                                 |                  |
                                                 |    Supabase      |
                                                 |    Database      |
                                                 |                  |
                                                 +------------------+
```

### Message Flow

1. User sends WhatsApp message
2. Twilio receives and forwards to webhook
3. Backend processes message
4. CrewAI agent generates response
5. Backend sends response via Twilio API
6. User receives WhatsApp message

---

## Twilio WhatsApp Business API Setup

### Step 1: Create Twilio Account

1. Sign up at [twilio.com](https://www.twilio.com)
2. Verify email and phone number
3. Complete account setup

### Step 2: Access WhatsApp Sandbox (Development)

1. Navigate to **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Save the sandbox number: `+1 415 523 8886` (or your assigned number)
3. Note the join code (e.g., `join <your-code>`)

### Step 3: Configure Sandbox

1. Go to **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
2. Set webhook URLs:
   - **When a message comes in**: `https://your-domain.com/api/webhooks/whatsapp/incoming`
   - **Status callback URL**: `https://your-domain.com/api/webhooks/whatsapp/status`
3. Set HTTP method to `POST`

### Step 4: Production Setup (WhatsApp Business API)

For production, you need:

1. **Facebook Business Manager Account**
2. **WhatsApp Business Account**
3. **Twilio WhatsApp Sender**

#### Process:

1. Apply for WhatsApp Business API via Twilio
2. Connect Facebook Business Manager
3. Submit business verification documents
4. Create WhatsApp Business Profile
5. Register phone number
6. Get approved message templates

### Step 5: Get API Credentials

1. Go to **Account** > **API keys & tokens**
2. Note your:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Get your WhatsApp number SID from **Phone Numbers** > **Manage** > **Active Numbers**

---

## Environment Variables

Add the following to `/home/mzansi_agentive/projects/portfolio/.env.local`:

```bash
# =============================================================================
# TWILIO WHATSAPP CONFIGURATION
# =============================================================================

# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WhatsApp Sender Number (E.164 format)
# Sandbox: whatsapp:+14155238886
# Production: whatsapp:+27xxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Webhook Configuration
TWILIO_WEBHOOK_URL=https://your-domain.com/api/webhooks/whatsapp
TWILIO_STATUS_CALLBACK_URL=https://your-domain.com/api/webhooks/whatsapp/status

# Webhook Authentication (optional but recommended)
TWILIO_WEBHOOK_AUTH_TOKEN=your-secure-webhook-token

# Message Templates (Production)
TWILIO_OTP_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WELCOME_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CONFIRMATION_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Rate Limiting
WHATSAPP_RATE_LIMIT_PER_MINUTE=60
WHATSAPP_RATE_LIMIT_PER_DAY=1000

# Development/Testing
WHATSAPP_SANDBOX_MODE=true
WHATSAPP_LOG_MESSAGES=true
```

### Environment Variable Descriptions

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | Yes |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender number with `whatsapp:` prefix | Yes |
| `TWILIO_WEBHOOK_URL` | URL for incoming message webhooks | Yes |
| `TWILIO_STATUS_CALLBACK_URL` | URL for message status updates | No |
| `TWILIO_WEBHOOK_AUTH_TOKEN` | Secret for webhook validation | Recommended |
| `WHATSAPP_SANDBOX_MODE` | Enable sandbox mode for testing | Dev only |

---

## Tool Implementation

### WhatsApp Tools Location

Create tools in `apps/backend/src/one_for_all/tools/whatsapp/`

### Tool 1: send_whatsapp_message

```python
# apps/backend/src/one_for_all/tools/whatsapp/send_message.py

import asyncio
from pathlib import Path
from crewai.tools import tool
from twilio.rest import Client
from dotenv import load_dotenv
import os

# Load environment variables from root
load_dotenv(dotenv_path=Path(__file__).resolve().parents[6] / '.env.local')

@tool
def send_whatsapp_message(to_number: str, message: str) -> str:
    """
    Send a WhatsApp message to a user.

    Args:
        to_number: The recipient's WhatsApp number in E.164 format (e.g., +27821234567)
        message: The message content to send (max 4096 characters)

    Returns:
        Message SID if successful, error message if failed
    """
    async def async_send():
        try:
            # Initialize Twilio client
            client = Client(
                os.getenv('TWILIO_ACCOUNT_SID'),
                os.getenv('TWILIO_AUTH_TOKEN')
            )

            # Format numbers
            from_number = os.getenv('TWILIO_WHATSAPP_NUMBER')
            to_whatsapp = f"whatsapp:{to_number}" if not to_number.startswith('whatsapp:') else to_number

            # Send message
            twilio_message = client.messages.create(
                body=message[:4096],  # WhatsApp message limit
                from_=from_number,
                to=to_whatsapp,
                status_callback=os.getenv('TWILIO_STATUS_CALLBACK_URL')
            )

            return f"Message sent successfully. SID: {twilio_message.sid}"

        except Exception as e:
            return f"Failed to send message: {str(e)}"

    return asyncio.run(async_send())
```

### Tool 2: send_whatsapp_otp

```python
# apps/backend/src/one_for_all/tools/whatsapp/send_otp.py

import asyncio
import secrets
from pathlib import Path
from datetime import datetime, timedelta
from crewai.tools import tool
from twilio.rest import Client
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parents[6] / '.env.local')

@tool
def send_whatsapp_otp(to_number: str, applicant_id: str) -> str:
    """
    Generate and send an OTP via WhatsApp for identity verification.

    Args:
        to_number: The recipient's WhatsApp number in E.164 format
        applicant_id: The applicant's database ID

    Returns:
        Success message with OTP details or error message
    """
    async def async_send_otp():
        try:
            # Generate 6-digit OTP
            otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
            otp_expires = datetime.utcnow() + timedelta(minutes=5)

            # Initialize clients
            twilio_client = Client(
                os.getenv('TWILIO_ACCOUNT_SID'),
                os.getenv('TWILIO_AUTH_TOKEN')
            )

            supabase = create_client(
                os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            )

            # Store OTP in database
            await supabase.table('applicant_accounts').update({
                'otp_code': otp_code,
                'otp_expires_at': otp_expires.isoformat(),
                'otp_attempts': 0,
                'otp_locked_until': None
            }).eq('id', applicant_id).execute()

            # Format message
            message = f"Your One For All verification code is: {otp_code}\n\nThis code expires in 5 minutes. Do not share this code with anyone."

            # Send via WhatsApp
            from_number = os.getenv('TWILIO_WHATSAPP_NUMBER')
            to_whatsapp = f"whatsapp:{to_number}" if not to_number.startswith('whatsapp:') else to_number

            twilio_message = twilio_client.messages.create(
                body=message,
                from_=from_number,
                to=to_whatsapp
            )

            return f"OTP sent successfully to {to_number[-4:].rjust(len(to_number), '*')}. Expires in 5 minutes."

        except Exception as e:
            return f"Failed to send OTP: {str(e)}"

    return asyncio.run(async_send_otp())
```

### Tool 3: verify_whatsapp_otp

```python
# apps/backend/src/one_for_all/tools/whatsapp/verify_otp.py

import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from crewai.tools import tool
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parents[6] / '.env.local')

@tool
def verify_whatsapp_otp(applicant_id: str, otp_code: str) -> str:
    """
    Verify an OTP submitted by the user.

    Args:
        applicant_id: The applicant's database ID
        otp_code: The 6-digit OTP provided by the user

    Returns:
        Verification result: success, invalid, expired, or locked
    """
    async def async_verify():
        try:
            supabase = create_client(
                os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            )

            # Get applicant record
            result = await supabase.table('applicant_accounts').select(
                'otp_code, otp_expires_at, otp_attempts, otp_locked_until'
            ).eq('id', applicant_id).single().execute()

            if not result.data:
                return "Error: Applicant not found"

            applicant = result.data
            now = datetime.utcnow()

            # Check if locked
            if applicant.get('otp_locked_until'):
                locked_until = datetime.fromisoformat(applicant['otp_locked_until'].replace('Z', '+00:00'))
                if now < locked_until:
                    minutes_left = int((locked_until - now).total_seconds() / 60)
                    return f"Account locked. Try again in {minutes_left} minutes."

            # Check if expired
            if applicant.get('otp_expires_at'):
                expires_at = datetime.fromisoformat(applicant['otp_expires_at'].replace('Z', '+00:00'))
                if now > expires_at:
                    return "OTP expired. Please request a new code."

            # Verify OTP
            if applicant.get('otp_code') == otp_code:
                # Success - clear OTP and mark verified
                await supabase.table('applicant_accounts').update({
                    'otp_code': None,
                    'otp_expires_at': None,
                    'otp_attempts': 0,
                    'whatsapp_verified': True,
                    'whatsapp_verified_at': now.isoformat()
                }).eq('id', applicant_id).execute()

                return "OTP verified successfully. Identity confirmed."
            else:
                # Invalid OTP - increment attempts
                attempts = (applicant.get('otp_attempts') or 0) + 1

                update_data = {'otp_attempts': attempts}

                if attempts >= 3:
                    # Lock for 15 minutes
                    lock_until = now + timedelta(minutes=15)
                    update_data['otp_locked_until'] = lock_until.isoformat()
                    update_data['otp_code'] = None
                    update_data['otp_expires_at'] = None

                    await supabase.table('applicant_accounts').update(update_data).eq('id', applicant_id).execute()
                    return "Too many incorrect attempts. Account locked for 15 minutes."

                await supabase.table('applicant_accounts').update(update_data).eq('id', applicant_id).execute()
                return f"Invalid OTP. {3 - attempts} attempts remaining."

        except Exception as e:
            return f"Verification error: {str(e)}"

    return asyncio.run(async_verify())
```

### Tool 4: get_whatsapp_conversation_history

```python
# apps/backend/src/one_for_all/tools/whatsapp/conversation_history.py

import asyncio
from pathlib import Path
from crewai.tools import tool
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parents[6] / '.env.local')

@tool
def get_whatsapp_conversation_history(applicant_id: str, limit: int = 20) -> str:
    """
    Retrieve recent WhatsApp conversation history for an applicant.

    Args:
        applicant_id: The applicant's database ID
        limit: Maximum number of messages to retrieve (default 20)

    Returns:
        JSON string of conversation messages or error message
    """
    async def async_get_history():
        try:
            supabase = create_client(
                os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
                os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            )

            result = await supabase.table('whatsapp_messages').select(
                'id, direction, message_body, status, created_at'
            ).eq('applicant_id', applicant_id).order(
                'created_at', desc=True
            ).limit(limit).execute()

            if not result.data:
                return "No conversation history found"

            # Format messages
            messages = []
            for msg in reversed(result.data):
                direction = "User" if msg['direction'] == 'incoming' else "Bot"
                messages.append(f"[{msg['created_at']}] {direction}: {msg['message_body']}")

            return "\n".join(messages)

        except Exception as e:
            return f"Error retrieving history: {str(e)}"

    return asyncio.run(async_get_history())
```

---

## Webhook Endpoint Design

### Incoming Message Webhook

```python
# apps/backend/src/one_for_all/api/webhooks/whatsapp.py

from fastapi import APIRouter, Request, HTTPException, Response
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/webhooks/whatsapp/incoming")
async def handle_incoming_whatsapp(request: Request):
    """
    Handle incoming WhatsApp messages from Twilio.

    Twilio sends:
    - MessageSid: Unique message identifier
    - From: Sender's WhatsApp number (whatsapp:+27...)
    - To: Your WhatsApp number
    - Body: Message content
    - NumMedia: Number of media files
    - MediaUrl0, MediaUrl1, etc.: Media file URLs
    """
    try:
        # Validate Twilio signature (production)
        if not os.getenv('WHATSAPP_SANDBOX_MODE', 'false').lower() == 'true':
            validator = RequestValidator(os.getenv('TWILIO_AUTH_TOKEN'))
            form_data = await request.form()

            signature = request.headers.get('X-Twilio-Signature', '')
            url = str(request.url)

            if not validator.validate(url, dict(form_data), signature):
                logger.warning("Invalid Twilio signature")
                raise HTTPException(status_code=403, detail="Invalid signature")

        # Parse incoming data
        form_data = await request.form()

        message_sid = form_data.get('MessageSid')
        from_number = form_data.get('From', '').replace('whatsapp:', '')
        to_number = form_data.get('To', '').replace('whatsapp:', '')
        body = form_data.get('Body', '')
        num_media = int(form_data.get('NumMedia', 0))

        logger.info(f"Received WhatsApp from {from_number}: {body[:50]}...")

        # Store message in database
        await store_incoming_message(
            message_sid=message_sid,
            from_number=from_number,
            body=body,
            num_media=num_media
        )

        # Process message with CrewAI
        response_text = await process_with_agent(from_number, body)

        # Send response
        twiml_response = MessagingResponse()
        twiml_response.message(response_text)

        return Response(
            content=str(twiml_response),
            media_type="application/xml"
        )

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        # Return empty TwiML to acknowledge receipt
        return Response(
            content=str(MessagingResponse()),
            media_type="application/xml"
        )


@router.post("/webhooks/whatsapp/status")
async def handle_status_callback(request: Request):
    """
    Handle message status callbacks from Twilio.

    Twilio sends status updates:
    - MessageSid: The message identifier
    - MessageStatus: queued, sent, delivered, read, failed, undelivered
    - ErrorCode: Error code if failed
    - ErrorMessage: Error description if failed
    """
    try:
        form_data = await request.form()

        message_sid = form_data.get('MessageSid')
        status = form_data.get('MessageStatus')
        error_code = form_data.get('ErrorCode')
        error_message = form_data.get('ErrorMessage')

        logger.info(f"Message {message_sid} status: {status}")

        # Update message status in database
        await update_message_status(
            message_sid=message_sid,
            status=status,
            error_code=error_code,
            error_message=error_message
        )

        return Response(status_code=200)

    except Exception as e:
        logger.error(f"Status callback error: {str(e)}")
        return Response(status_code=200)  # Always acknowledge


async def store_incoming_message(message_sid: str, from_number: str, body: str, num_media: int):
    """Store incoming message in Supabase."""
    from supabase import create_client

    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )

    # Find or create applicant
    result = await supabase.table('applicant_accounts').select('id').eq(
        'whatsapp_number', from_number
    ).single().execute()

    applicant_id = result.data['id'] if result.data else None

    # Store message
    await supabase.table('whatsapp_messages').insert({
        'message_sid': message_sid,
        'applicant_id': applicant_id,
        'from_number': from_number,
        'direction': 'incoming',
        'message_body': body,
        'num_media': num_media,
        'status': 'received'
    }).execute()


async def update_message_status(message_sid: str, status: str, error_code: str = None, error_message: str = None):
    """Update message status in Supabase."""
    from supabase import create_client

    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )

    update_data = {'status': status}
    if error_code:
        update_data['error_code'] = error_code
        update_data['error_message'] = error_message

    await supabase.table('whatsapp_messages').update(update_data).eq(
        'message_sid', message_sid
    ).execute()


async def process_with_agent(from_number: str, message: str) -> str:
    """Process message with CrewAI agent and return response."""
    # This would integrate with the CrewAI workflow
    # Placeholder implementation
    from one_for_all.crew import OneForAllCrew

    crew = OneForAllCrew()
    result = crew.kickoff(inputs={
        'whatsapp_number': from_number,
        'user_message': message
    })

    return str(result)
```

### WhatsApp Messages Table Migration

```sql
-- Migration: create_whatsapp_messages_table
-- Description: Store WhatsApp message history

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_sid VARCHAR(50) UNIQUE,
    applicant_id UUID REFERENCES applicant_accounts(id),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    direction VARCHAR(10) CHECK (direction IN ('incoming', 'outgoing')),
    message_body TEXT,
    num_media INTEGER DEFAULT 0,
    media_urls JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    error_code VARCHAR(20),
    error_message TEXT,
    agent_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_whatsapp_messages_applicant ON whatsapp_messages(applicant_id);
CREATE INDEX idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
```

---

## Message Templates

### Production Templates (Pre-approved)

For production, you need Twilio-approved message templates:

#### OTP Template

```
Template Name: ofa_otp_verification
Content: Your One For All verification code is: {{1}}. This code expires in 5 minutes.
Variables: 1 (OTP code)
```

#### Welcome Template

```
Template Name: ofa_welcome
Content: Welcome to One For All! I'm here to help you with your university application. Reply with "start" to begin.
Variables: None
```

#### Application Confirmation Template

```
Template Name: ofa_application_confirmed
Content: Great news! Your application to {{1}} for {{2}} has been submitted successfully. Reference: {{3}}
Variables: 3 (institution, programme, reference)
```

### Using Templates in Code

```python
# Send template message
def send_template_message(to_number: str, template_sid: str, variables: list):
    client = Client(
        os.getenv('TWILIO_ACCOUNT_SID'),
        os.getenv('TWILIO_AUTH_TOKEN')
    )

    message = client.messages.create(
        from_=os.getenv('TWILIO_WHATSAPP_NUMBER'),
        to=f"whatsapp:{to_number}",
        content_sid=template_sid,
        content_variables=json.dumps({str(i+1): v for i, v in enumerate(variables)})
    )

    return message.sid
```

---

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| 21408 | Permission denied | Check account permissions |
| 21610 | Unsubscribed recipient | User opted out |
| 21614 | Invalid To number | Verify number format |
| 63001 | Rate limit exceeded | Implement backoff |
| 63007 | Template not approved | Use approved template |
| 63016 | User not opted in | Request opt-in first |

### Retry Strategy

```python
import time
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    time.sleep(delay)
        return wrapper
    return decorator

@retry_with_backoff(max_retries=3)
def send_message_with_retry(to_number: str, message: str):
    # Send message implementation
    pass
```

---

## Testing Guide

### Sandbox Testing

1. **Join Sandbox**:
   - Send `join <your-code>` to the Twilio sandbox number
   - Example: `join healthy-mouse` to `+1 415 523 8886`

2. **Test Message Flow**:
   ```bash
   # Send test message via curl
   curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
     --data-urlencode "From=whatsapp:+14155238886" \
     --data-urlencode "To=whatsapp:+27821234567" \
     --data-urlencode "Body=Test message from sandbox" \
     -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
   ```

3. **Webhook Testing with ngrok**:
   ```bash
   # Start ngrok tunnel
   ngrok http 8000

   # Update webhook URL in Twilio console
   # https://xxxx.ngrok.io/api/webhooks/whatsapp/incoming
   ```

### Integration Tests

```python
# tests/test_whatsapp_tools.py

import pytest
from unittest.mock import patch, MagicMock

def test_send_whatsapp_message():
    with patch('twilio.rest.Client') as mock_client:
        mock_messages = MagicMock()
        mock_messages.create.return_value = MagicMock(sid='SM123')
        mock_client.return_value.messages = mock_messages

        from one_for_all.tools.whatsapp.send_message import send_whatsapp_message

        result = send_whatsapp_message('+27821234567', 'Test message')

        assert 'SM123' in result
        mock_messages.create.assert_called_once()

def test_verify_otp_success():
    # Test OTP verification
    pass

def test_verify_otp_expired():
    # Test expired OTP handling
    pass

def test_verify_otp_locked():
    # Test account locking after 3 attempts
    pass
```

### Load Testing

```bash
# Using Apache Bench
ab -n 100 -c 10 -p webhook_payload.json -T application/x-www-form-urlencoded \
   https://your-domain.com/api/webhooks/whatsapp/incoming
```

---

## Security Considerations

1. **Validate Twilio Signatures** - Always validate in production
2. **Rate Limiting** - Implement per-user and global limits
3. **Sanitize Inputs** - Never trust webhook data
4. **Secure OTP Storage** - Hash OTPs in production
5. **Audit Logging** - Log all messages for compliance
6. **Data Retention** - Implement message cleanup policy

---

## Checklist

- [ ] Twilio account created and verified
- [ ] WhatsApp sandbox configured (dev)
- [ ] Environment variables set
- [ ] Webhook endpoints implemented
- [ ] Message tools created
- [ ] OTP flow tested
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Logging enabled
- [ ] Production templates submitted (if applicable)
