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
    const {
      institution_id,
      faculty_id,
      campus_id,
      name,
      code,
      requirements,
      status,
    } = body

    if (!institution_id || !faculty_id || !name || !code) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: institution_id, faculty_id, name, code',
        },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        institution_id,
        faculty_id,
        campus_id,
        name,
        code,
        requirements: requirements || {},
        status: status || 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Course creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Course API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
