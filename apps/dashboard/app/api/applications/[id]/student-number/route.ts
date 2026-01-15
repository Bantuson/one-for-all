import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * Verify user has access to view this application's student number
 * User must be a member of an institution where the application has choices
 */
async function verifyApplicationAccess(
  clerkUserId: string,
  applicationId: string
): Promise<{ userId: string; role: string; institutionIds: string[] } | null> {
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

  // Get all institutions this application has choices for
  const { data: choices, error: choicesError } = await supabase
    .from('application_choices')
    .select('institution_id')
    .eq('application_id', applicationId)

  if (choicesError || !choices || choices.length === 0) {
    return null
  }

  const institutionIds = [...new Set(choices.map(c => c.institution_id))]

  // Check if user is a member of any of these institutions
  const { data: memberships, error: membershipError } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .in('institution_id', institutionIds)

  if (membershipError || !memberships || memberships.length === 0) {
    return null
  }

  // Get the highest privilege role (admin > reviewer > others)
  const roleOrder = ['admin', 'reviewer', 'viewer']
  const firstRole = memberships[0]?.role || 'viewer'
  const highestRole = memberships.reduce((best, current) => {
    const currentIndex = roleOrder.indexOf(current.role)
    const bestIndex = roleOrder.indexOf(best)
    return currentIndex !== -1 && (currentIndex < bestIndex || bestIndex === -1)
      ? current.role
      : best
  }, firstRole)

  return {
    userId: user.id,
    role: highestRole,
    institutionIds: memberships.map(m => m.institution_id),
  }
}

// GET /api/applications/[id]/student-number
// Get student number (only reveals institution number if accepted)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: applicationId } = await params

    // Verify access - only institution members can view student numbers
    const access = await verifyApplicationAccess(clerkUserId, applicationId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this application' },
        { status: 403 }
      )
    }

    // Only admins and reviewers can view student numbers
    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to view student numbers' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Get application with applicant info
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        applicant:applicant_accounts(
          id,
          platform_student_number,
          institution_student_numbers
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get application choices with institution info
    const { data: choices, error: choicesError } = await supabase
      .from('application_choices')
      .select(`
        id,
        priority,
        status,
        institution_id,
        institution:institutions(
          id,
          code,
          name
        )
      `)
      .eq('application_id', applicationId)
      .order('priority', { ascending: true })

    if (choicesError) {
      console.error('Error fetching application choices:', choicesError)
      return NextResponse.json(
        { error: 'Failed to fetch application choices' },
        { status: 500 }
      )
    }

    // Check if any choice has status='accepted'
    const hasAcceptedChoice = choices?.some(c => c.status === 'accepted')

    // Extract applicant data (Supabase may return as array or single object)
    type ApplicantData = {
      id: string
      platform_student_number: string | null
      institution_student_numbers: Record<string, string> | null
    }
    const applicantData = Array.isArray(application.applicant)
      ? (application.applicant[0] as ApplicantData | undefined)
      : (application.applicant as ApplicantData | null)

    // Get platform student number (always shown to authorized users)
    const platformStudentNumber = applicantData?.platform_student_number || null

    // Get institution student numbers (JSONB map)
    const institutionStudentNumbers: Record<string, string> =
      (applicantData?.institution_student_numbers as Record<string, string>) || {}

    // Build response with institution numbers (only revealed if accepted)
    const institutionNumbers: Array<{
      institutionId: string
      institutionCode: string
      institutionName: string
      studentNumber: string | null
      revealed: boolean
      choiceStatus: string
      priority: number
    }> = []

    for (const choice of choices || []) {
      // Extract institution data (may be array or single object from join)
      type InstitutionData = { id: string; code: string; name: string }
      const institutionRaw = choice.institution
      const institution: InstitutionData | null = Array.isArray(institutionRaw)
        ? (institutionRaw[0] as InstitutionData | undefined) || null
        : (institutionRaw as InstitutionData | null)

      if (!institution) continue

      // Only show institution student number if this choice is accepted
      // AND user has access to this institution
      const isAccepted = choice.status === 'accepted'
      const hasAccess = access.institutionIds.includes(choice.institution_id)
      const institutionCode = institution.code

      const studentNumber = isAccepted && hasAccess && institutionCode
        ? (institutionStudentNumbers[institutionCode] || null)
        : null

      institutionNumbers.push({
        institutionId: choice.institution_id,
        institutionCode: institutionCode || '',
        institutionName: institution.name || '',
        studentNumber,
        revealed: isAccepted && hasAccess,
        choiceStatus: choice.status,
        priority: choice.priority,
      })
    }

    return NextResponse.json({
      applicationId,
      applicantId: application.applicant_id,
      platformStudentNumber,
      hasAcceptedChoice,
      institutionNumbers,
    })
  } catch (error) {
    console.error(
      'Error in GET /api/applications/[applicationId]/student-number:',
      error
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
