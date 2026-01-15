import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ chartId: string }>
}

// PATCH /api/agents/analytics/[chartId]/pin
// Toggle chart pin status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chartId } = await params
    const body = await request.json()
    const { isPinned } = body

    if (typeof isPinned !== 'boolean') {
      return NextResponse.json(
        { error: 'isPinned must be a boolean' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get the chart to verify ownership/access
    const { data: chart, error: chartError } = await supabase
      .from('saved_charts')
      .select('id, institution_id')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
    }

    // Get Supabase user ID from Clerk ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to the institution
    const { data: membership, error: membershipError } = await supabase
      .from('institution_members')
      .select('role')
      .eq('institution_id', chart.institution_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this chart' },
        { status: 403 }
      )
    }

    // Only admins can pin/unpin charts
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can pin/unpin charts' },
        { status: 403 }
      )
    }

    // Update the pin status
    const { error: updateError } = await supabase
      .from('saved_charts')
      .update({
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chartId)

    if (updateError) {
      console.error('Error updating chart pin status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update chart' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chart_id: chartId,
      is_pinned: isPinned,
      message: isPinned ? 'Chart pinned successfully' : 'Chart unpinned successfully',
    })
  } catch (error) {
    console.error('Error in PATCH /api/agents/analytics/[chartId]/pin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
