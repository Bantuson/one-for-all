import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ sessionId: string }>
}

/**
 * GET /api/agents/sessions/[sessionId]/messages
 *
 * Get messages for a session in a format suitable for chat history display.
 * Parses agent_decisions and session progress into ChatMessage-compatible objects.
 *
 * Response:
 * - messages: Array of ChatMessage-compatible objects
 * - hasMore: Whether there are more messages available
 */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    type?: string
    confidence?: number
    targetId?: string
    chartConfig?: unknown
    citations?: string[]
  }
}

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

    // Get agent decisions for this session
    const { data: decisions } = await supabase
      .from('agent_decisions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Build messages array
    const messages: ChatMessage[] = []

    // Add initial user message from input_context
    const inputContext = session.input_context as Record<string, unknown> | null
    if (inputContext) {
      const userMessage =
        (inputContext.message as string) ||
        (inputContext.question as string) ||
        (inputContext.query as string) ||
        (inputContext.instructions as string)

      if (userMessage) {
        messages.push({
          id: `${sessionId}-user-initial`,
          role: 'user',
          content: userMessage,
          timestamp: session.created_at,
        })
      }
    }

    // Add system message for session start
    if (session.started_at) {
      messages.push({
        id: `${sessionId}-system-start`,
        role: 'system',
        content: getStartMessage(session.agent_type),
        timestamp: session.started_at,
      })
    }

    // Convert decisions to messages
    if (decisions && decisions.length > 0) {
      const decisionMessages = decisions.map((decision) =>
        decisionToMessage(decision, session.agent_type)
      )
      messages.push(...decisionMessages)
    }

    // Add output/completion message
    if (session.status === 'completed' && session.output_result) {
      const outputMessage = createOutputMessage(
        sessionId,
        session.agent_type,
        session.output_result as Record<string, unknown>,
        session.completed_at
      )
      if (outputMessage) {
        messages.push(outputMessage)
      }
    }

    // Add error message if failed
    if (session.status === 'failed' && session.error_message) {
      messages.push({
        id: `${sessionId}-error`,
        role: 'system',
        content: `Error: ${session.error_message}`,
        timestamp: session.completed_at || session.created_at,
      })
    }

    // Add progress message if still running
    if (session.status === 'running') {
      const processed = session.processed_items || 0
      const total = session.total_items || 0
      messages.push({
        id: `${sessionId}-progress`,
        role: 'system',
        content: `Processing... ${processed}/${total} items completed`,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      messages,
      sessionStatus: session.status,
      hasMore: false, // For now, we return all messages
    })
  } catch (error) {
    console.error('Session messages GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get a start message based on agent type
 */
function getStartMessage(agentType: string): string {
  switch (agentType) {
    case 'document_reviewer':
      return 'Starting document review analysis...'
    case 'aps_ranking':
      return 'Calculating APS scores and rankings...'
    case 'reviewer_assistant':
      return 'Searching knowledge base for relevant information...'
    case 'analytics':
      return 'Running analytics query...'
    default:
      return 'Processing request...'
  }
}

/**
 * Convert an agent decision to a chat message
 */
function decisionToMessage(
  decision: Record<string, unknown>,
  agentType: string
): ChatMessage {
  const decisionType = decision.decision_type as string
  const decisionValue = decision.decision_value as Record<string, unknown> | undefined
  const reasoning = decision.reasoning as string | undefined

  let content = ''
  const metadata: ChatMessage['metadata'] = {
    type: decisionType,
    confidence: decision.confidence_score as number | undefined,
    targetId: decision.target_id as string | undefined,
  }

  switch (agentType) {
    case 'document_reviewer':
      if (decisionType === 'document_approved') {
        content = `Document approved.${reasoning ? ` ${reasoning}` : ''}`
      } else if (decisionType === 'document_flagged') {
        content = `Document flagged: ${decisionValue?.flag_reason || 'Review required'}${reasoning ? `. ${reasoning}` : ''}`
      }
      break

    case 'aps_ranking':
      if (decisionType === 'aps_score_calculated') {
        content = `APS Score: ${decisionValue?.total_aps} (Best 6: ${decisionValue?.best_six_total})`
      } else if (decisionType === 'eligibility_checked') {
        const eligible = decisionValue?.eligible ? 'Eligible' : 'Not eligible'
        content = `${eligible}${decisionValue?.reason ? `: ${decisionValue.reason}` : ''}`
      }
      break

    case 'reviewer_assistant':
      if (decisionType === 'question_answer') {
        content = (decisionValue?.answer as string) || reasoning || 'Response generated'
        if (decisionValue?.citations) {
          metadata.citations = decisionValue.citations as string[]
        }
      }
      break

    case 'analytics':
      if (decisionType === 'chart_generated') {
        content = `Generated chart: ${decisionValue?.title || 'Analytics visualization'}`
        metadata.chartConfig = decisionValue?.chart_config
      }
      break

    default:
      content = reasoning || `Decision: ${decisionType}`
  }

  return {
    id: decision.id as string,
    role: 'assistant',
    content: content || `Processed: ${decisionType}`,
    timestamp: decision.created_at as string,
    metadata,
  }
}

/**
 * Create final output message for completed sessions
 */
function createOutputMessage(
  sessionId: string,
  agentType: string,
  outputResult: Record<string, unknown>,
  completedAt: string | null
): ChatMessage | null {
  let content = ''
  const metadata: ChatMessage['metadata'] = {}

  switch (agentType) {
    case 'document_reviewer':
      const docSummary = outputResult.summary as Record<string, unknown> | undefined
      if (docSummary) {
        content = `Review complete. ${docSummary.approved || 0} approved, ${docSummary.flagged || 0} flagged out of ${docSummary.total || 0} documents.`
      }
      break

    case 'aps_ranking':
      const rankingSummary = outputResult.statistics as Record<string, unknown> | undefined
      if (rankingSummary) {
        content = `Ranking complete. ${rankingSummary.count || 0} applications ranked. Average APS: ${rankingSummary.average || 'N/A'}, Range: ${rankingSummary.lowest || 'N/A'} - ${rankingSummary.highest || 'N/A'}`
      }
      break

    case 'reviewer_assistant':
      if (outputResult.answer) {
        content = outputResult.answer as string
        if (outputResult.citations) {
          metadata.citations = outputResult.citations as string[]
        }
      }
      break

    case 'analytics':
      if (outputResult.chart_config) {
        content = `Chart generated: ${outputResult.title || 'Analytics visualization'}`
        metadata.chartConfig = outputResult.chart_config
        metadata.type = outputResult.chart_type as string
      }
      break

    default:
      if (outputResult.success !== undefined) {
        content = outputResult.success
          ? 'Task completed successfully.'
          : 'Task completed with issues.'
      }
  }

  if (!content) {
    return null
  }

  return {
    id: `${sessionId}-output`,
    role: 'assistant',
    content,
    timestamp: completedAt || new Date().toISOString(),
    metadata,
  }
}
