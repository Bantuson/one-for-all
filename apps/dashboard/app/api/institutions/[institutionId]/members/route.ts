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
// GET - List institution members
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params
    const supabase = getSupabaseClient()

    // Verify user has access to this institution
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('institution_members')
      .select('role')
      .eq('institution_id', institutionId)
      .eq('user_id', userRecord.id)
      .eq('invitation_status', 'accepted')
      .single()

    // Check if user created the institution
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    const isOwner = institution?.created_by === userRecord.id
    const hasAccess = isOwner || !!membership

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch owner user details separately (avoid FK join issues)
    let ownerUser: {
      id: string
      email: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    } | null = null

    if (institution?.created_by) {
      const { data: ownerData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', institution.created_by)
        .single()
      ownerUser = ownerData
    }

    // Get all members - use explicit FK to avoid ambiguous relationship error
    // (institution_members has both user_id and invited_by pointing to users)
    // Also join institution_roles for custom role information
    const { data: members, error: membersError } = await supabase
      .from('institution_members')
      .select(`
        id,
        role,
        role_id,
        permissions,
        invitation_status,
        invited_email,
        invitation_expires_at,
        email_sent_at,
        invitation_accepted_at,
        created_at,
        users!institution_members_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        ),
        institution_roles (
          id,
          name,
          slug,
          color,
          permissions
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (membersError) {
      console.error('[Members API] Error:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Transform data
    const transformedMembers = members?.map((member) => {
      const user = member.users as unknown as {
        id: string
        email: string
        first_name: string | null
        last_name: string | null
        avatar_url: string | null
      } | null

      const roleInfo = member.institution_roles as unknown as {
        id: string
        name: string
        slug: string
        color: string | null
        permissions: string[]
      } | null

      // Use role permissions from institution_roles if available, otherwise fall back to member permissions
      const effectivePermissions = roleInfo?.permissions || member.permissions || []

      return {
        id: member.id,
        role: member.role,
        roleId: member.role_id || null,
        roleName: roleInfo?.name || null,
        roleColor: roleInfo?.color || null,
        rolePermissions: roleInfo?.permissions || null,
        permissions: effectivePermissions,
        status: member.invitation_status,
        email: user?.email || member.invited_email,
        firstName: user?.first_name || null,
        lastName: user?.last_name || null,
        avatarUrl: user?.avatar_url || null,
        isOwner: user?.id === institution?.created_by,
        invitedAt: member.created_at,
        acceptedAt: member.invitation_accepted_at,
        expiresAt: member.invitation_expires_at,
        emailSentAt: member.email_sent_at,
      }
    }) || []

    // Always include owner in members list if not already present
    const ownerInList = transformedMembers.some((m) => m.isOwner)

    // Fetch admin role for owner if not in list
    interface AdminRoleData {
      id: string
      name: string
      slug: string
      color: string | null
      permissions: string[]
    }
    let adminRole: AdminRoleData | null = null

    if (!ownerInList && ownerUser) {
      const { data: adminRoleData } = await supabase
        .from('institution_roles')
        .select('id, name, slug, color, permissions')
        .eq('institution_id', institutionId)
        .eq('slug', 'admin')
        .single()

      adminRole = adminRoleData as AdminRoleData | null
    }

    const finalMembers = ownerInList || !ownerUser
      ? transformedMembers
      : [
          {
            id: `owner-${institution?.created_by}`,
            role: 'owner',
            roleId: adminRole?.id || null,
            roleName: adminRole?.name || 'Administrator',
            roleColor: adminRole?.color || '#DC2626',
            rolePermissions: adminRole?.permissions || ['manage_team', 'manage_settings', 'view_applications', 'review_applications'],
            permissions: adminRole?.permissions || ['manage_team', 'manage_settings', 'view_applications', 'review_applications'],
            status: 'accepted',
            email: ownerUser.email,
            firstName: ownerUser.first_name,
            lastName: ownerUser.last_name,
            avatarUrl: ownerUser.avatar_url,
            isOwner: true,
            invitedAt: null,
            acceptedAt: null,
            expiresAt: null,
            emailSentAt: null,
          },
          ...transformedMembers,
        ]

    return NextResponse.json({
      members: finalMembers,
      isOwner,
      currentUserRole: membership?.role || (isOwner ? 'owner' : null),
    })
  } catch (error) {
    console.error('[Members API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Remove a member
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Get current user
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to remove members
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    const isOwner = institution?.created_by === userRecord.id

    if (!isOwner) {
      // Check if user is admin
      const { data: membership } = await supabase
        .from('institution_members')
        .select('role, permissions')
        .eq('institution_id', institutionId)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      const canManageTeam = membership?.role === 'admin' ||
        membership?.permissions?.includes('manage_team')

      if (!canManageTeam) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    // Cannot remove owner
    const { data: targetMember } = await supabase
      .from('institution_members')
      .select('user_id')
      .eq('id', memberId)
      .single()

    if (targetMember?.user_id === institution?.created_by) {
      return NextResponse.json({ error: 'Cannot remove institution owner' }, { status: 400 })
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('institution_members')
      .delete()
      .eq('id', memberId)
      .eq('institution_id', institutionId)

    if (deleteError) {
      console.error('[Members API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Members API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST - Create new invitation
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params
    const body = await request.json()
    const { email, role, roleId, permissions = [] } = body

    // Validate required fields - either role or roleId must be provided
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!role && !roleId) {
      return NextResponse.json(
        { error: 'Either role or roleId is required' },
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

    // Only validate hardcoded roles if roleId is not provided
    if (!roleId && role) {
      const validRoles = ['admin', 'reviewer', 'member']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be admin, reviewer, or member' },
          { status: 400 }
        )
      }
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

    // Get institution and check authorization
    const { data: institution } = await supabase
      .from('institutions')
      .select('id, name, slug, created_by')
      .eq('id', institutionId)
      .single()

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    const isOwner = institution.created_by === userRecord.id

    // Check if user has manage_team permission
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('institution_members')
        .select('role, permissions')
        .eq('institution_id', institutionId)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      const canManage = membership?.role === 'admin' ||
        (membership?.permissions as string[] | null)?.includes('manage_team')

      if (!canManage) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    }

    // Check for existing invitation or membership
    const { data: existing } = await supabase
      .from('institution_members')
      .select('id, invitation_status')
      .eq('institution_id', institutionId)
      .eq('invited_email', email)
      .single()

    if (existing) {
      if (existing.invitation_status === 'accepted') {
        return NextResponse.json(
          { error: 'This email is already a team member' },
          { status: 409 }
        )
      }
      if (existing.invitation_status === 'pending') {
        return NextResponse.json(
          { error: 'An invitation is already pending for this email' },
          { status: 409 }
        )
      }
    }

    // Create invitation
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Resolve role information - handle roleId, role text, or lookup by slug
    let resolvedRoleId: string | null = null
    let resolvedRoleName: string = role || 'member'
    let resolvedRoleColor: string | null = null
    let resolvedPermissions: string[] = permissions

    if (roleId) {
      // roleId provided - fetch role details from institution_roles
      const { data: roleData, error: roleError } = await supabase
        .from('institution_roles')
        .select('id, name, slug, color, permissions')
        .eq('id', roleId)
        .eq('institution_id', institutionId)
        .single()

      if (roleError || !roleData) {
        return NextResponse.json(
          { error: 'Invalid roleId - role not found in this institution' },
          { status: 400 }
        )
      }

      resolvedRoleId = roleData.id
      resolvedRoleName = roleData.slug // Use slug for backward compat with role column
      resolvedRoleColor = roleData.color
      // Copy permissions from role definition to member record
      resolvedPermissions = (roleData.permissions as string[]) || []
    } else if (role) {
      // Only role text provided - try to find matching role by slug
      const { data: matchingRole } = await supabase
        .from('institution_roles')
        .select('id, name, slug, color, permissions')
        .eq('institution_id', institutionId)
        .eq('slug', role)
        .single()

      if (matchingRole) {
        // Found matching role - link to it
        resolvedRoleId = matchingRole.id
        resolvedRoleName = matchingRole.slug
        resolvedRoleColor = matchingRole.color
        // If no custom permissions provided, use role's permissions
        if (permissions.length === 0) {
          resolvedPermissions = (matchingRole.permissions as string[]) || []
        }
      }
      // If not found, just use the text role (backward compat)
    }

    const { data: invitation, error: insertError } = await supabase
      .from('institution_members')
      .insert({
        institution_id: institutionId,
        user_id: null,
        role: resolvedRoleName,
        role_id: resolvedRoleId,
        permissions: resolvedPermissions,
        invited_email: email,
        invited_by: userRecord.id,
        invitation_token: invitationToken,
        invitation_status: 'pending',
        invitation_expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !invitation) {
      console.error('[Members POST] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/register/invite/${invitationToken}`
    const inviterName = userRecord.first_name
      ? `${userRecord.first_name}${userRecord.last_name ? ' ' + userRecord.last_name : ''}`
      : 'A team member'

    let emailSent = false
    try {
      // Import dynamically to avoid issues if sendgrid not configured
      const { sendEmail } = await import('@/lib/email/sendgrid')
      const { getInvitationEmailHtml, getInvitationEmailText } = await import('@/lib/email/templates/invitation')

      const htmlContent = getInvitationEmailHtml({
        inviterName,
        institutionName: institution.name,
        acceptUrl,
        expiresAt,
        permissions: resolvedPermissions,
      })

      const textContent = getInvitationEmailText({
        inviterName,
        institutionName: institution.name,
        acceptUrl,
        expiresAt,
        permissions: resolvedPermissions,
      })

      const emailResult = await sendEmail({
        to: email,
        subject: `You're invited to join ${institution.name} on One For All`,
        html: htmlContent,
        text: textContent,
      })

      if (emailResult.success) {
        emailSent = true
        await supabase
          .from('institution_members')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', invitation.id)
      }
    } catch (emailError) {
      console.error('[Members POST] Email error:', emailError)
      // Don't fail - invitation is created, email can be resent
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email,
        role: resolvedRoleName,
        roleId: resolvedRoleId,
        roleColor: resolvedRoleColor,
        permissions: resolvedPermissions,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        emailSent,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Members POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
