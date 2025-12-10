import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Debug endpoint to test Clerk-Supabase JWT integration
 *
 * This endpoint helps verify that:
 * 1. Clerk session token is being passed to Supabase
 * 2. Supabase can validate the Clerk JWT
 * 3. The JWT contains required claims (sub, role)
 *
 * IMPORTANT: Only test JWT validation from authenticated API endpoints.
 * Running `SELECT auth.jwt()` in Supabase SQL Editor will return NULL
 * because the SQL Editor has no authentication context.
 */
export async function GET() {
  try {
    // Get Clerk authentication
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: 'Please sign in to test JWT integration'
        },
        { status: 401 }
      )
    }

    // Create Supabase client (passes Clerk token via headers)
    const supabase = await createClient()

    // Query auth.jwt() from Supabase - this uses the Clerk token
    const { data: jwtData, error: jwtError } = await supabase
      .rpc('auth.jwt' as any)

    if (jwtError) {
      console.error('[Debug JWT] Error fetching JWT:', jwtError)
      return NextResponse.json({
        success: false,
        clerkUserId: userId,
        jwtData: null,
        error: jwtError.message,
        troubleshooting: [
          'Ensure Clerk session token has "role": "authenticated" claim',
          'Verify Clerk domain in Supabase matches exactly: https://free-peacock-64.clerk.accounts.dev',
          'Sign out and back in to generate new session token with updated claims',
          'Check Clerk Dashboard > Configure > Sessions > Customize session token'
        ]
      }, { status: 500 })
    }

    // Check if JWT contains required fields
    const hasSubClaim = jwtData && typeof jwtData === 'object' && 'sub' in jwtData
    const hasRoleClaim = jwtData && typeof jwtData === 'object' && 'role' in jwtData

    return NextResponse.json({
      success: true,
      clerkUserId: userId,
      jwtData,
      validation: {
        hasSubClaim,
        hasRoleClaim,
        subMatches: hasSubClaim && (jwtData as any).sub === userId,
        roleValue: hasRoleClaim ? (jwtData as any).role : null
      },
      status: hasSubClaim && hasRoleClaim ? 'Integration working!' : 'Missing required claims',
      nextSteps: !hasRoleClaim ? [
        '1. Go to Clerk Dashboard > Configure > Sessions',
        '2. Find "Customize session token" section',
        '3. Add claim: {"role": "authenticated"}',
        '4. Sign out and back in to get new token'
      ] : []
    })
  } catch (error) {
    console.error('[Debug JWT] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
