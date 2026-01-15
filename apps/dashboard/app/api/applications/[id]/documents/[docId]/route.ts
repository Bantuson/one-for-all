import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string; docId: string }>
}

// GET /api/applications/[id]/documents/[docId] - Get document details
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, docId } = await params
    const supabase = createServiceClient()

    const { data: document, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('id', docId)
      .eq('application_id', id)
      .single()

    if (error || !document) {
      console.error('Document fetch error:', error)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Document GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/applications/[id]/documents/[docId] - Update document review status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, docId } = await params
    const body = await req.json()
    const { review_status, flag_reason } = body

    // Validate review_status
    const validStatuses = ['pending', 'approved', 'flagged', 'rejected']
    if (!review_status || !validStatuses.includes(review_status)) {
      return NextResponse.json(
        {
          error: 'Invalid review_status. Must be one of: pending, approved, flagged, rejected',
        },
        { status: 400 }
      )
    }

    // Validate flag_reason for flagged/rejected statuses
    if (
      (review_status === 'flagged' || review_status === 'rejected') &&
      !flag_reason
    ) {
      return NextResponse.json(
        { error: 'flag_reason is required when status is flagged or rejected' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get current user's UUID from clerk_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('User lookup error:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build update object based on review_status
    const updates: Record<string, unknown> = {
      review_status,
      reviewed_by: user.id,
    }

    // For flagged/rejected statuses, set flag metadata
    if (review_status === 'flagged' || review_status === 'rejected') {
      updates.flag_reason = flag_reason
      updates.flagged_by = user.id
      // flagged_at will be set automatically by the trigger
    } else {
      // For approved/pending, clear flag metadata (trigger handles this)
      updates.flag_reason = null
      updates.flagged_by = null
      updates.flagged_at = null
    }

    // Update the document
    const { data: document, error: updateError } = await supabase
      .from('application_documents')
      .update(updates)
      .eq('id', docId)
      .eq('application_id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Document update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document status' },
        { status: 500 }
      )
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Document PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
