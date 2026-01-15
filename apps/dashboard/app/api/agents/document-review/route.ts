import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type AgentSessionInput = {
  institution_id: string
  target_ids: string[] // document IDs to review
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

/**
 * POST /api/agents/document-review
 *
 * Trigger a document review agent session.
 * Creates an agent_session record and optionally triggers the backend crew.
 *
 * Request body:
 * - institution_id: UUID of the institution
 * - target_ids: Array of document IDs to review
 * - instructions: Optional additional instructions for the agent
 *
 * Response:
 * - session: The created agent session record
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AgentSessionInput = await request.json()
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
        { error: 'target_ids must be a non-empty array of document IDs' },
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
        { error: 'Insufficient permissions. Requires admin or reviewer role.' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Verify all documents exist and belong to the institution
    const { data: documents, error: docsError } = await supabase
      .from('application_documents')
      .select(
        `
        id,
        document_type,
        review_status,
        applications!inner(
          id,
          institution_id
        )
      `
      )
      .in('id', target_ids)

    if (docsError) {
      console.error('Document verification error:', docsError)
      return NextResponse.json(
        { error: 'Failed to verify documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No valid documents found with the provided IDs' },
        { status: 404 }
      )
    }

    // Check all documents belong to the institution
    const invalidDocs = documents.filter(
      (doc) =>
        !doc.applications ||
        (doc.applications as { institution_id: string }).institution_id !== institution_id
    )

    if (invalidDocs.length > 0) {
      return NextResponse.json(
        {
          error: 'Some documents do not belong to this institution',
          invalid_ids: invalidDocs.map((d) => d.id),
        },
        { status: 403 }
      )
    }

    // Create agent session
    const { data: session, error: insertError } = await supabase
      .from('agent_sessions')
      .insert({
        institution_id,
        agent_type: 'document_reviewer',
        status: 'pending',
        target_type: 'document',
        target_ids,
        total_items: target_ids.length,
        processed_items: 0,
        input_context: {
          instructions: instructions || 'Review documents for quality, completeness, and authenticity.',
          document_count: target_ids.length,
          document_types: [...new Set(documents.map((d) => d.document_type))],
        },
        initiated_by: access.userId,
      })
      .select(
        'id, agent_type, status, target_type, target_ids, total_items, processed_items, created_at'
      )
      .single()

    if (insertError) {
      console.error('Agent session create error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create agent session' },
        { status: 500 }
      )
    }

    // TODO: In production, trigger the actual crew execution
    // Options:
    // 1. Call a Supabase Edge Function that runs the DocumentReviewerCrew
    // 2. Send message to a job queue (e.g., Redis, SQS)
    // 3. Make HTTP request to backend API server
    //
    // Example for Edge Function:
    // await supabase.functions.invoke('run-document-review-crew', {
    //   body: { session_id: session.id }
    // })
    //
    // For now, we just return the session and rely on separate trigger mechanism

    return NextResponse.json(
      {
        message: 'Document review session created successfully',
        session,
        documents_to_review: documents.map((d) => ({
          id: d.id,
          type: d.document_type,
          current_status: d.review_status,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Document review POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/agents/document-review
 *
 * Get recent document review sessions.
 * Query params:
 * - institution_id: Required - filter by institution
 * - status: Optional - filter by status (pending, running, completed, failed)
 * - limit: Optional - max results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const institutionId = searchParams.get('institution_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

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

    // Build query
    let query = supabase
      .from('agent_sessions')
      .select(
        `
        id,
        agent_type,
        status,
        target_type,
        target_ids,
        total_items,
        processed_items,
        output_summary,
        created_at,
        started_at,
        completed_at,
        initiated_by
      `
      )
      .eq('institution_id', institutionId)
      .eq('agent_type', 'document_reviewer')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Document review sessions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document review sessions' },
        { status: 500 }
      )
    }

    // Get decisions for each session
    const sessionsWithDecisions = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: decisions } = await supabase
          .from('agent_decisions')
          .select('id, target_id, decision_type, reasoning, confidence_score, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })

        return {
          ...session,
          decisions: decisions || [],
        }
      })
    )

    return NextResponse.json({
      sessions: sessionsWithDecisions,
      count: sessionsWithDecisions.length,
    })
  } catch (error) {
    console.error('Document review GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
