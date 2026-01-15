import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string }>
}

/**
 * Verify user has access to the institution
 * Returns the user's role if they have access, null otherwise
 */
async function verifyInstitutionAccess(
  clerkUserId: string,
  institutionId: string
): Promise<{ userId: string; role: string } | null> {
  const supabase = createServiceClient()

  // Get Supabase user ID from Clerk ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return null
  }

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', institutionId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  return { userId: user.id, role: membership.role }
}

// GET /api/institutions/[institutionId]/applications
// List all applications for an institution with choices
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access - only institution members can view applications
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    // Only admins and reviewers can view applications
    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to view applications' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Get optional filters from query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const course = searchParams.get('course')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // First, get application_choices for this institution
    let choicesQuery = supabase
      .from('application_choices')
      .select(`
        id,
        priority,
        status,
        status_reason,
        reviewed_by,
        reviewed_at,
        created_at,
        application_id,
        course_id,
        course:courses(
          id,
          name,
          code
        ),
        faculty:faculties(
          id,
          name,
          code
        ),
        campus:campuses(
          id,
          name
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (status) {
      choicesQuery = choicesQuery.eq('status', status)
    }

    if (course) {
      // Check if course is a UUID or a code
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course)

      if (isUuid) {
        choicesQuery = choicesQuery.eq('course_id', course)
      } else {
        // Lookup course ID by code first
        const { data: courseData } = await supabase
          .from('courses')
          .select('id')
          .eq('code', course)
          .eq('institution_id', institutionId)
          .single()

        if (courseData) {
          choicesQuery = choicesQuery.eq('course_id', courseData.id)
        }
        // If course not found, the query will return all (no filter applied)
      }
    }

    // Get total count first
    const { count: totalChoices } = await supabase
      .from('application_choices')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .then(res => {
        if (status) {
          return supabase
            .from('application_choices')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', institutionId)
            .eq('status', status)
        }
        return res
      })

    // Apply pagination
    choicesQuery = choicesQuery.range(offset, offset + limit - 1)

    const { data: choices, error: choicesError } = await choicesQuery

    if (choicesError) {
      console.error('Error fetching application choices:', choicesError)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    // Get unique application IDs
    const applicationIds = [...new Set(choices?.map(c => c.application_id) || [])]

    if (applicationIds.length === 0) {
      return NextResponse.json({
        applications: [],
        total: 0,
      })
    }

    // Fetch applications with applicant info and documents
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        personal_info,
        academic_info,
        status,
        created_at,
        updated_at,
        applicant:applicant_accounts!applications_user_id_fkey(
          id,
          email,
          cellphone,
          platform_student_number
        ),
        documents:application_documents(
          id,
          application_id,
          document_type,
          file_url,
          file_name,
          storage_path,
          file_size,
          mime_type,
          uploaded_at,
          review_status,
          flag_reason,
          flagged_by,
          flagged_at,
          reviewed_by,
          reviewed_at
        )
      `)
      .in('id', applicationIds)

    if (appsError) {
      console.error('Error fetching applications:', appsError)
      return NextResponse.json(
        { error: 'Failed to fetch application details' },
        { status: 500 }
      )
    }

    // Create a map for quick lookup
    const applicationsMap = new Map(
      applications?.map(app => [app.id, app]) || []
    )

    // Combine choices with application data
    const enrichedApplications = choices?.map(choice => {
      const application = applicationsMap.get(choice.application_id)
      return {
        choiceId: choice.id,
        priority: choice.priority,
        choiceStatus: choice.status,
        statusReason: choice.status_reason,
        reviewedBy: choice.reviewed_by,
        reviewedAt: choice.reviewed_at,
        choiceCreatedAt: choice.created_at,
        course: choice.course,
        faculty: choice.faculty,
        campus: choice.campus,
        application: application ? {
          id: application.id,
          applicantId: application.applicant_id,
          personalInfo: application.personal_info,
          academicInfo: application.academic_info,
          applicationStatus: application.status,
          createdAt: application.created_at,
          updatedAt: application.updated_at,
          applicant: application.applicant,
          documents: application.documents || [],
        } : null,
      }
    }) || []

    return NextResponse.json({
      applications: enrichedApplications,
      total: totalChoices || 0,
    })
  } catch (error) {
    console.error(
      'Error in GET /api/institutions/[institutionId]/applications:',
      error
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
