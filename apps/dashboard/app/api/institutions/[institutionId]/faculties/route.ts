import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

// GET /api/institutions/[institutionId]/faculties - List all faculties for an institution
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

    // Get optional campus_id filter from query params
    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get('campus_id')

    let query = supabase
      .from('faculties')
      .select(`
        *,
        campus:campuses(id, name, code)
      `)
      .eq('institution_id', institutionId)
      .order('name', { ascending: true })

    if (campusId) {
      query = query.eq('campus_id', campusId)
    }

    const { data: faculties, error } = await query

    if (error) {
      console.error('Error fetching faculties:', error)
      return NextResponse.json(
        { error: 'Failed to fetch faculties' },
        { status: 500 }
      )
    }

    return NextResponse.json({ faculties })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/faculties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/institutions/[institutionId]/faculties - Create a new faculty
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access - only admins can create faculties
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create faculties' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, description, campus_id } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

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

    const { data: faculty, error } = await supabase
      .from('faculties')
      .insert({
        institution_id: institutionId,
        name,
        code: code || null,
        description: description || null,
        campus_id: campus_id || null,
      })
      .select(`
        *,
        campus:campuses(id, name, code)
      `)
      .single()

    if (error) {
      console.error('Faculty creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create faculty' },
        { status: 500 }
      )
    }

    return NextResponse.json({ faculty }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/institutions/[institutionId]/faculties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
