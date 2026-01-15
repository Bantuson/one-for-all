import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/applications/[id]/notes - Fetch all notes for an application
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceClient()

    // Fetch notes ordered by created_at descending (newest first)
    const { data: notes, error } = await supabase
      .from('application_notes')
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Notes fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Notes GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/applications/[id]/notes - Create a new note
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { title, body: noteBody, note_type = 'general', color = 'gray' } = body

    // Validate required fields
    if (!title || !noteBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Validate note_type
    const validNoteTypes = ['general', 'flag', 'review', 'followup']
    if (!validNoteTypes.includes(note_type)) {
      return NextResponse.json(
        { error: 'Invalid note_type. Must be one of: general, flag, review, followup' },
        { status: 400 }
      )
    }

    // Validate color
    const validColors = ['gray', 'green', 'yellow', 'red', 'blue', 'purple']
    if (!validColors.includes(color)) {
      return NextResponse.json(
        { error: 'Invalid color. Must be one of: gray, green, yellow, red, blue, purple' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // First, get the application to retrieve institution_id
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('institution_id')
      .eq('id', id)
      .single()

    if (appError || !application) {
      console.error('Application fetch error:', appError)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get or create user by clerk_user_id using upsert
    // This avoids email UNIQUE constraint violations and handles race conditions
    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          clerk_user_id: userId,
          email: `${userId}@clerk.temp`, // Temporary unique email until synced from Clerk
        },
        {
          onConflict: 'clerk_user_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single()

    if (upsertError || !user) {
      console.error('User upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to get or create user record' },
        { status: 500 }
      )
    }

    // Insert the note
    const { data: note, error: insertError } = await supabase
      .from('application_notes')
      .insert({
        application_id: id,
        institution_id: application.institution_id,
        title,
        body: noteBody,
        note_type,
        color,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Note creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Notes POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
