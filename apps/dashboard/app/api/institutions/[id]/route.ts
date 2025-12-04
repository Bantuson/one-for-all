import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/institutions/[id] - Get a specific institution
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Get current user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get institution with user's membership
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select(`
        *,
        institution_members!inner(role)
      `)
      .eq('id', id)
      .eq('institution_members.user_id', user.id)
      .single()

    if (institutionError || !institution) {
      return NextResponse.json(
        { error: 'Institution not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ institution })
  } catch (error) {
    console.error('Error in GET /api/institutions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/institutions/[id] - Update an institution
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, contact_email, contact_phone, website } = body

    const supabase = await createClient()

    // Get current user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: membership, error: membershipError } = await supabase
      .from('institution_members')
      .select('role')
      .eq('institution_id', id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update institutions' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (name) {
      updates.name = name
      updates.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
    if (contact_email) updates.contact_email = contact_email
    if (contact_phone !== undefined) updates.contact_phone = contact_phone
    if (website !== undefined) updates.website = website

    // Update institution
    const { data: institution, error: updateError } = await supabase
      .from('institutions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating institution:', updateError)
      return NextResponse.json(
        { error: 'Failed to update institution' },
        { status: 500 }
      )
    }

    return NextResponse.json({ institution })
  } catch (error) {
    console.error('Error in PATCH /api/institutions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/institutions/[id] - Delete an institution
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Get current user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: membership, error: membershipError } = await supabase
      .from('institution_members')
      .select('role')
      .eq('institution_id', id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete institutions' },
        { status: 403 }
      )
    }

    // Delete institution (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('institutions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting institution:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete institution' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/institutions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
