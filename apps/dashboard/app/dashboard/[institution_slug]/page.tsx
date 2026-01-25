import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardEditor } from '@/components/dashboard/DashboardEditor'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'

// ============================================================================
// Type Definitions
// ============================================================================

interface DatabaseCourse {
  id: string
  name: string
  code: string
  status: string | null
  level: string | null
  description: string | null
  duration_years: number | null
  requirements: string | Record<string, unknown> | null
  campus_id: string | null
  programme_type: string | null
}

interface DatabaseFaculty {
  id: string
  name: string
  code: string
  description: string | null
  courses: DatabaseCourse[]
}

interface DatabaseCampus {
  id: string
  name: string
  code: string
  location: string | null
  is_main: boolean | null
  faculties: DatabaseFaculty[]
}

// ============================================================================
// Main Component
// ============================================================================

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
    redirect('/register')
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

  // Fetch full hierarchy: campuses -> faculties -> courses with ALL fields
  const { data: campuses } = await supabase
    .from('campuses')
    .select(
      `
      id,
      name,
      code,
      location,
      is_main,
      faculties (
        id,
        name,
        code,
        description,
        courses (
          id,
          name,
          code,
          status,
          level,
          description,
          duration_years,
          requirements,
          campus_id,
          programme_type
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
        <DashboardEditor
          campuses={campuses as DatabaseCampus[]}
          institutionName={institution.name}
          institutionSlug={institution_slug}
          institutionId={institution.id}
        />
      ) : (
        <DashboardEmptyState
          institutionId={institution.id}
          institutionSlug={institution_slug}
        />
      )}
    </>
  )
}
