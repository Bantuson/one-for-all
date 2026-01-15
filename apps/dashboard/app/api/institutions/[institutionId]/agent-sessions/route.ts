import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ institutionId: string }>
}

// Valid agent types from database constraint
const VALID_AGENT_TYPES = [
  'document_reviewer',
  'aps_ranking',
  'reviewer_assistant',
  'analytics',
  'notification_sender',
] as const

type AgentType = (typeof VALID_AGENT_TYPES)[number]

/**
 * Verify user has access to the institution
 * Returns the user's ID and role if they have access
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

// GET /api/institutions/[institutionId]/agent-sessions - List agent sessions
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const supabase = createServiceClient()

    // Fetch recent sessions for this institution
    const { data: sessions, error } = await supabase
      .from('agent_sessions')
      .select('id, agent_type, status, processed_items, total_items, created_at, started_at, completed_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Agent sessions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agent sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Agent sessions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/institutions/[institutionId]/agent-sessions - Create new agent session
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params

    // Verify access (must be admin or reviewer)
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run agents' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { agent_type, instructions, target_type, target_ids } = body

    // Validate agent type
    if (!agent_type || !VALID_AGENT_TYPES.includes(agent_type)) {
      return NextResponse.json(
        { error: `Invalid agent_type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Create agent session
    const { data: session, error: insertError } = await supabase
      .from('agent_sessions')
      .insert({
        institution_id: institutionId,
        agent_type: agent_type as AgentType,
        status: 'pending',
        input_context: { instructions: instructions || '' },
        target_type: target_type || null,
        target_ids: target_ids || [],
        initiated_by: access.userId,
      })
      .select('id, agent_type, status, processed_items, total_items, created_at')
      .single()

    if (insertError) {
      console.error('Agent session create error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create agent session' },
        { status: 500 }
      )
    }

    // TODO: In production, this would trigger the actual agent execution
    // via a background job queue (e.g., Supabase Edge Function, AWS Lambda)
    // For now, we just create the session and return it

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Agent session POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
