import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { institution_id, name, code, location, is_main } = body

    if (!institution_id || !name || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: institution_id, name, code' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: campus, error } = await supabase
      .from('campuses')
      .insert({
        institution_id,
        name,
        code,
        location: location || null,
        is_main: is_main || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Campus creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create campus' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campus }, { status: 201 })
  } catch (error) {
    console.error('Campus API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
