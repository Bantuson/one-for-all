import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string; courseId: string }>
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

// GET /api/institutions/[institutionId]/courses/[courseId]/applications
// Fetch all applications for a specific course
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId, courseId } = await params

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
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    let query = supabase
      .from('applications')
      .select('*')
      .eq('course_id', courseId)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum)
      }
    }

    if (offset) {
      const offsetNum = parseInt(offset, 10)
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + (parseInt(limit || '50', 10) - 1))
      }
    }

    const { data: applications, error, count } = await query

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      applications: applications || [],
      count: count || applications?.length || 0,
    })
  } catch (error) {
    console.error(
      'Error in GET /api/institutions/[institutionId]/courses/[courseId]/applications:',
      error
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
