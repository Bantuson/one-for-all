import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { institution_id, campus_id, name, code, description } = body

    if (!institution_id || !campus_id || !name || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: institution_id, campus_id, name, code' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: faculty, error } = await supabase
      .from('faculties')
      .insert({
        institution_id,
        campus_id,
        name,
        code,
        description: description || '',
      })
      .select()
      .single()

    if (error) {
      console.error('Faculty creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create faculty' },
        { status: 500 }
      )
    }

    return NextResponse.json({ faculty }, { status: 201 })
  } catch (error) {
    console.error('Faculty API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
