import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// PATCH /api/applications/[id]/status - Update application choice status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, status_reason, choice_id } = body

    // Validate status
    const validStatuses = [
      'pending',
      'under_review',
      'conditionally_accepted',
      'accepted',
      'rejected',
      'waitlisted',
      'withdrawn',
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
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

    // Build update object
    const updates: Record<string, unknown> = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }

    if (status_reason !== undefined) {
      updates.status_reason = status_reason
    }

    // If choice_id is provided, update specific choice
    // Otherwise, update all choices for this application
    let query = supabase.from('application_choices').update(updates)

    if (choice_id) {
      query = query.eq('id', choice_id).eq('application_id', id)
    } else {
      query = query.eq('application_id', id)
    }

    const { data: updatedChoices, error: updateError } = await query.select(
      `
        *,
        course:courses(
          id,
          name,
          code
        )
      `
    )

    if (updateError) {
      console.error('Status update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    if (!updatedChoices || updatedChoices.length === 0) {
      return NextResponse.json(
        { error: 'Application choice(s) not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      choices: updatedChoices,
      message: choice_id
        ? 'Choice status updated successfully'
        : 'All application choices updated successfully',
    })
  } catch (error) {
    console.error('Status PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/applications/[id]/status - Get application choice statuses
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: choices, error } = await supabase
      .from('application_choices')
      .select(
        `
        *,
        course:courses(
          id,
          name,
          code,
          level,
          programme_type
        ),
        faculty:faculties(
          id,
          name,
          code
        ),
        campus:campuses(
          id,
          name
        )
      `
      )
      .eq('application_id', id)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Status fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch application choices' },
        { status: 500 }
      )
    }

    return NextResponse.json({ choices: choices || [] })
  } catch (error) {
    console.error('Status GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
