import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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
// Helper: Check team management authorization
// ============================================================================

async function checkTeamManagementAuth(
  supabase: ReturnType<typeof getSupabaseClient>,
  clerkUserId: string,
  institutionId: string
): Promise<{ authorized: boolean; userId: string | null; isOwner: boolean; error?: string }> {
  // Get current user
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!userRecord) {
    return { authorized: false, userId: null, isOwner: false, error: 'User not found' }
  }

  // Get institution
  const { data: institution } = await supabase
    .from('institutions')
    .select('created_by')
    .eq('id', institutionId)
    .single()

  if (!institution) {
    return { authorized: false, userId: userRecord.id, isOwner: false, error: 'Institution not found' }
  }

  const isOwner = institution.created_by === userRecord.id

  if (isOwner) {
    return { authorized: true, userId: userRecord.id, isOwner: true }
  }

  // Check membership
  const { data: membership } = await supabase
    .from('institution_members')
    .select('role, permissions')
    .eq('institution_id', institutionId)
    .eq('user_id', userRecord.id)
    .eq('invitation_status', 'accepted')
    .single()

  const canManage = membership?.role === 'admin' ||
    (membership?.permissions as string[] | null)?.includes('manage_team')

  return {
    authorized: canManage || false,
    userId: userRecord.id,
    isOwner: false,
    error: canManage ? undefined : 'Permission denied'
  }
}

// ============================================================================
// GET - Get single member details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, memberId } = await params
    const supabase = getSupabaseClient()

    const authResult = await checkTeamManagementAuth(supabase, userId, institutionId)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 403 })
    }

    const { data: member, error } = await supabase
      .from('institution_members')
      .select(`
        id,
        role,
        permissions,
        invitation_status,
        invited_email,
        invitation_expires_at,
        email_sent_at,
        invitation_accepted_at,
        created_at,
        users (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', memberId)
      .eq('institution_id', institutionId)
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const user = member.users as unknown as {
      id: string
      email: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    } | null

    return NextResponse.json({
      id: member.id,
      role: member.role,
      permissions: member.permissions || [],
      status: member.invitation_status,
      email: user?.email || member.invited_email,
      firstName: user?.first_name || null,
      lastName: user?.last_name || null,
      avatarUrl: user?.avatar_url || null,
      invitedAt: member.created_at,
      acceptedAt: member.invitation_accepted_at,
      expiresAt: member.invitation_expires_at,
      emailSentAt: member.email_sent_at,
    })
  } catch (error) {
    console.error('[Member GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// PATCH - Update member role/permissions
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, memberId } = await params
    const body = await request.json()
    const { role, permissions } = body

    // Validate at least one field
    if (role === undefined && permissions === undefined) {
      return NextResponse.json(
        { error: 'At least one of role or permissions must be provided' },
        { status: 400 }
      )
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['admin', 'reviewer', 'member']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be admin, reviewer, or member' },
          { status: 400 }
        )
      }
    }

    // Validate permissions if provided
    if (permissions !== undefined && !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    const authResult = await checkTeamManagementAuth(supabase, userId, institutionId)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('institution_members')
      .select('id, user_id')
      .eq('id', memberId)
      .eq('institution_id', institutionId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if trying to modify institution owner
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    if (targetMember.user_id === institution?.created_by) {
      return NextResponse.json(
        { error: 'Cannot modify institution owner' },
        { status: 400 }
      )
    }

    // Prevent self-demotion (admin removing own admin role)
    if (targetMember.user_id === authResult.userId && role && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (role !== undefined) updateData.role = role
    if (permissions !== undefined) updateData.permissions = permissions

    // Update member
    const { data: updatedMember, error: updateError } = await supabase
      .from('institution_members')
      .update(updateData)
      .eq('id', memberId)
      .select('id, role, permissions, updated_at')
      .single()

    if (updateError) {
      console.error('[Member PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        permissions: updatedMember.permissions,
        updatedAt: updatedMember.updated_at,
      },
    })
  } catch (error) {
    console.error('[Member PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Remove member
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, memberId } = await params
    const supabase = getSupabaseClient()

    const authResult = await checkTeamManagementAuth(supabase, userId, institutionId)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('institution_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('institution_id', institutionId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if trying to remove institution owner
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    if (targetMember.user_id === institution?.created_by) {
      return NextResponse.json(
        { error: 'Cannot remove institution owner' },
        { status: 400 }
      )
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('institution_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('[Member DELETE] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Member DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
