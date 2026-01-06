import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string; campusId: string }>
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

// GET /api/institutions/[institutionId]/campuses/[campusId] - Get a specific campus
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, campusId } = await params

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    const { data: campus, error } = await supabase
      .from('campuses')
      .select('*')
      .eq('id', campusId)
      .eq('institution_id', institutionId)
      .single()

    if (error || !campus) {
      return NextResponse.json(
        { error: 'Campus not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/campuses/[campusId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/institutions/[institutionId]/campuses/[campusId] - Update a campus
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, campusId } = await params

    // Verify access - only admins can update campuses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update campuses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, location, is_main } = body

    const supabase = createServiceClient()

    // Verify campus belongs to this institution
    const { data: existingCampus, error: checkError } = await supabase
      .from('campuses')
      .select('id')
      .eq('id', campusId)
      .eq('institution_id', institutionId)
      .single()

    if (checkError || !existingCampus) {
      return NextResponse.json(
        { error: 'Campus not found' },
        { status: 404 }
      )
    }

    // If this campus is being set as main, unset any existing main campus
    if (is_main) {
      await supabase
        .from('campuses')
        .update({ is_main: false })
        .eq('institution_id', institutionId)
        .eq('is_main', true)
        .neq('id', campusId)
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code
    if (location !== undefined) updates.location = location
    if (is_main !== undefined) updates.is_main = is_main

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: campus, error } = await supabase
      .from('campuses')
      .update(updates)
      .eq('id', campusId)
      .eq('institution_id', institutionId)
      .select()
      .single()

    if (error) {
      console.error('Campus update error:', error)
      return NextResponse.json(
        { error: 'Failed to update campus' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('Error in PUT /api/institutions/[institutionId]/campuses/[campusId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/institutions/[institutionId]/campuses/[campusId] - Delete a campus
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, campusId } = await params

    // Verify access - only admins can delete campuses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete campuses' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Check if campus has any dependent faculties or courses
    const { data: faculties } = await supabase
      .from('faculties')
      .select('id')
      .eq('campus_id', campusId)
      .limit(1)

    if (faculties && faculties.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete campus with existing faculties. Please delete or reassign faculties first.' },
        { status: 409 }
      )
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('campus_id', campusId)
      .limit(1)

    if (courses && courses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete campus with existing courses. Please delete or reassign courses first.' },
        { status: 409 }
      )
    }

    // Delete the campus
    const { error } = await supabase
      .from('campuses')
      .delete()
      .eq('id', campusId)
      .eq('institution_id', institutionId)

    if (error) {
      console.error('Campus deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete campus' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/institutions/[institutionId]/campuses/[campusId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
