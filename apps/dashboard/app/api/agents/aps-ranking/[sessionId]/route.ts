import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ sessionId: string }>
}

/**
 * APS Ranking Session Detail Endpoint
 *
 * GET /api/agents/aps-ranking/[sessionId]
 * Returns session details and associated agent_decisions (APS calculations)
 */

/**
 * Verify user has access to the session's institution
 */
async function verifySessionAccess(
  clerkUserId: string,
  sessionId: string
): Promise<{ session: Record<string, unknown>; userId: string; role: string } | null> {
  const supabase = createServiceClient()

  // Get session with institution
  const { data: session, error: sessionError } = await supabase
    .from('agent_sessions')
    .select('*, institution_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
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

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', session.institution_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  return { session, userId: user.id, role: membership.role }
}

/**
 * GET /api/agents/aps-ranking/[sessionId] - Get session details and results
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    // Verify access
    const access = await verifySessionAccess(clerkUserId, sessionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    const { session } = access
    const supabase = createServiceClient()

    // Fetch agent decisions for this session
    const { data: decisions, error: decisionsError } = await supabase
      .from('agent_decisions')
      .select(
        'id, application_id, decision_type, decision_value, reasoning, confidence_score, created_at'
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (decisionsError) {
      console.error('Agent decisions fetch error:', decisionsError)
      // Continue without decisions - session data is still valuable
    }

    // Group decisions by type
    const apsScores = decisions?.filter(
      (d) => d.decision_type === 'aps_score_calculated'
    ) || []
    const eligibilityChecks = decisions?.filter(
      (d) => d.decision_type === 'eligibility_checked'
    ) || []

    // Calculate summary statistics
    const apsValues = apsScores
      .map((d) => d.decision_value?.total_aps)
      .filter((v): v is number => typeof v === 'number')

    const summary = {
      total_processed: apsScores.length,
      aps_calculated: apsScores.length,
      eligibility_checked: eligibilityChecks.length,
      statistics: apsValues.length > 0
        ? {
            average_aps: Math.round(
              apsValues.reduce((a, b) => a + b, 0) / apsValues.length * 10
            ) / 10,
            highest_aps: Math.max(...apsValues),
            lowest_aps: Math.min(...apsValues),
            range: Math.max(...apsValues) - Math.min(...apsValues),
          }
        : null,
    }

    // Build ranked list
    const rankedApplications = apsScores
      .map((d) => ({
        application_id: d.application_id,
        total_aps: d.decision_value?.total_aps,
        aps_with_decimal: d.decision_value?.aps_with_decimal,
        best_six_total: d.decision_value?.best_six_total,
        lo_contribution: d.decision_value?.lo_contribution,
        subjects_counted: d.decision_value?.subjects_counted,
        calculated_at: d.created_at,
        eligibility: eligibilityChecks.find(
          (e) => e.application_id === d.application_id
        )?.decision_value,
      }))
      .sort((a, b) => (b.total_aps || 0) - (a.total_aps || 0))
      .map((app, index) => ({ ...app, rank: index + 1 }))

    return NextResponse.json({
      session: {
        id: session.id,
        agent_type: session.agent_type,
        status: session.status,
        processed_items: session.processed_items,
        total_items: session.total_items,
        created_at: session.created_at,
        started_at: session.started_at,
        completed_at: session.completed_at,
        error_message: session.error_message,
        target_ids: session.target_ids,
      },
      summary,
      ranked_applications: rankedApplications,
      decisions: {
        aps_scores: apsScores,
        eligibility_checks: eligibilityChecks,
      },
    })
  } catch (error) {
    console.error('APS ranking session GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
