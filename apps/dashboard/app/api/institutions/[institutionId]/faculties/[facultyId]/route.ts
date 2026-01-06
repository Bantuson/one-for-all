import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string; facultyId: string }>
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

// GET /api/institutions/[institutionId]/faculties/[facultyId] - Get a specific faculty
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, facultyId } = await params

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    const { data: faculty, error } = await supabase
      .from('faculties')
      .select(`
        *,
        campus:campuses(id, name, code)
      `)
      .eq('id', facultyId)
      .eq('institution_id', institutionId)
      .single()

    if (error || !faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ faculty })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/faculties/[facultyId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/institutions/[institutionId]/faculties/[facultyId] - Update a faculty
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, facultyId } = await params

    // Verify access - only admins can update faculties
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update faculties' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, description, campus_id } = body

    const supabase = createServiceClient()

    // Verify faculty belongs to this institution
    const { data: existingFaculty, error: checkError } = await supabase
      .from('faculties')
      .select('id')
      .eq('id', facultyId)
      .eq('institution_id', institutionId)
      .single()

    if (checkError || !existingFaculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
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

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code
    if (description !== undefined) updates.description = description
    if (campus_id !== undefined) updates.campus_id = campus_id

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: faculty, error } = await supabase
      .from('faculties')
      .update(updates)
      .eq('id', facultyId)
      .eq('institution_id', institutionId)
      .select(`
        *,
        campus:campuses(id, name, code)
      `)
      .single()

    if (error) {
      console.error('Faculty update error:', error)
      return NextResponse.json(
        { error: 'Failed to update faculty' },
        { status: 500 }
      )
    }

    return NextResponse.json({ faculty })
  } catch (error) {
    console.error('Error in PUT /api/institutions/[institutionId]/faculties/[facultyId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/institutions/[institutionId]/faculties/[facultyId] - Delete a faculty
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, facultyId } = await params

    // Verify access - only admins can delete faculties
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete faculties' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Check if faculty has any dependent courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('faculty_id', facultyId)
      .limit(1)

    if (courses && courses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete faculty with existing courses. Please delete or reassign courses first.' },
        { status: 409 }
      )
    }

    // Delete the faculty
    const { error } = await supabase
      .from('faculties')
      .delete()
      .eq('id', facultyId)
      .eq('institution_id', institutionId)

    if (error) {
      console.error('Faculty deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete faculty' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/institutions/[institutionId]/faculties/[facultyId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
