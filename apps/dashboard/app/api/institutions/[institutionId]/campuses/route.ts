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

// GET /api/institutions/[institutionId]/campuses - List all campuses for an institution
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

    const { data: campuses, error } = await supabase
      .from('campuses')
      .select('*')
      .eq('institution_id', institutionId)
      .order('is_main', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching campuses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campuses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campuses })
  } catch (error) {
    console.error('Error in GET /api/institutions/[institutionId]/campuses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/institutions/[institutionId]/campuses - Create a new campus
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access - only admins can create campuses
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (access.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create campuses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, location, is_main } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // If this campus is being set as main, unset any existing main campus
    if (is_main) {
      await supabase
        .from('campuses')
        .update({ is_main: false })
        .eq('institution_id', institutionId)
        .eq('is_main', true)
    }

    const { data: campus, error } = await supabase
      .from('campuses')
      .insert({
        institution_id: institutionId,
        name,
        code: code || null,
        location: location || null,
        is_main: is_main || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Campus creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create campus' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campus }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/institutions/[institutionId]/campuses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
