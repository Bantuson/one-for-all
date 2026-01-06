import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// GET - Get institution by slug
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const supabase = getSupabaseClient()

    // Get institution by slug
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('id, name, slug, type, contact_email, website, created_by, clerk_org_id')
      .eq('slug', slug)
      .single()

    if (institutionError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    // Verify user has access
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is owner or member
    const isOwner = institution.created_by === userRecord.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('institution_members')
        .select('id')
        .eq('institution_id', institution.id)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json(institution)
  } catch (error) {
    console.error('[Institution By Slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
