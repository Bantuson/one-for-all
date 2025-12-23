import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Dashboard Index Route
 *
 * This route handles users who navigate to /dashboard without a specific institution slug.
 * It redirects them to:
 * - Their first institution's dashboard if they have institutions
 * - The landing page with registration modal if they don't have institutions
 */
export default async function DashboardIndex() {
  // Check if user is authenticated
  const { userId } = await auth()

  if (!userId) {
    console.log('[Dashboard Index] No Clerk user ID - redirecting to landing page')
    // Not authenticated, redirect to landing page
    redirect('/')
  }

  // Use service client to fetch user's institutions
  const supabase = createServiceClient()

  // Get user's Supabase ID from Clerk ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (userError || !user) {
    // User not synced to Supabase yet
    console.error('[Dashboard Index] User not found in Supabase:', {
      clerk_user_id: userId,
      error: userError?.message,
    })
    console.warn('[Dashboard Index] ⚠️ User may need to be synced. See CLERK_SUPABASE_INTEGRATION_TODO.md')

    // In development, show helpful error
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard Index] TROUBLESHOOTING:')
      console.error('1. Check if Clerk-Supabase integration is configured')
      console.error('2. Run: SELECT * FROM users WHERE clerk_user_id = \'' + userId + '\';')
      console.error('3. If user doesn\'t exist, check webhook configuration or run manual sync')
    }

    redirect('/')
  }

  // Get user's institutions via institution_members
  const { data: memberships, error: membershipsError } = await supabase
    .from('institution_members')
    .select(
      `
      institution_id,
      institutions (
        id,
        slug,
        name
      )
    `
    )
    .eq('user_id', user.id)
    .limit(1)

  if (membershipsError) {
    console.error('Error fetching user institutions:', membershipsError)
    redirect('/')
  }

  const firstMembership = memberships?.[0]
  if (firstMembership?.institutions) {
    // User has institutions, redirect to first one
    // Handle both array and object forms from Supabase nested select
    const institutionsData = firstMembership.institutions
    const institution = Array.isArray(institutionsData)
      ? institutionsData[0] as { slug: string } | undefined
      : institutionsData as { slug: string }
    if (institution?.slug) {
      redirect(`/dashboard/${institution.slug}`)
    }
  }

  // User has no institutions, redirect to landing page to register
  redirect('/?register=true')
}
