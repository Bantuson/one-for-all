import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export default async function SetupPage({
  params,
}: {
  params: Promise<{ institution_slug: string }>
}) {
  // Await params as required by Next.js 15
  const { institution_slug } = await params

  // Check authentication
  const { userId } = await auth()
  if (!userId) {
    redirect('/register')
  }

  // Use service client to fetch institution and campuses
  const supabase = createServiceClient()

  const { data: institution, error } = await supabase
    .from('institutions')
    .select('id, name, slug')
    .eq('slug', institution_slug)
    .single()

  if (error || !institution) {
    redirect('/dashboard')
  }

  // Check if institution already has campuses set up
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id')
    .eq('institution_id', institution.id)

  // If no campuses exist, redirect to unified registration flow
  if (!campuses || campuses.length === 0) {
    redirect('/register?complete_setup=true')
  }

  // If campuses exist, setup is already complete - redirect to dashboard
  redirect(`/dashboard/${institution_slug}`)
}
