import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { ThreeColumnLayout } from '@/components/dashboard/ThreeColumnLayout'
import { EmptyStatePrompt } from '@/components/dashboard/EmptyStatePrompt'
import { Building2, Sparkles } from 'lucide-react'

export default async function InstitutionDashboardPage({
  params,
}: {
  params: Promise<{ institution_slug: string }>
}) {
  // Await params as required by Next.js 15
  const { institution_slug } = await params

  // Check authentication
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  // Use service client to fetch data
  const supabase = createServiceClient()

  // Fetch institution
  const { data: institution, error: institutionError } = await supabase
    .from('institutions')
    .select('id, name, slug, type')
    .eq('slug', institution_slug)
    .single()

  if (institutionError || !institution) {
    redirect('/dashboard')
  }

  // Fetch full hierarchy: campuses -> faculties -> courses
  const { data: campuses, error: campusesError } = await supabase
    .from('campuses')
    .select(
      `
      id,
      name,
      code,
      faculties (
        id,
        name,
        code,
        courses (
          id,
          name,
          code,
          status
        )
      )
    `
    )
    .eq('institution_id', institution.id)
    .order('name', { ascending: true })

  // Check if we have any data
  const hasCampuses = campuses && campuses.length > 0

  return (
    <>
      {hasCampuses ? (
        <ThreeColumnLayout
          campuses={campuses}
          institutionSlug={institution_slug}
        />
      ) : (
        <EmptyStatePrompt
          title="Welcome to your dashboard!"
          description="Get started by adding your institution's campuses, faculties, and courses. You can do this manually or let our AI agent scan your website to auto-populate the structure."
          actions={[
            {
              label: 'Add Manually',
              href: `/dashboard/${institution_slug}/campuses/new`,
              variant: 'default',
              icon: <Building2 className="h-4 w-4 mr-2" />,
            },
            {
              label: 'Scan Website (AI)',
              href: `/dashboard/${institution_slug}/agent-populate`,
              variant: 'outline',
              icon: <Sparkles className="h-4 w-4 mr-2" />,
            },
          ]}
        />
      )}
    </>
  )
}
