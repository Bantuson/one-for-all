import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/users/me
 *
 * Returns the current user's data from Supabase.
 * Used by debug components to check if Clerk user is synced to Supabase.
 *
 * Response:
 * {
 *   user: { id, clerk_user_id, email, first_name, last_name, ... }
 * }
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client to fetch user
    const supabase = createServiceClient()

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      console.error('[API /users/me] Error fetching user:', error)
      return NextResponse.json({ error: 'User not found', details: error.message }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[API /users/me] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
