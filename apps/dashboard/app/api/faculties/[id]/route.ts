import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/faculties/[id] - Get a specific faculty
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: faculty, error } = await supabase
      .from('faculties')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ faculty })
  } catch (error) {
    console.error('Faculty GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/faculties/[id] - Update a faculty
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, code, description } = body

    const supabase = createServiceClient()

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code
    if (description !== undefined) updates.description = description

    const { data: faculty, error } = await supabase
      .from('faculties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Faculty update error:', error)
      return NextResponse.json(
        { error: 'Failed to update faculty' },
        { status: 500 }
      )
    }

    if (!faculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ faculty })
  } catch (error) {
    console.error('Faculty PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/faculties/[id] - Delete a faculty
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    // Note: This will cascade delete all courses in this faculty
    const { error } = await supabase
      .from('faculties')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Faculty delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete faculty' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Faculty DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
