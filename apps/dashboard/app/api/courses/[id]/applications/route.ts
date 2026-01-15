import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * Verify user has access to view course applications
 * User must be a member of the institution that owns this course
 */
async function verifyCourseAccess(
  clerkUserId: string,
  courseId: string
): Promise<{ userId: string; role: string; institutionId: string } | null> {
  const supabase = createServiceClient()

  // Get the course to find its institution
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('institution_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return null
  }

  // Get Supabase user ID from Clerk ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return null
  }

  // Check membership for the course's institution
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', course.institution_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  return { userId: user.id, role: membership.role, institutionId: course.institution_id }
}

// GET /api/courses/[id]/applications
// List applications where this course is 1st OR 2nd choice
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    // Verify access - only institution members can view applications
    const access = await verifyCourseAccess(clerkUserId, courseId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this course' },
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
    const priority = searchParams.get('priority') // '1', '2', or null for all
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Query application_choices where course_id matches
    let choicesQuery = supabase
      .from('application_choices')
      .select(`
        id,
        application_id,
        priority,
        status,
        status_reason,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
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
      .eq('course_id', courseId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (status) {
      choicesQuery = choicesQuery.eq('status', status)
    }

    if (priority) {
      const priorityNum = parseInt(priority, 10)
      if (priorityNum === 1 || priorityNum === 2) {
        choicesQuery = choicesQuery.eq('priority', priorityNum)
      }
    }

    // Get total count
    let countQuery = supabase
      .from('application_choices')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (priority) {
      const priorityNum = parseInt(priority, 10)
      if (priorityNum === 1 || priorityNum === 2) {
        countQuery = countQuery.eq('priority', priorityNum)
      }
    }

    const { count: totalChoices } = await countQuery

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

    if (!choices || choices.length === 0) {
      return NextResponse.json({
        choices: [],
        grouped: [],
        total: 0,
      })
    }

    // Get unique application IDs
    const applicationIds = [...new Set(choices.map(c => c.application_id))]

    // Fetch applications with applicant info
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
        applicant:applicant_accounts(
          id,
          email,
          cellphone,
          platform_student_number
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

    // Enrich choices with application data
    const enrichedChoices = choices.map(choice => {
      const application = applicationsMap.get(choice.application_id)
      return {
        choiceId: choice.id,
        applicationId: choice.application_id,
        priority: choice.priority,
        status: choice.status,
        statusReason: choice.status_reason,
        reviewedBy: choice.reviewed_by,
        reviewedAt: choice.reviewed_at,
        createdAt: choice.created_at,
        updatedAt: choice.updated_at,
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
        } : null,
      }
    })

    // Group by application for convenience
    const groupedByApplication = applicationIds.map(appId => {
      const appChoices = enrichedChoices.filter(c => c.applicationId === appId)
      const application = applicationsMap.get(appId)
      return {
        applicationId: appId,
        application: application ? {
          id: application.id,
          applicantId: application.applicant_id,
          personalInfo: application.personal_info,
          academicInfo: application.academic_info,
          applicationStatus: application.status,
          createdAt: application.created_at,
          updatedAt: application.updated_at,
          applicant: application.applicant,
        } : null,
        choices: appChoices.map(c => ({
          choiceId: c.choiceId,
          priority: c.priority,
          status: c.status,
          statusReason: c.statusReason,
          reviewedBy: c.reviewedBy,
          reviewedAt: c.reviewedAt,
          faculty: c.faculty,
          campus: c.campus,
        })),
      }
    })

    return NextResponse.json({
      choices: enrichedChoices,
      grouped: groupedByApplication,
      total: totalChoices || 0,
    })
  } catch (error) {
    console.error(
      'Error in GET /api/courses/[id]/applications:',
      error
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
