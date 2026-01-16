import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifyInstitutionAccess,
  getOrCreateChatSession,
} from '../../_shared/auth'

/**
 * POST /api/agents/document-reviewer/chat
 *
 * Handle document reviewer chat messages.
 * Creates or continues a chat session for document review requests.
 *
 * Request body:
 * - sessionId?: string - Existing session ID to continue conversation
 * - message: string - The user's message/instruction
 * - institutionId: string - Institution context
 * - courseId?: string - Optional course context for filtering documents
 * - documentIds?: string[] - Specific documents to review (optional)
 *
 * Response:
 * - sessionId: string - The session ID for tracking
 * - status: 'pending' | 'running' - Session status
 * - documentsQueued?: number - Number of documents queued for review
 */

interface DocumentReviewerChatRequest {
  sessionId?: string
  message: string
  institutionId: string
  courseId?: string
  documentIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DocumentReviewerChatRequest = await request.json()
    const { sessionId, message, institutionId, courseId, documentIds } = body

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

    // Determine which documents to process
    let targetDocumentIds: string[] = documentIds || []

    // If no specific documents provided, find pending documents
    if (targetDocumentIds.length === 0) {
      let query = supabase
        .from('application_documents')
        .select(
          `
          id,
          applications!inner(institution_id)
        `
        )
        .eq('review_status', 'pending')
        .limit(50)

      // Filter by institution via the application relationship
      const { data: pendingDocs } = await query

      if (pendingDocs) {
        // Filter docs that belong to this institution
        targetDocumentIds = pendingDocs
          .filter(
            (doc) =>
              (doc.applications as { institution_id: string }).institution_id ===
              institutionId
          )
          .map((doc) => doc.id)
      }
    }

    // Parse instructions from message
    const instructions = parseDocumentReviewInstructions(message)

    // Create or update chat session
    const session = await getOrCreateChatSession({
      sessionId,
      institutionId,
      agentType: 'document_reviewer',
      inputContext: {
        message,
        instructions,
        course_id: courseId,
        document_count: targetDocumentIds.length,
        requested_at: new Date().toISOString(),
      },
      targetType: 'document',
      targetIds: targetDocumentIds,
      initiatedBy: access.userId,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create chat session' },
        { status: 500 }
      )
    }

    // Return response for frontend to poll
    return NextResponse.json({
      sessionId: session.id,
      status: 'pending',
      isNewSession: session.isNew,
      documentsQueued: targetDocumentIds.length,
      message:
        targetDocumentIds.length > 0
          ? `Document review session created. ${targetDocumentIds.length} document(s) queued for review.`
          : 'No pending documents found for review.',
    })
  } catch (error) {
    console.error('Document reviewer chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse user message into structured instructions for the document reviewer
 */
function parseDocumentReviewInstructions(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Check for specific review types
  if (lowerMessage.includes('strict') || lowerMessage.includes('thorough')) {
    return `Perform a thorough review with strict criteria. ${message}`
  }

  if (lowerMessage.includes('quick') || lowerMessage.includes('basic')) {
    return `Perform a basic completeness check. ${message}`
  }

  if (
    lowerMessage.includes('authenticity') ||
    lowerMessage.includes('verify')
  ) {
    return `Focus on document authenticity verification. ${message}`
  }

  if (lowerMessage.includes('quality') || lowerMessage.includes('clarity')) {
    return `Focus on image quality and document clarity. ${message}`
  }

  // Default instructions
  return `Review documents for quality, completeness, and authenticity. ${message}`
}
