import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * APS Ranking Agent API Endpoint
 *
 * This endpoint triggers the APS Ranking Agent to calculate Admission Point Scores
 * for a batch of applications. It creates an agent_session record and returns
 * the session ID for tracking progress.
 *
 * POST /api/agents/aps-ranking
 * Body: {
 *   institution_id: string,
 *   target_ids: string[],        // Application IDs to process
 *   instructions?: string        // Optional additional instructions
 * }
 *
 * Response: {
 *   session: { id, agent_type, status, ... }
 * }
 */

interface APSRankingRequest {
  institution_id: string
  target_ids: string[]
  instructions?: string
}

/**
 * Verify user has access to the institution with appropriate role
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

  // Check membership and role
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

/**
 * POST /api/agents/aps-ranking - Create new APS ranking session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: APSRankingRequest = await request.json()
    const { institution_id, target_ids, instructions } = body

    // Validate required fields
    if (!institution_id) {
      return NextResponse.json(
        { error: 'institution_id is required' },
        { status: 400 }
      )
    }

    if (!target_ids || !Array.isArray(target_ids) || target_ids.length === 0) {
      return NextResponse.json(
        { error: 'target_ids must be a non-empty array of application IDs' },
        { status: 400 }
      )
    }

    // Verify access (must be admin or reviewer)
    const access = await verifyInstitutionAccess(clerkUserId, institution_id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run APS ranking agent' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Verify all target applications exist and belong to the institution
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('institution_id', institution_id)
      .in('id', target_ids)

    if (appError) {
      console.error('Application verification error:', appError)
      return NextResponse.json(
        { error: 'Failed to verify applications' },
        { status: 500 }
      )
    }

    if (!applications || applications.length !== target_ids.length) {
      const foundIds = applications?.map((a) => a.id) || []
      const missingIds = target_ids.filter((id) => !foundIds.includes(id))
      return NextResponse.json(
        {
          error: 'Some applications not found or do not belong to this institution',
          missing_ids: missingIds,
        },
        { status: 400 }
      )
    }

    // Create agent session for APS ranking
    const { data: session, error: insertError } = await supabase
      .from('agent_sessions')
      .insert({
        institution_id,
        agent_type: 'aps_ranking',
        status: 'pending',
        input_context: {
          instructions: instructions || 'Calculate APS scores and assess eligibility',
          requested_at: new Date().toISOString(),
        },
        target_type: 'application',
        target_ids,
        total_items: target_ids.length,
        processed_items: 0,
        initiated_by: access.userId,
      })
      .select(
        'id, agent_type, status, processed_items, total_items, created_at, target_ids'
      )
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
    // For now, we create the session and return it for polling

    // Return the created session
    return NextResponse.json(
      {
        session,
        message: 'APS ranking session created successfully',
        next_steps: [
          'Poll GET /api/agents/aps-ranking/{session_id} for status',
          'Results will be stored in agent_decisions table',
        ],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('APS ranking POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/aps-ranking - Get APS ranking sessions for an institution
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const institutionId = searchParams.get('institution_id')

    if (!institutionId) {
      return NextResponse.json(
        { error: 'institution_id query parameter is required' },
        { status: 400 }
      )
    }

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Fetch recent APS ranking sessions for this institution
    const { data: sessions, error } = await supabase
      .from('agent_sessions')
      .select(
        'id, agent_type, status, processed_items, total_items, created_at, started_at, completed_at, error_message'
      )
      .eq('institution_id', institutionId)
      .eq('agent_type', 'aps_ranking')
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
    console.error('APS ranking GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
