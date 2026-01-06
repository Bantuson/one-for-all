import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
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
// POST - Accept invitation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, clerk_user_id } = body

    if (!token || !clerk_user_id) {
      return NextResponse.json(
        { success: false, error: 'Token and clerk_user_id are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Validate invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('institution_members')
      .select(`
        id,
        institution_id,
        invited_email,
        permissions,
        role,
        invitation_status,
        invitation_expires_at,
        institutions (
          id,
          name,
          slug,
          clerk_org_id
        )
      `)
      .eq('invitation_token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.invitation_status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Invitation already accepted' },
        { status: 400 }
      )
    }

    // Check if expired
    if (invitation.invitation_expires_at) {
      const expiresAt = new Date(invitation.invitation_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Invitation has expired' },
          { status: 400 }
        )
      }
    }

    // Get Clerk user
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerk_user_id)

    // Verify email matches
    const userEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress

    if (userEmail !== invitation.invited_email) {
      return NextResponse.json(
        { success: false, error: 'Email does not match invitation' },
        { status: 403 }
      )
    }

    // Sync Clerk user to Supabase if needed
    const { data: existingDbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    let dbUser = existingDbUser

    if (userError || !existingDbUser) {
      // Create user in Supabase
      const primaryPhone = clerkUser.phoneNumbers.find(
        (p) => p.id === clerkUser.primaryPhoneNumberId
      )?.phoneNumber

      const { error: syncError } = await supabase.rpc(
        'sync_clerk_user',
        {
          p_clerk_user_id: clerk_user_id,
          p_email: userEmail,
          p_first_name: clerkUser.firstName || null,
          p_last_name: clerkUser.lastName || null,
          p_avatar_url: clerkUser.imageUrl || null,
          p_phone: primaryPhone || null,
        }
      )

      if (syncError) {
        console.error('[Invitation Accept] User sync error:', syncError)
        return NextResponse.json(
          { success: false, error: 'Failed to sync user' },
          { status: 500 }
        )
      }

      // Fetch the new user
      const { data: syncedUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerk_user_id)
        .single()

      if (fetchError || !syncedUser) {
        return NextResponse.json(
          { success: false, error: 'Failed to create user record' },
          { status: 500 }
        )
      }

      dbUser = syncedUser
    }

    // At this point dbUser is guaranteed to exist (either existing or newly synced)
    // Use non-null assertion since we've validated or created the user above
    const dbUserId = dbUser!.id

    // Update invitation to accepted
    const { error: updateError } = await supabase
      .from('institution_members')
      .update({
        user_id: dbUserId,
        invitation_status: 'accepted',
        invitation_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('[Invitation Accept] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    // Get institution details
    const institution = invitation.institutions as unknown as {
      id: string
      name: string
      slug: string
      clerk_org_id: string | null
    }

    // If Clerk org exists, add user to it
    if (institution?.clerk_org_id) {
      try {
        const clerkRole = invitation.permissions?.includes('admin_access')
          ? 'org:admin'
          : 'org:member'

        await client.organizations.createOrganizationMembership({
          organizationId: institution.clerk_org_id,
          userId: clerk_user_id,
          role: clerkRole,
        })

        console.log(`[Invitation Accept] Added user ${clerk_user_id} to Clerk org ${institution.clerk_org_id}`)
      } catch (clerkError) {
        // Log but don't fail - user can still access via database
        console.error('[Invitation Accept] Failed to add to Clerk org:', clerkError)
      }
    }

    console.log(`[Invitation Accept] Success - User ${dbUserId} joined institution ${invitation.institution_id}`)

    return NextResponse.json({
      success: true,
      institution: {
        id: institution?.id,
        name: institution?.name,
        slug: institution?.slug,
      },
    })
  } catch (error) {
    console.error('[Invitation Accept] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
