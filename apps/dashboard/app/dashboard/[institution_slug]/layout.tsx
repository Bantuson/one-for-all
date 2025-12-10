import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ institution_slug: string }>
}) {
  // Await params as required by Next.js 15
  const { institution_slug } = await params

  // Fetch institution using service client (admin operation)
  const supabase = createServiceClient()

  const { data: institution, error } = await supabase
    .from('institutions')
    .select('id, name, slug, logo_url, type')
    .eq('slug', institution_slug)
    .single()

  if (error || !institution) {
    console.error('Dashboard layout - Institution not found:', {
      slug: institution_slug,
      error: error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
    })
    notFound()
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader institution={institution} />
      {children}
    </div>
  )
}
