import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ choiceId: string }>
}

// Valid status values for application choices
const VALID_STATUSES = [
  'pending',
  'under_review',
  'conditionally_accepted',
  'accepted',
  'rejected',
  'waitlisted',
  'withdrawn',
] as const

type ChoiceStatus = typeof VALID_STATUSES[number]

/**
 * Verify user has access to update this choice
 * User must be an admin or reviewer of the institution
 */
async function verifyChoiceAccess(
  clerkUserId: string,
  choiceId: string
): Promise<{ userId: string; role: string; institutionId: string } | null> {
  const supabase = createServiceClient()

  // Get the choice to find its institution
  const { data: choice, error: choiceError } = await supabase
    .from('application_choices')
    .select('institution_id')
    .eq('id', choiceId)
    .single()

  if (choiceError || !choice) {
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

  // Check membership for the choice's institution
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', choice.institution_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  return { userId: user.id, role: membership.role, institutionId: choice.institution_id }
}

// GET /api/application-choices/[choiceId]
// Get a specific application choice
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { choiceId } = await params

    // Verify access
    const access = await verifyChoiceAccess(clerkUserId, choiceId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this application choice' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    const { data: choice, error } = await supabase
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
        ),
        institution:institutions(
          id,
          name,
          code
        )
      `)
      .eq('id', choiceId)
      .single()

    if (error || !choice) {
      return NextResponse.json(
        { error: 'Application choice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ choice })
  } catch (error) {
    console.error('Error in GET /api/application-choices/[choiceId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/application-choices/[choiceId]
// Update choice status (for reviewers)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { choiceId } = await params

    // Verify access - only institution members can update
    const access = await verifyChoiceAccess(clerkUserId, choiceId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this application choice' },
        { status: 403 }
      )
    }

    // Only admins and reviewers can update choice status
    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to update application choices' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, status_reason } = body

    // Validate status if provided
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as ChoiceStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    const supabase = createServiceClient()

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      updates.status = status
    }

    if (status_reason !== undefined) {
      updates.status_reason = status_reason
    }

    // Update the choice
    const { data: updatedChoice, error: updateError } = await supabase
      .from('application_choices')
      .update(updates)
      .eq('id', choiceId)
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
        ),
        institution:institutions(
          id,
          name,
          code
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating application choice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update application choice' },
        { status: 500 }
      )
    }

    if (!updatedChoice) {
      return NextResponse.json(
        { error: 'Application choice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ choice: updatedChoice })
  } catch (error) {
    console.error('Error in PATCH /api/application-choices/[choiceId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
