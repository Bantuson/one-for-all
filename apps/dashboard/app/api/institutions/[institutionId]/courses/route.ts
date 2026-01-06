import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string }>
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

// GET /api/institutions/[institutionId]/courses - List all courses for an institution
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get optional filters from query params
    const { searchParams } = new URL(request.url)
    const facultyId = searchParams.get('faculty_id')
    const campusId = searchParams.get('campus_id')
    const level = searchParams.get('level')
    const status = searchParams.get('status')

    let query = supabase
      .from('courses')
      .select(`
        *,
        faculty:faculties(id, name, code),
        campus:campuses(id, name, code)
      `)
      .eq('institution_id', institutionId)
      .order('name', { ascending: true })

    if (facultyId) {
      query = query.eq('faculty_id', facultyId)
    }
    if (campusId) {
      query = query.eq('campus_id', campusId)
    }
    if (level) {
      query = query.eq('level', level)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: courses, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/institutions/[institutionId]/courses - Create a new course
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access - only admins can create courses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create courses' },
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

    // Validate required fields
    if (!name || !code || !faculty_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, faculty_id' },
        { status: 400 }
      )
    }

    // Validate level if provided
    if (level && !VALID_LEVELS.includes(level as CourseLevel)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify faculty belongs to this institution
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

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        institution_id: institutionId,
        faculty_id,
        campus_id: campus_id || null,
        name,
        code,
        level: level || null,
        description: description || null,
        duration_years: duration_years || null,
        requirements: requirements || {},
        status: status || 'active',
        programme_type: programme_type || null,
      })
      .select(`
        *,
        faculty:faculties(id, name, code),
        campus:campuses(id, name, code)
      `)
      .single()

    if (error) {
      console.error('Course creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/institutions/[institutionId]/courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
