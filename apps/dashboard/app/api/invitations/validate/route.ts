import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
// GET - Validate invitation token
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Query the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('institution_members')
      .select(`
        id,
        institution_id,
        invited_email,
        permissions,
        role,
        invited_by,
        invitation_status,
        invitation_expires_at,
        institutions (
          id,
          name,
          slug
        ),
        users!institution_members_invited_by_fkey (
          first_name,
          last_name
        )
      `)
      .eq('invitation_token', token)
      .single()

    if (inviteError || !invitation) {
      console.log('[Invitation Validate] Token not found:', token)
      return NextResponse.json(
        { valid: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if already used
    if (invitation.invitation_status === 'accepted') {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Check if expired
    if (invitation.invitation_expires_at) {
      const expiresAt = new Date(invitation.invitation_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { valid: false, error: 'This invitation has expired' },
          { status: 400 }
        )
      }
    }

    // Get institution details
    const institution = invitation.institutions as unknown as {
      id: string
      name: string
      slug: string
    }

    // Get inviter name
    const inviter = invitation.users as unknown as {
      first_name: string | null
      last_name: string | null
    } | null

    const inviterName = inviter
      ? `${inviter.first_name || ''}${inviter.last_name ? ' ' + inviter.last_name : ''}`.trim() || null
      : null

    // Return valid invitation
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        institution_id: invitation.institution_id,
        institution_name: institution?.name || 'Unknown Institution',
        institution_slug: institution?.slug || 'unknown',
        invited_email: invitation.invited_email,
        permissions: invitation.permissions || [],
        role: invitation.role,
        inviter_name: inviterName,
        expires_at: invitation.invitation_expires_at,
        status: 'valid',
      },
    })
  } catch (error) {
    console.error('[Invitation Validate] Error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
