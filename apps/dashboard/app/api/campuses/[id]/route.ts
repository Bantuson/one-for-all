import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/campuses/[id] - Get a specific campus
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    const { data: campus, error } = await supabase
      .from('campuses')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campus) {
      return NextResponse.json(
        { error: 'Campus not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('Campus GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/campuses/[id] - Update a campus
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, code, location, is_main, address } = body

    const supabase = createServiceClient()

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (name !== undefined) updates.name = name
    if (code !== undefined) updates.code = code
    if (location !== undefined) updates.location = location
    if (is_main !== undefined) updates.is_main = is_main
    if (address !== undefined) updates.address = address

    const { data: campus, error } = await supabase
      .from('campuses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Campus update error:', error)
      return NextResponse.json(
        { error: 'Failed to update campus' },
        { status: 500 }
      )
    }

    if (!campus) {
      return NextResponse.json(
        { error: 'Campus not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campus })
  } catch (error) {
    console.error('Campus PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/campuses/[id] - Delete a campus
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    // Note: This will cascade delete all faculties and courses in this campus
    const { error } = await supabase
      .from('campuses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Campus delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete campus' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campus DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
