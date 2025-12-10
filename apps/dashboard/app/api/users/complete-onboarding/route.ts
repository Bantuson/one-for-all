import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/users/complete-onboarding
 *
 * Marks the current user's onboarding as complete in the database.
 * This should be called after successful institution creation.
 *
 * Idempotent: Safe to call multiple times.
 */
export async function POST() {
  try {
    // Get authenticated user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Update user's onboarding_completed flag
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('clerk_user_id', userId)

    if (error) {
      console.error('Error completing onboarding:', error)
      return NextResponse.json(
        { error: 'Failed to complete onboarding', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    console.error('Error in complete-onboarding endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
