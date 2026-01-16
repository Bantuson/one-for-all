import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ sessionId: string }>
}

/**
 * GET /api/agents/sessions/[sessionId]
 *
 * Get session details and output for display in chat interface.
 * Returns the full session with output_result parsed for chat display.
 *
 * Response:
 * - session: Full session details
 * - output: Parsed output suitable for chat display
 * - decisions: Related agent decisions
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get user's Supabase ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get session with institution check
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user has access to the institution
    const { data: membership, error: membershipError } = await supabase
      .from('institution_members')
      .select('role')
      .eq('institution_id', session.institution_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this session' },
        { status: 403 }
      )
    }

    // Get related agent decisions
    const { data: decisions } = await supabase
      .from('agent_decisions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Parse output for chat display
    const chatOutput = parseOutputForChat(
      session.agent_type,
      session.output_result,
      decisions || []
    )

    return NextResponse.json({
      session: {
        id: session.id,
        agentType: session.agent_type,
        status: session.status,
        inputContext: session.input_context,
        outputResult: session.output_result,
        outputSummary: session.output_summary,
        errorMessage: session.error_message,
        targetType: session.target_type,
        targetIds: session.target_ids,
        processedItems: session.processed_items,
        totalItems: session.total_items,
        isChatSession: session.is_chat_session,
        createdAt: session.created_at,
        startedAt: session.started_at,
        completedAt: session.completed_at,
      },
      output: chatOutput,
      decisions: decisions || [],
    })
  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface ChatOutput {
  type: 'text' | 'chart' | 'table' | 'list' | 'mixed'
  content: unknown
  summary?: string
}

/**
 * Parse agent output into a format suitable for chat display
 */
function parseOutputForChat(
  agentType: string,
  outputResult: Record<string, unknown> | null,
  decisions: Record<string, unknown>[]
): ChatOutput {
  if (!outputResult) {
    return {
      type: 'text',
      content: null,
      summary: 'Processing...',
    }
  }

  switch (agentType) {
    case 'document_reviewer':
      return parseDocumentReviewOutput(outputResult, decisions)
    case 'aps_ranking':
      return parseAPSRankingOutput(outputResult, decisions)
    case 'reviewer_assistant':
      return parseReviewerAssistantOutput(outputResult)
    case 'analytics':
      return parseAnalyticsOutput(outputResult)
    default:
      return {
        type: 'text',
        content: outputResult,
        summary: 'Results available',
      }
  }
}

function parseDocumentReviewOutput(
  output: Record<string, unknown>,
  decisions: Record<string, unknown>[]
): ChatOutput {
  const approved = decisions.filter((d) => d.decision_type === 'document_approved')
  const flagged = decisions.filter((d) => d.decision_type === 'document_flagged')

  return {
    type: 'mixed',
    content: {
      summary: {
        total: decisions.length,
        approved: approved.length,
        flagged: flagged.length,
      },
      approved: approved.map((d) => ({
        targetId: d.target_id,
        reasoning: d.reasoning,
        confidence: d.confidence_score,
      })),
      flagged: flagged.map((d) => ({
        targetId: d.target_id,
        reason: (d.decision_value as Record<string, unknown>)?.flag_reason,
        reasoning: d.reasoning,
      })),
    },
    summary: `Reviewed ${decisions.length} documents: ${approved.length} approved, ${flagged.length} flagged`,
  }
}

function parseAPSRankingOutput(
  output: Record<string, unknown>,
  decisions: Record<string, unknown>[]
): ChatOutput {
  const apsDecisions = decisions.filter(
    (d) => d.decision_type === 'aps_score_calculated'
  )

  const rankings = apsDecisions
    .map((d) => {
      const value = d.decision_value as Record<string, unknown> | undefined
      return {
        applicationId: d.target_id,
        totalAps: value?.total_aps,
        apsWithDecimal: value?.aps_with_decimal,
        subjectsCounted: value?.subjects_counted,
      }
    })
    .sort(
      (a, b) =>
        ((b.totalAps as number) || 0) - ((a.totalAps as number) || 0)
    )
    .map((item, index) => ({ ...item, rank: index + 1 }))

  const totalApsValues = rankings
    .map((r) => r.totalAps as number)
    .filter((v) => typeof v === 'number')

  return {
    type: 'table',
    content: {
      rankings,
      statistics:
        totalApsValues.length > 0
          ? {
              count: totalApsValues.length,
              average: Math.round(
                (totalApsValues.reduce((a, b) => a + b, 0) / totalApsValues.length) *
                  10
              ) / 10,
              highest: Math.max(...totalApsValues),
              lowest: Math.min(...totalApsValues),
            }
          : null,
    },
    summary: `Ranked ${rankings.length} applications by APS score`,
  }
}

function parseReviewerAssistantOutput(
  output: Record<string, unknown>
): ChatOutput {
  return {
    type: 'text',
    content: {
      answer: output.answer,
      citations: output.citations || [],
      recommendations: output.recommendations || [],
      confidence: output.confidence,
    },
    summary: output.answer ? 'Answer provided' : 'Processing...',
  }
}

function parseAnalyticsOutput(output: Record<string, unknown>): ChatOutput {
  if (output.chart_config) {
    return {
      type: 'chart',
      content: {
        chartConfig: output.chart_config,
        chartType: output.chart_type,
        title: output.title,
        saved: output.saved,
        chartId: output.chart_id,
      },
      summary: output.title as string,
    }
  }

  return {
    type: 'text',
    content: output,
    summary: 'Analytics results',
  }
}
