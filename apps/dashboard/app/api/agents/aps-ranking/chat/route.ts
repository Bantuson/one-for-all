import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifyInstitutionAccess,
  getOrCreateChatSession,
} from '../../_shared/auth'

/**
 * POST /api/agents/aps-ranking/chat
 *
 * Handle APS ranking chat messages with intake limit parsing.
 * Creates or continues a chat session for APS score calculations.
 *
 * Request body:
 * - sessionId?: string - Existing session ID to continue conversation
 * - message: string - The user's message/instruction
 * - institutionId: string - Institution context
 * - courseId?: string - Optional course context for ranking within a course
 * - intakeLimit?: number - Maximum number of students to accept (can also be parsed from message)
 * - applicationIds?: string[] - Specific applications to rank (optional)
 *
 * Response:
 * - sessionId: string - The session ID for tracking
 * - status: 'pending' | 'running' - Session status
 * - needsIntakeLimit?: boolean - If true, the intake limit was not found and is needed
 * - applicationsQueued?: number - Number of applications queued for ranking
 */

interface APSRankingChatRequest {
  sessionId?: string
  message: string
  institutionId: string
  courseId?: string
  intakeLimit?: number
  applicationIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: APSRankingChatRequest = await request.json()
    const {
      sessionId,
      message,
      institutionId,
      courseId,
      intakeLimit,
      applicationIds,
    } = body

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!institutionId) {
      return NextResponse.json(
        { error: 'institutionId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the institution
    const access = await verifyInstitutionAccess(institutionId, [
      'admin',
      'reviewer',
    ])
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Try to parse intake limit from message if not explicitly provided
    let parsedIntakeLimit = intakeLimit
    if (!parsedIntakeLimit) {
      parsedIntakeLimit = parseIntakeLimitFromMessage(message)
    }

    // Check if this is an existing session that already has intake limit
    if (sessionId && !parsedIntakeLimit) {
      const { data: existingSession } = await supabase
        .from('agent_sessions')
        .select('input_context')
        .eq('id', sessionId)
        .single()

      if (existingSession?.input_context) {
        const context = existingSession.input_context as Record<string, unknown>
        parsedIntakeLimit = context.intake_limit as number | undefined
      }
    }

    // If still no intake limit found and this looks like an initial ranking request,
    // prompt for it
    const isRankingRequest =
      message.toLowerCase().includes('rank') ||
      message.toLowerCase().includes('aps') ||
      message.toLowerCase().includes('score') ||
      message.toLowerCase().includes('calculate')

    if (!parsedIntakeLimit && isRankingRequest && !sessionId) {
      // Create a session that needs the intake limit
      const session = await getOrCreateChatSession({
        sessionId,
        institutionId,
        agentType: 'aps_ranking',
        inputContext: {
          message,
          needs_intake_limit: true,
          course_id: courseId,
          requested_at: new Date().toISOString(),
        },
        targetType: 'application',
        targetIds: [],
        initiatedBy: access.userId,
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        sessionId: session.id,
        status: 'pending',
        isNewSession: session.isNew,
        needsIntakeLimit: true,
        message:
          'How many students should be accepted? Please specify the intake limit.',
      })
    }

    // Determine which applications to process
    let targetApplicationIds: string[] = applicationIds || []

    // If no specific applications provided, find pending applications
    if (targetApplicationIds.length === 0) {
      let query = supabase
        .from('application_choices')
        .select('application_id')
        .eq('institution_id', institutionId)
        .eq('status', 'pending')

      if (courseId) {
        query = query.eq('course_id', courseId)
      }

      const { data: pendingApps } = await query.limit(200)

      if (pendingApps) {
        // Get unique application IDs
        targetApplicationIds = [...new Set(pendingApps.map((a) => a.application_id))]
      }
    }

    // Create or update chat session
    const session = await getOrCreateChatSession({
      sessionId,
      institutionId,
      agentType: 'aps_ranking',
      inputContext: {
        message,
        instructions: parseAPSInstructions(message),
        intake_limit: parsedIntakeLimit,
        course_id: courseId,
        application_count: targetApplicationIds.length,
        requested_at: new Date().toISOString(),
      },
      targetType: 'application',
      targetIds: targetApplicationIds,
      initiatedBy: access.userId,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create chat session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      status: 'pending',
      isNewSession: session.isNew,
      needsIntakeLimit: false,
      intakeLimit: parsedIntakeLimit,
      applicationsQueued: targetApplicationIds.length,
      message: targetApplicationIds.length > 0
        ? `APS ranking session created. ${targetApplicationIds.length} application(s) will be scored and ranked.${parsedIntakeLimit ? ` Top ${parsedIntakeLimit} will be recommended for acceptance.` : ''}`
        : 'No pending applications found for the specified criteria.',
    })
  } catch (error) {
    console.error('APS ranking chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse intake limit from user message
 * Looks for patterns like "top 50", "accept 100", "limit: 25", etc.
 */
function parseIntakeLimitFromMessage(message: string): number | undefined {
  const patterns = [
    /(?:top|accept|limit|intake|first|best)\s*[:=]?\s*(\d+)/i,
    /(\d+)\s*(?:students?|applicants?|places?|spots?|intake)/i,
    /(?:quota|capacity|maximum|max)\s*(?:of|is|:)?\s*(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      const num = parseInt(match[1], 10)
      if (num > 0 && num < 10000) {
        return num
      }
    }
  }

  return undefined
}

/**
 * Parse user message into structured instructions for the APS ranking agent
 */
function parseAPSInstructions(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Check for specific ranking criteria
  if (lowerMessage.includes('strict') || lowerMessage.includes('cutoff')) {
    return `Apply strict eligibility cutoffs before ranking. ${message}`
  }

  if (lowerMessage.includes('subject') || lowerMessage.includes('requirement')) {
    return `Include subject requirement checks in ranking. ${message}`
  }

  if (lowerMessage.includes('tie') || lowerMessage.includes('break')) {
    return `Apply tiebreaker rules for equal APS scores. ${message}`
  }

  // Default instructions
  return `Calculate APS scores and rank applications in order of merit. ${message}`
}
