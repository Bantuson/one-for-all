import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/sendgrid'
import {
  getInvitationEmailHtml,
  getInvitationEmailText,
} from '@/lib/email/templates/invitation'

// ============================================================================
// Types
// ============================================================================

interface SendInvitationRequest {
  invitation_id: string
  email: string
  token: string
  institution_name: string
  inviter_name: string
  permissions: string[]
  expires_at: string
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// POST - Send invitation email
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: SendInvitationRequest = await request.json()
    const {
      invitation_id,
      email,
      token,
      institution_name,
      inviter_name,
      permissions,
      expires_at,
    } = body

    // Validate required fields
    if (!invitation_id || !email || !token || !institution_name || !inviter_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Build accept URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/register/invite/${token}`

    // Parse expiry date
    const expiresAt = expires_at ? new Date(expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Generate email content
    const htmlContent = getInvitationEmailHtml({
      inviterName: inviter_name,
      institutionName: institution_name,
      acceptUrl,
      expiresAt,
      permissions: permissions || [],
    })

    const textContent = getInvitationEmailText({
      inviterName: inviter_name,
      institutionName: institution_name,
      acceptUrl,
      expiresAt,
      permissions: permissions || [],
    })

    // Send the email
    const emailResult = await sendEmail({
      to: email,
      subject: `You're invited to join ${institution_name} on One For All`,
      html: htmlContent,
      text: textContent,
    })

    if (!emailResult.success) {
      console.error('[Invitation Send] Email send failed:', emailResult.error)
      return NextResponse.json(
        { error: `Failed to send email: ${emailResult.error}` },
        { status: 500 }
      )
    }

    // Update invitation record with email sent timestamp
    try {
      const supabase = getSupabaseClient()
      await supabase
        .from('institution_members')
        .update({
          email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation_id)
    } catch (dbError) {
      // Log but don't fail - email was sent successfully
      console.error('[Invitation Send] Failed to update DB:', dbError)
    }

    console.log('[Invitation Send] Success:', {
      email,
      institution: institution_name,
      messageId: emailResult.messageId,
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully',
      messageId: emailResult.messageId,
    })
  } catch (error) {
    console.error('[Invitation Send] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Resend invitation (alias endpoint)
// ============================================================================

export async function PUT(request: NextRequest) {
  // Resend uses same logic as send
  return POST(request)
}
