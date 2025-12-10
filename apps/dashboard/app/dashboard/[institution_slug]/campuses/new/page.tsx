import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CampusWizard } from '@/components/forms/CampusWizard'

export default async function NewCampusPage({
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

  // Use service client to fetch institution
  const supabase = createServiceClient()

  const { data: institution, error } = await supabase
    .from('institutions')
    .select('id, name, slug')
    .eq('slug', institution_slug)
    .single()

  if (error || !institution) {
    redirect('/dashboard')
  }

  return (
    <CampusWizard
      institutionId={institution.id}
      institutionSlug={institution.slug}
    />
  )
}
