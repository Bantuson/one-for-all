import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { UnifiedRegistrationPage } from '@/components/registration/UnifiedRegistrationPage'

export const metadata = {
  title: 'Register | One For All',
  description: 'Create your institution account',
}

/**
 * Registration Page with Smart Routing
 *
 * Server-side authentication and institution checks:
 * 1. Unauthenticated users → Show registration page
 * 2. Authenticated users without institutions → Show registration page
 * 3. Authenticated users with institutions → Redirect to dashboard
 */
export default async function RegisterPage() {
  // Check authentication
  const { userId } = await auth()

  if (userId) {
    // User is authenticated, check if they have institutions
    const supabase = createServiceClient()

    // Get user's record
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (user) {
      // Check if user has any institution memberships
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
          ? (institutionsData[0] as { slug: string } | undefined)
          : (institutionsData as { slug: string })
        if (institution?.slug) {
          redirect(`/dashboard/${institution.slug}`)
        }
      }
    }
  }

  // Show registration page for:
  // - Unauthenticated users
  // - Authenticated users without institutions
  return <UnifiedRegistrationPage />
}
