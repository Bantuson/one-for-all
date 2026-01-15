import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Twilio WhatsApp credentials from environment
const TWILIO_SID = process.env.TWILIO_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER

/**
 * Format phone number to WhatsApp format (whatsapp:+27...).
 * Handles South African number formats.
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle South African number formats
  if (cleaned.startsWith('0')) {
    // Convert 0XX to +27XX
    cleaned = '+27' + cleaned.slice(1)
  } else if (cleaned.startsWith('27') && !cleaned.startsWith('+')) {
    // Add + prefix
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    // Assume South African if no country code
    cleaned = '+27' + cleaned
  }

  return `whatsapp:${cleaned}`
}

/**
 * Build professional message based on notification type
 */
function buildMessage(
  type: 'document_flagged' | 'status_update' | 'reminder',
  data: {
    applicantName?: string
    documentType?: string
    flagReason?: string
    courseName?: string
    newStatus?: string
  }
): string {
  const { applicantName = 'Applicant', documentType, flagReason, courseName, newStatus } = data

  switch (type) {
    case 'document_flagged':
      return (
        `Dear ${applicantName},\n\n` +
        `Your application document requires attention.\n\n` +
        `Document: ${documentType || 'Application Document'}\n` +
        `Issue: ${flagReason || 'Document needs to be resubmitted'}\n\n` +
        `Please log in to the applicant portal to upload a corrected version.\n\n` +
        `If you have questions, reply to this message.\n\n` +
        `One For All Admissions Team`
      )

    case 'status_update':
      return (
        `Dear ${applicantName},\n\n` +
        `Your application status has been updated.\n\n` +
        `Course: ${courseName || 'Your Programme'}\n` +
        `New Status: ${newStatus || 'Updated'}\n\n` +
        `Log in to the applicant portal for more details.\n\n` +
        `One For All Admissions Team`
      )

    case 'reminder':
      return (
        `Dear ${applicantName},\n\n` +
        `This is a reminder about your application.\n\n` +
        `Please ensure all required documents are submitted.\n\n` +
        `One For All Admissions Team`
      )

    default:
      return 'Notification from One For All Admissions'
  }
}

// POST /api/notifications/whatsapp - Send WhatsApp notification
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Twilio configuration
    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error('Twilio WhatsApp credentials not configured')
      return NextResponse.json(
        { error: 'WhatsApp notifications not configured' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { phone, type, applicantName, documentType, flagReason, courseName, newStatus } = body

    // Validate required fields
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    if (!type || !['document_flagged', 'status_update', 'reminder'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be: document_flagged, status_update, or reminder' },
        { status: 400 }
      )
    }

    // For document_flagged, require reason
    if (type === 'document_flagged' && !flagReason) {
      return NextResponse.json(
        { error: 'Flag reason is required for document_flagged notifications' },
        { status: 400 }
      )
    }

    // Format numbers
    const formattedTo = formatWhatsAppNumber(phone)
    const formattedFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`

    // Build message
    const message = buildMessage(type, {
      applicantName,
      documentType,
      flagReason,
      courseName,
      newStatus,
    })

    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const authHeader = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message,
      }),
    })

    const responseData = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message_sid: responseData.sid,
        status: responseData.status,
      })
    } else {
      console.error('Twilio error:', responseData)
      return NextResponse.json(
        {
          error: 'Failed to send WhatsApp message',
          details: responseData.message || 'Unknown error',
          code: responseData.code,
        },
        { status: response.status >= 500 ? 502 : 400 }
      )
    }
  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
