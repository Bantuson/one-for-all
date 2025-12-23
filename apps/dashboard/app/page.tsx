import { Hero } from '@/components/landing/Hero'
import { LandingLayout } from '@/components/layout/LandingLayout'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Landing Page with Smart Routing
 *
 * Server-side authentication and onboarding checks:
 * 1. Unauthenticated users → Show landing page
 * 2. Authenticated users without onboarding → Show landing page with registration modal
 * 3. Authenticated users with completed onboarding → Redirect to dashboard
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ register?: string }>
}) {
  // Await searchParams as required by Next.js 15
  const params = await searchParams
  // Check authentication
  const { userId } = await auth()

  if (userId) {
    // User is authenticated, check onboarding status
    const supabase = createServiceClient()

    // Get user's onboarding status
    const { data: user } = await supabase
      .from('users')
      .select('id, onboarding_completed')
      .eq('clerk_user_id', userId)
      .single()

    if (user?.onboarding_completed) {
      // User has completed onboarding, fetch their institutions
      const { data: memberships } = await supabase
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
    }
  }

  // Show landing page for:
  // - Unauthenticated users
  // - Authenticated users without completed onboarding
  // - Authenticated users without institutions
  return (
    <LandingLayout>
      <Hero showRegistrationModal={params.register === 'true'} />
    </LandingLayout>
  )
}
