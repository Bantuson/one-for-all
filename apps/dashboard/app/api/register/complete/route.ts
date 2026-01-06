import { auth, clerkClient } from '@clerk/nextjs/server'
import { verifyToken } from '@clerk/backend'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { PreConfiguredCampus } from '@/lib/institutions/types'
import { sendEmail } from '@/lib/email/sendgrid'
import {
  getInvitationEmailHtml,
  getInvitationEmailText,
} from '@/lib/email/templates/invitation'

/**
 * POST /api/register/complete
 *
 * Unified registration endpoint that handles the complete registration + setup flow
 * in one atomic operation.
 *
 * This combines:
 * 1. User sync from Clerk to Supabase
 * 2. Institution creation
 * 3. Campus/Faculty/Course creation (setup)
 * 4. Team invites
 * 5. Mark onboarding complete
 */

interface InviteData {
  email: string
  permissions: string[]
}

interface UnifiedRegistrationRequest {
  institution: {
    name: string
    slug: string
    type: 'university' | 'college' | 'nsfas' | 'bursary_provider'
    contact_email: string
    contact_phone: string
    website?: string
  }
  setup: {
    mode: 'preconfigured' | 'manual'
    campuses: PreConfiguredCampus[]
  }
  invites: InviteData[]
}

interface UnifiedRegistrationResponse {
  success: boolean
  institution: {
    id: string
    slug: string
    name: string
  }
  clerkOrgId: string | null
  stats: {
    campusesCreated: number
    facultiesCreated: number
    coursesCreated: number
    invitesSent: number
  }
}

// Helper to clean up institution on failure (cascades to campuses/faculties/courses via FK)
async function cleanupInstitution(supabase: ReturnType<typeof createServiceClient>, institutionId: string) {
  try {
    await supabase.from('institutions').delete().eq('id', institutionId)
    console.log(`Cleaned up institution ${institutionId} after failed registration`)
  } catch (error) {
    console.error('Failed to cleanup institution:', error)
  }
}

// Helper function to map permissions to database role
function mapPermissionsToRole(permissions: string[]): 'admin' | 'reviewer' | 'member' {
  if (permissions.includes('admin_access')) return 'admin'
  if (permissions.includes('manage_team') || permissions.includes('edit_courses')) return 'reviewer'
  return 'member'
}

// Helper function to map permissions to Clerk organization role
function mapPermissionsToClerkRole(permissions: string[]): 'org:admin' | 'org:member' {
  if (permissions.includes('admin_access')) return 'org:admin'
  if (permissions.includes('manage_team')) return 'org:admin'
  return 'org:member'
}

// Helper function to get authenticated user ID with dual auth support
// Checks both Authorization header (JWT) and cookie-based auth
async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  // Method 1: Check Authorization header (explicit JWT token)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7)
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      })
      if (payload.sub) {
        console.log('[register/complete] Auth via JWT header - userId:', payload.sub)
        return payload.sub
      }
    } catch (err) {
      console.log('[register/complete] JWT verification failed, falling back to cookie auth:', err)
    }
  }

  // Method 2: Cookie-based auth with pending session support
  // treatPendingAsSignedOut: false allows users in "pending" session state to authenticate
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (userId) {
    console.log('[register/complete] Auth via cookie - userId:', userId)
  }
  return userId
}

