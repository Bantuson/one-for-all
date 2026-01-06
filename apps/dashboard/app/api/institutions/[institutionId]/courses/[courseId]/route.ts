import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string; courseId: string }>
}

// Valid course levels from database constraint
const VALID_LEVELS = [
  'undergraduate',
  'honours',
  'postgraduate',
  'masters',
  'doctoral',
  'diploma',
  'advanced-diploma',
  'btech',
  'mtech',
  'dtech',
  'certificate',
  'short-course',
] as const

type CourseLevel = (typeof VALID_LEVELS)[number]

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

// GET /api/institutions/[institutionId]/courses/[courseId] - Get a specific course
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, courseId } = await params

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        faculty:faculties(id, name, code),
        campus:campuses(id, name, code)
      `)
      .eq('id', courseId)
      .eq('institution_id', institutionId)
      .single()

    if (error || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/courses/[courseId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/institutions/[institutionId]/courses/[courseId] - Update a course
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, courseId } = await params

    // Verify access - only admins can update courses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update courses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      code,
      level,
      description,
      duration_years,
      requirements,
      status,
      programme_type,
      faculty_id,
      campus_id,
    } = body

    const supabase = createServiceClient()

    // Verify course belongs to this institution
    const { data: existingCourse, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('institution_id', institutionId)
      .single()

    if (checkError || !existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Validate level if provided
    if (level && !VALID_LEVELS.includes(level as CourseLevel)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }

    // If faculty_id is provided, verify it belongs to this institution
    if (faculty_id) {
      const { data: faculty, error: facultyError } = await supabase
        .from('faculties')
        .select('id')
        .eq('id', faculty_id)
        .eq('institution_id', institutionId)
        .single()

      if (facultyError || !faculty) {
        return NextResponse.json(
          { error: 'Faculty not found or does not belong to this institution' },
          { status: 400 }
        )
      }
    }

    // If campus_id is provided, verify it belongs to this institution
    if (campus_id) {
      const { data: campus, error: campusError } = await supabase
        .from('campuses')
        .select('id')
        .eq('id', campus_id)
        .eq('institution_id', institutionId)
        .single()

      if (campusError || !campus) {
        return NextResponse.json(
          { error: 'Campus not found or does not belong to this institution' },
          { status: 400 }
        )
      }
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code
    if (level !== undefined) updates.level = level
    if (description !== undefined) updates.description = description
    if (duration_years !== undefined) updates.duration_years = duration_years
    if (requirements !== undefined) updates.requirements = requirements
    if (status !== undefined) updates.status = status
    if (programme_type !== undefined) updates.programme_type = programme_type
    if (faculty_id !== undefined) updates.faculty_id = faculty_id
    if (campus_id !== undefined) updates.campus_id = campus_id

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('institution_id', institutionId)
      .select(`
        *,
        faculty:faculties(id, name, code),
        campus:campuses(id, name, code)
      `)
      .single()

    if (error) {
      console.error('Course update error:', error)
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error in PUT /api/institutions/[institutionId]/courses/[courseId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/institutions/[institutionId]/courses/[courseId] - Delete a course
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, courseId } = await params

    // Verify access - only admins can delete courses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete courses' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Check if course has any dependent applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id')
      .eq('course_id', courseId)
      .limit(1)

    if (applications && applications.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with existing applications. Consider archiving the course instead by setting status to "archived".' },
        { status: 409 }
      )
    }

    // Delete the course
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('institution_id', institutionId)

    if (error) {
      console.error('Course deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/institutions/[institutionId]/courses/[courseId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
