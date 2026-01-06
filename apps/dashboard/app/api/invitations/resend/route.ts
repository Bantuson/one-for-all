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
// POST - Resend invitation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invitation_id } = body

    if (!invitation_id) {
      return NextResponse.json(
        { error: 'invitation_id is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get current user
    const { data: userRecord } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get invitation with institution details
    const { data: invitation, error: inviteError } = await supabase
      .from('institution_members')
      .select(`
        id,
        institution_id,
        invited_email,
        permissions,
        invitation_status,
        institutions (
          id,
          name,
          slug,
          created_by
        )
      `)
      .eq('id', invitation_id)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check invitation status
    if (invitation.invitation_status === 'accepted') {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    if (invitation.invitation_status === 'revoked') {
      return NextResponse.json(
        { error: 'Invitation has been revoked' },
        { status: 400 }
      )
    }

    const institution = invitation.institutions as unknown as {
      id: string
      name: string
      slug: string
      created_by: string
    }

    // Check authorization
    const isOwner = institution.created_by === userRecord.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('institution_members')
        .select('role, permissions')
        .eq('institution_id', invitation.institution_id)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      const canManage = membership?.role === 'admin' ||
        (membership?.permissions as string[] | null)?.includes('manage_team')

      if (!canManage) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    // Regenerate token and extend expiry
    const newToken = crypto.randomUUID()
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    const { error: updateError } = await supabase
      .from('institution_members')
      .update({
        invitation_token: newToken,
        invitation_expires_at: newExpiresAt.toISOString(),
        invitation_status: 'pending', // Reset if was expired
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation_id)

    if (updateError) {
      console.error('[Resend] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to regenerate invitation' },
        { status: 500 }
      )
    }

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/register/invite/${newToken}`
    const inviterName = userRecord.first_name
      ? `${userRecord.first_name}${userRecord.last_name ? ' ' + userRecord.last_name : ''}`
      : 'A team member'

    const permissions = (invitation.permissions as string[]) || []

    const htmlContent = getInvitationEmailHtml({
      inviterName,
      institutionName: institution.name,
      acceptUrl,
      expiresAt: newExpiresAt,
      permissions,
    })

    const textContent = getInvitationEmailText({
      inviterName,
      institutionName: institution.name,
      acceptUrl,
      expiresAt: newExpiresAt,
      permissions,
    })

    const emailResult = await sendEmail({
      to: invitation.invited_email,
      subject: `Reminder: You're invited to join ${institution.name} on One For All`,
      html: htmlContent,
      text: textContent,
    })

    if (!emailResult.success) {
      console.error('[Resend] Email failed:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Update email_sent_at
    await supabase
      .from('institution_members')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', invitation_id)

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation_id,
        email: invitation.invited_email,
        newExpiresAt: newExpiresAt.toISOString(),
        emailSent: true,
      },
    })
  } catch (error) {
    console.error('[Resend] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