export async function POST(req: NextRequest) {
  console.log('[register/complete] API called')

  try {
    // =========================================================================
    // Step 1: Authenticate user (with dual auth support)
    // =========================================================================
    const userId = await getAuthenticatedUserId(req)
    console.log('[register/complete] Auth check - userId:', userId)

    if (!userId) {
      console.log('[register/complete] FAILED: No userId - session may not be propagated yet')
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Session not ready. Please wait a moment and try again.',
          retryable: true
        },
        { status: 401 }
      )
    }

    // =========================================================================
    // Step 2: Parse and validate request body
    // =========================================================================
    let body: UnifiedRegistrationRequest
    try {
      body = await req.json()
      console.log('[register/complete] Request body parsed successfully')
    } catch (parseError) {
      console.error('[register/complete] JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { institution, setup, invites = [] } = body
    console.log('[register/complete] Parsed data:', {
      institutionName: institution?.name,
      institutionType: institution?.type,
      setupMode: setup?.mode,
      campusCount: setup?.campuses?.length,
      inviteCount: invites?.length,
    })

    // Validate required fields
    if (!institution?.name || !institution?.type || !institution?.contact_email) {
      console.log('[register/complete] FAILED: Missing required institution fields')
      return NextResponse.json(
        { error: 'Missing required institution fields: name, type, contact_email' },
        { status: 400 }
      )
    }

    if (!setup?.campuses || !Array.isArray(setup.campuses)) {
      console.log('[register/complete] FAILED: Missing or invalid campuses array')
      return NextResponse.json(
        { error: 'Missing or invalid setup.campuses array' },
        { status: 400 }
      )
    }

    // Validate institution type
    const validTypes = ['university', 'college', 'nsfas', 'bursary_provider']
    if (!validTypes.includes(institution.type)) {
      console.log('[register/complete] FAILED: Invalid institution type:', institution.type)
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('[register/complete] Validation passed, creating Supabase client...')
    // Use service role client for all operations (bypasses RLS)
    const supabase = createServiceClient()

    // =========================================================================
    // Step 3: Sync Clerk user to Supabase (if not already synced)
    // =========================================================================
    console.log('[register/complete] Step 3: Checking if user exists in Supabase...')
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    let user = existingUser

    console.log('[register/complete] User lookup result:', { user: existingUser, userError: userError?.message })

    // If user doesn't exist in Supabase yet, sync from Clerk
    if (userError || !existingUser) {
      console.log('[register/complete] User not found, syncing from Clerk...')
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)

      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress

      const primaryPhone = clerkUser.phoneNumbers.find(
        (p) => p.id === clerkUser.primaryPhoneNumberId
      )?.phoneNumber

      if (!primaryEmail) {
        return NextResponse.json(
          { error: 'User has no email address' },
          { status: 400 }
        )
      }

      // Sync user to Supabase using service client
      const { error: syncError } = await supabase.rpc(
        'sync_clerk_user',
        {
          p_clerk_user_id: userId,
          p_email: primaryEmail,
          p_first_name: clerkUser.firstName || null,
          p_last_name: clerkUser.lastName || null,
          p_avatar_url: clerkUser.imageUrl || null,
          p_phone: primaryPhone || null,
        }
      )

      if (syncError) {
        console.error('[register/complete] Error syncing user from Clerk:', syncError)
        return NextResponse.json(
          { error: 'Failed to sync user', details: syncError.message },
          { status: 500 }
        )
      }

      console.log('[register/complete] User synced successfully, fetching new user...')

      // Fetch the newly created user
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (newUserError || !newUser) {
        console.error('[register/complete] Failed to create user:', newUserError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
      console.log('[register/complete] User created with id:', user.id)
    }

    // At this point user is guaranteed to exist (either existing or newly synced)
    // Use non-null assertion since we've validated or created the user above
    const userId_db = user!.id

    // =========================================================================
    // Step 4: Create institution
    // =========================================================================
    console.log('[register/complete] Step 4: Creating institution...')
    const { data: createdInstitution, error: institutionError } = await supabase
      .from('institutions')
      .insert({
        name: institution.name,
        slug: institution.slug,
        type: institution.type,
        contact_email: institution.contact_email,
        contact_phone: institution.contact_phone || null,
        website: institution.website || null,
        created_by: userId_db,
      })
      .select()
      .single()

    if (institutionError) {
      console.error('[register/complete] Error creating institution:', institutionError)

      // Handle duplicate slug
      if (institutionError.code === '23505') {
        return NextResponse.json(
          { error: 'An institution with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create institution', details: institutionError.message },
        { status: 500 }
      )
    }

    const institutionId = createdInstitution.id
    console.log('[register/complete] Institution created with id:', institutionId)

    // =========================================================================
    // Step 4b: Create Clerk Organization for team management
    // =========================================================================
    console.log('[register/complete] Step 4b: Creating Clerk Organization...')
    let clerkOrgId: string | null = null
    const client = await clerkClient()

    try {
      const clerkOrg = await client.organizations.createOrganization({
        name: institution.name,
        slug: createdInstitution.slug,
        createdBy: userId,
        publicMetadata: {
          supabaseInstitutionId: institutionId,
          institutionType: institution.type,
        },
      })

      clerkOrgId = clerkOrg.id

      // Store Clerk org ID in institution record
      await supabase
        .from('institutions')
        .update({ clerk_org_id: clerkOrg.id })
        .eq('id', institutionId)

      console.log(`Created Clerk organization ${clerkOrg.id} for institution ${institution.name}`)
    } catch (clerkOrgError) {
      console.error('Failed to create Clerk organization:', clerkOrgError)
      // Don't fail registration - Clerk org can be created later
      // Team invites will fall back to database-only storage
    }

    // =========================================================================
    // Step 5: Create campuses, faculties, and courses
    // =========================================================================
    let campusesCreated = 0
    let facultiesCreated = 0
    let coursesCreated = 0

    // Filter out deleted campuses
    const activeCampuses = setup.campuses.filter(
      (campus: PreConfiguredCampus & { _isDeleted?: boolean }) => !campus._isDeleted
    )

    for (const campusData of activeCampuses) {
      // Create campus - use 'location' column (TEXT)
      const locationString = campusData.location ||
        (campusData.address ? `${campusData.address.city}, ${campusData.address.province}` : '')

      const { data: campus, error: campusError } = await supabase
        .from('campuses')
        .insert({
          institution_id: institutionId,
          name: campusData.name,
          code: campusData.code,
          location: locationString,
          is_main: campusData.isMain || false,
        })
        .select()
        .single()

      if (campusError || !campus) {
        console.error('Campus creation error:', campusError)
        console.error('Failed campus data:', campusData)
        // CLEANUP: Delete institution to prevent incomplete dashboard
        await cleanupInstitution(supabase, createdInstitution.id)
        return NextResponse.json(
          {
            error: 'Failed to create campus',
            details: campusError?.message || 'Unknown error occurred',
            campus: campusData.name,
          },
          { status: 500 }
        )
      }

      campusesCreated++

      // Track created faculties to avoid duplicates across programme types
      // Key: faculty code, Value: created faculty record
      const createdFaculties = new Map<string, { id: string; name: string }>()

      // Process programme types, then faculties, then courses
      // This preserves the programme_type context for each course
      for (const programmeType of campusData.programmeTypes || []) {
        for (const facultyData of programmeType.faculties || []) {
          const facultyCode = facultyData.code || facultyData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')

          // Check if faculty already exists for this campus
          let faculty = createdFaculties.get(facultyCode)

          if (!faculty) {
            // Create the faculty
            const { data: newFaculty, error: facultyError } = await supabase
              .from('faculties')
              .insert({
                institution_id: institutionId,
                campus_id: campus.id,
                name: facultyData.name,
                code: facultyData.code || null,
                description: facultyData.description || `Faculty of ${facultyData.name}`,
              })
              .select()
              .single()

            if (facultyError || !newFaculty) {
              console.error('Faculty creation error:', facultyError)
              console.error('Failed faculty data:', JSON.stringify(facultyData, null, 2))
              console.error('Full error details:', JSON.stringify(facultyError, null, 2))
              // CLEANUP: Delete institution to prevent incomplete dashboard
              await cleanupInstitution(supabase, createdInstitution.id)
              return NextResponse.json(
                {
                  error: 'Failed to create faculty',
                  details: facultyError?.message || 'Unknown error occurred',
                  code: facultyError?.code,
                  hint: facultyError?.hint,
                  faculty: facultyData.name,
                  campus: campus.name,
                },
                { status: 500 }
              )
            }

            faculty = { id: newFaculty.id, name: newFaculty.name }
            createdFaculties.set(facultyCode, faculty)
            facultiesCreated++
          }

          // Process courses for this faculty under this programme type
          for (const courseData of facultyData.courses || []) {
            // Build requirements object with snake_case keys for database
            const requirements: Record<string, unknown> = {}
            if (courseData.requirements) {
              if (courseData.requirements.minimumAps) {
                requirements.minimum_aps = courseData.requirements.minimumAps
              }
              if (courseData.requirements.requiredSubjects) {
                requirements.required_subjects = courseData.requirements.requiredSubjects
              }
              if (courseData.requirements.additionalRequirements) {
                requirements.additional_requirements = courseData.requirements.additionalRequirements
              }
            }

            const { error: courseError } = await supabase.from('courses').insert({
              institution_id: institutionId,
              faculty_id: faculty.id,
              campus_id: campus.id,
              name: courseData.name,
              code: courseData.code,
              level: courseData.level,
              description: courseData.description,
              duration_years: courseData.durationYears || 4,
              requirements: Object.keys(requirements).length > 0 ? requirements : null,
              status: 'active',
              programme_type: programmeType.type,
            })

            if (courseError) {
              console.error('Course creation error:', courseError)
              console.error('Failed course data:', courseData)
              // CLEANUP: Delete institution to prevent incomplete dashboard
              await cleanupInstitution(supabase, createdInstitution.id)
              return NextResponse.json(
                {
                  error: 'Failed to create course',
                  details: courseError?.message || 'Unknown error occurred',
                  course: courseData.name,
                  faculty: faculty.name,
                  campus: campus.name,
                },
                { status: 500 }
              )
            }

            coursesCreated++
          }
        }
      }
    }

    // =========================================================================
    // Step 6: Process team invitations via Clerk Organizations
    // =========================================================================
    let invitesSent = 0

    if (invites && invites.length > 0 && clerkOrgId) {
      // Use Clerk organization invitations (preferred method)
      for (const invite of invites) {
        try {
          // Send Clerk organization invitation - Clerk handles email delivery
          await client.organizations.createOrganizationInvitation({
            organizationId: clerkOrgId,
            emailAddress: invite.email,
            inviterUserId: userId,
            role: mapPermissionsToClerkRole(invite.permissions),
            publicMetadata: {
              permissions: invite.permissions,
              supabaseInstitutionId: institutionId,
            },
          })

          // Also store in our database for tracking
          const role = mapPermissionsToRole(invite.permissions)
          await supabase
            .from('institution_members')
            .insert({
              institution_id: institutionId,
              user_id: null, // Will be set when invitation is accepted via Clerk webhook
              role: role,
              permissions: invite.permissions,
              invited_by: userId_db,
              invitation_status: 'pending',
              invited_email: invite.email,
            })

          invitesSent++
          console.log(`Sent Clerk invitation to ${invite.email} for org ${clerkOrgId}`)
        } catch (inviteError) {
          console.error('Clerk invitation error:', inviteError)
          // Continue with other invites
        }
      }
    } else if (invites && invites.length > 0) {
      // Fallback: Store invites in database and send emails directly (no Clerk org available)
      console.log('No Clerk organization available, storing invites in database and sending emails directly')

      // Get inviter name for emails
      let inviterName = 'A team member'
      try {
        const clerkUser = await client.users.getUser(userId)
        inviterName = clerkUser.firstName
          ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
          : clerkUser.emailAddresses[0]?.emailAddress || 'A team member'
      } catch (e) {
        console.error('Failed to get inviter name:', e)
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      for (const invite of invites) {
        try {
          const invitationToken = crypto.randomUUID()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

          const role = mapPermissionsToRole(invite.permissions)

          const { data: insertedInvite, error: inviteError } = await supabase
            .from('institution_members')
            .insert({
              institution_id: institutionId,
              user_id: null,
              role: role,
              permissions: invite.permissions,
              invited_by: userId_db,
              invitation_token: invitationToken,
              invitation_status: 'pending',
              invitation_expires_at: expiresAt.toISOString(),
              invited_email: invite.email,
            })
            .select('id')
            .single()

          if (!inviteError && insertedInvite) {
            // Send invitation email
            const acceptUrl = `${baseUrl}/register/invite/${invitationToken}`

            const htmlContent = getInvitationEmailHtml({
              inviterName,
              institutionName: institution.name,
              acceptUrl,
              expiresAt,
              permissions: invite.permissions,
            })

            const textContent = getInvitationEmailText({
              inviterName,
              institutionName: institution.name,
              acceptUrl,
              expiresAt,
              permissions: invite.permissions,
            })

            const emailResult = await sendEmail({
              to: invite.email,
              subject: `You're invited to join ${institution.name} on One For All`,
              html: htmlContent,
              text: textContent,
            })

            if (emailResult.success) {
              // Update with email sent timestamp
              await supabase
                .from('institution_members')
                .update({ email_sent_at: new Date().toISOString() })
                .eq('id', insertedInvite.id)

              console.log(`Sent invitation email to ${invite.email}`)
              invitesSent++
            } else {
              console.error(`Failed to send invitation email to ${invite.email}:`, emailResult.error)
              // Still count as sent since DB record exists - can resend later
              invitesSent++
            }
          } else {
            console.error('Database invite error:', inviteError)
          }
        } catch (inviteError) {
          console.error('Unexpected error storing invite:', inviteError)
        }
      }
    }

    // =========================================================================
    // Step 7: Mark user's onboarding as complete
    // =========================================================================
    const { error: onboardingError } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('clerk_user_id', userId)

    if (onboardingError) {
      console.error('Error completing onboarding:', onboardingError)
      // Don't fail the whole registration - just log the error
      // The user can still use the system
    }

    // =========================================================================
    // Step 8: Return success response
    // =========================================================================
    const response: UnifiedRegistrationResponse = {
      success: true,
      institution: {
        id: institutionId,
        slug: createdInstitution.slug,
        name: createdInstitution.name,
      },
      clerkOrgId,
      stats: {
        campusesCreated,
        facultiesCreated,
        coursesCreated,
        invitesSent,
      },
    }

    console.log('[register/complete] SUCCESS! Response:', response)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[register/complete] UNCAUGHT ERROR:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
