import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  verifyInstitutionAccess,
  getOrCreateChatSession,
} from '../../_shared/auth'

/**
 * POST /api/agents/reviewer-assistant/chat
 *
 * Handle reviewer assistant Q&A chat messages.
 * Creates a session for RAG-based question answering about applications,
 * policies, eligibility, and institutional knowledge.
 *
 * Request body:
 * - sessionId?: string - Existing session ID to continue conversation
 * - message: string - The user's question or request
 * - institutionId: string - Institution context
 * - applicationId?: string - Optional specific application context
 * - courseId?: string - Optional specific course context
 *
 * Response:
 * - sessionId: string - The session ID for tracking
 * - status: 'pending' | 'running' - Session status
 */

interface ReviewerAssistantChatRequest {
  sessionId?: string
  message: string
  institutionId: string
  applicationId?: string
  courseId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ReviewerAssistantChatRequest = await request.json()
    const { sessionId, message, institutionId, applicationId, courseId } = body

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
    // Reviewer assistant is accessible to all institution members
    const access = await verifyInstitutionAccess(institutionId, [
      'admin',
      'reviewer',
      'member',
    ])
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    // Classify the question type for better routing
    const questionType = classifyQuestion(message)

    // Build target IDs based on context
    const targetIds: string[] = []
    if (applicationId) targetIds.push(applicationId)
    if (courseId) targetIds.push(courseId)

    // Create or update chat session
    const session = await getOrCreateChatSession({
      sessionId,
      institutionId,
      agentType: 'reviewer_assistant',
      inputContext: {
        question: message,
        question_type: questionType,
        application_id: applicationId || null,
        course_id: courseId || null,
        requested_at: new Date().toISOString(),
      },
      targetType: applicationId ? 'application' : courseId ? 'course' : 'general',
      targetIds,
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
      questionType,
      context: {
        applicationId: applicationId || null,
        courseId: courseId || null,
      },
      message: getProcessingMessage(questionType),
    })
  } catch (error) {
    console.error('Reviewer assistant chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

type QuestionType =
  | 'document_status'
  | 'eligibility'
  | 'comparison'
  | 'policy'
  | 'recommendation'
  | 'general'

/**
 * Classify the user's question to help route to appropriate handling
 */
function classifyQuestion(message: string): QuestionType {
  const lowerMessage = message.toLowerCase()

  // Document-related questions
  if (
    lowerMessage.includes('document') ||
    lowerMessage.includes('missing') ||
    lowerMessage.includes('upload') ||
    lowerMessage.includes('file')
  ) {
    return 'document_status'
  }

  // Eligibility questions
  if (
    lowerMessage.includes('eligible') ||
    lowerMessage.includes('qualify') ||
    lowerMessage.includes('requirement') ||
    lowerMessage.includes('meet') ||
    lowerMessage.includes('aps')
  ) {
    return 'eligibility'
  }

  // Comparison questions
  if (
    lowerMessage.includes('compare') ||
    lowerMessage.includes('similar') ||
    lowerMessage.includes('average') ||
    lowerMessage.includes('typical') ||
    lowerMessage.includes('other applicant')
  ) {
    return 'comparison'
  }

  // Policy questions
  if (
    lowerMessage.includes('policy') ||
    lowerMessage.includes('rule') ||
    lowerMessage.includes('procedure') ||
    lowerMessage.includes('deadline') ||
    lowerMessage.includes('process')
  ) {
    return 'policy'
  }

  // Recommendation questions
  if (
    lowerMessage.includes('recommend') ||
    lowerMessage.includes('should') ||
    lowerMessage.includes('suggest') ||
    lowerMessage.includes('advice') ||
    lowerMessage.includes('what to do')
  ) {
    return 'recommendation'
  }

  return 'general'
}

/**
 * Get a user-friendly message while processing
 */
function getProcessingMessage(questionType: QuestionType): string {
  switch (questionType) {
    case 'document_status':
      return 'Checking document status and requirements...'
    case 'eligibility':
      return 'Analyzing eligibility criteria and requirements...'
    case 'comparison':
      return 'Gathering comparison data from similar applications...'
    case 'policy':
      return 'Searching institutional policies and procedures...'
    case 'recommendation':
      return 'Analyzing the situation to provide recommendations...'
    default:
      return 'Processing your question...'
  }
}
