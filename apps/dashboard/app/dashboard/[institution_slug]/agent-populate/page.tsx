import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { ScannerInterface } from '@/components/dashboard/ScannerInterface'

export default async function AgentPopulatePage({
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
    .select('id, name, slug, website')
    .eq('slug', institution_slug)
    .single()

  // Log error for debugging but don't redirect - Coming Soon page can still render
  if (error || !institution) {
    console.error('Failed to fetch institution for AI Scanner:', {
      slug: institution_slug,
      error: error,
      errorCode: error?.code,
      errorMessage: error?.message,
      institution: institution,
    })
  }

  return (
    <ScannerInterface
      institutionId={institution?.id || ''}
      institutionSlug={institution?.slug || institution_slug}
      defaultWebsiteUrl={institution?.website || ''}
    />
  )
}
