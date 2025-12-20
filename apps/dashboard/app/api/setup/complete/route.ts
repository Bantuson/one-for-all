import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { PreConfiguredCampus } from '@/lib/institutions/types'

/**
 * Complete Institution Setup API Route
 *
 * Populates the database with institution structure from pre-configured
 * or manually entered data.
 */

interface InviteData {
  email: string
  permissions: string[]
}

interface SetupRequestBody {
  institution_id: string
  mode: 'preconfigured' | 'manual'
  institution_name?: string
  institution_type?: string
  campuses: PreConfiguredCampus[]
  invites?: InviteData[]
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SetupRequestBody = await req.json()
    const { institution_id, mode, campuses, invites = [] } = body

    if (!institution_id || !campuses || !Array.isArray(campuses)) {
      return NextResponse.json(
        { error: 'Missing required fields: institution_id, campuses' },
        { status: 400 }
      )
    }

    if (campuses.length === 0) {
      return NextResponse.json(
        { error: 'At least one campus is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Phase 1: Validate institution exists before proceeding
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('id')
      .eq('id', institution_id)
      .single()

    if (institutionError || !institution) {
      console.error('Institution validation error:', institutionError)
      return NextResponse.json(
        {
          error: 'Institution not found',
          details: institutionError?.message || 'The specified institution does not exist in the database',
        },
        { status: 400 }
      )
    }

    // Track counts for response
    let campusesCreated = 0
    let facultiesCreated = 0
    let coursesCreated = 0

    // Process each campus
    for (const campusData of campuses) {
      // Create campus
      const { data: campus, error: campusError } = await supabase
        .from('campuses')
        .insert({
          institution_id,
          name: campusData.name,
          code: campusData.code,
          address: campusData.address
            ? {
                city: campusData.address.city,
                province: campusData.address.province,
              }
            : campusData.location
              ? {
                  city: campusData.location.split(',')[0]?.trim() || '',
                  province: campusData.location.split(',')[1]?.trim() || '',
                }
              : {},
        })
        .select()
        .single()

      if (campusError || !campus) {
        console.error('Campus creation error:', campusError)
        console.error('Failed campus data:', campusData)
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

      // Get all faculties from all programme types
      const allFaculties = campusData.programmeTypes?.flatMap(pt => pt.faculties) || []

      // Process faculties for this campus
      for (const facultyData of allFaculties) {
        const { data: faculty, error: facultyError } = await supabase
          .from('faculties')
          .insert({
            institution_id,
            campus_id: campus.id,
            name: facultyData.name,
            code: facultyData.code,
            description: facultyData.description || `Faculty of ${facultyData.name}`,
          })
          .select()
          .single()

        if (facultyError || !faculty) {
          console.error('Faculty creation error:', facultyError)
          console.error('Failed faculty data:', facultyData)
          return NextResponse.json(
            {
              error: 'Failed to create faculty',
              details: facultyError?.message || 'Unknown error occurred',
              faculty: facultyData.name,
              campus: campus.name,
            },
            { status: 500 }
          )
        }

        facultiesCreated++

        // Process courses for this faculty
        for (const courseData of facultyData.courses || []) {
          // Build requirements object
          const requirements: Record<string, unknown> = {}
          if (courseData.requirements) {
            if (courseData.requirements.minimumAps) {
              requirements.minimumAps = courseData.requirements.minimumAps
            }
            if (courseData.requirements.requiredSubjects) {
              requirements.requiredSubjects = courseData.requirements.requiredSubjects
            }
            if (courseData.requirements.additionalRequirements) {
              requirements.additionalRequirements = courseData.requirements.additionalRequirements
            }
          }
          if (courseData.durationYears) {
            requirements.durationYears = courseData.durationYears
          }

          const { error: courseError } = await supabase.from('courses').insert({
            institution_id,
            faculty_id: faculty.id,
            campus_id: campus.id,
            name: courseData.name,
            code: courseData.code,
            level: courseData.level,
            description: courseData.description,
            requirements: Object.keys(requirements).length > 0 ? requirements : null,
            status: 'active',
          })

          if (courseError) {
            console.error('Course creation error:', courseError)
            console.error('Failed course data:', courseData)
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

    // Helper function to map permissions to database role
    function mapPermissionsToRole(permissions: string[]): 'admin' | 'reviewer' | 'member' {
      if (permissions.includes('admin_access')) return 'admin'
      if (permissions.includes('manage_team') || permissions.includes('edit_courses')) return 'reviewer'
      return 'member'
    }

    // Phase 6: Process invitations if provided
    let invitesSent = 0
    if (invites && invites.length > 0) {
      for (const invite of invites) {
        try {
          const invitationToken = crypto.randomUUID()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

          // First, get the user's UUID from Clerk ID for invited_by
          const { data: invitingUser } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single()

          if (!invitingUser) {
            console.error('Could not find user ID for Clerk user:', userId)
            continue
          }

          // Map permissions to role for database compatibility
          const role = mapPermissionsToRole(invite.permissions)

          const { error: inviteError } = await supabase
            .from('institution_members')
            .insert({
              institution_id,
              user_id: null, // Will be set when invitation is accepted
              role: role,
              permissions: invite.permissions, // Store raw permissions as JSON array
              invited_by: invitingUser.id,
              invitation_token: invitationToken,
              invitation_status: 'pending',
              invitation_expires_at: expiresAt.toISOString(),
              invited_email: invite.email,
            })

          if (inviteError) {
            console.error('Invite creation error:', inviteError)
            console.error('Failed invite:', invite)
            // Don't fail the whole setup for invite errors - just log and continue
          } else {
            invitesSent++
          }
        } catch (inviteError) {
          console.error('Unexpected error sending invite:', inviteError)
          // Continue with other invites
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Dashboard setup completed successfully',
        stats: {
          campusesCreated,
          facultiesCreated,
          coursesCreated,
          invitesSent,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Setup completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error while setting up dashboard' },
      { status: 500 }
    )
  }
}
