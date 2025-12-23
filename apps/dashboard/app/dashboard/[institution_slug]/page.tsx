import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { MasterDetailLayout } from '@/components/dashboard/MasterDetailLayout'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'

// ============================================================================
// Type Definitions
// ============================================================================

interface Course {
  id: string
  name: string
  code: string
  status: string
}

interface FacultyWithCourses {
  id: string
  name: string
  code: string
  courses: Course[]
}

interface ProgrammeType {
  type: string
  displayName: string
  faculties: FacultyWithCourses[]
}

interface CampusWithHierarchy {
  id: string
  name: string
  code: string
  programmeTypes: ProgrammeType[]
}

interface DatabaseCampus {
  id: string
  name: string
  code: string
  faculties: DatabaseFaculty[]
}

interface DatabaseFaculty {
  id: string
  name: string
  code: string
  courses: Course[]
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transforms flat database structure into nested programmeTypes hierarchy
 * by analyzing course levels within faculties.
 */
function transformCampusData(campuses: DatabaseCampus[]): CampusWithHierarchy[] {
  return campuses.map((campus) => {
    // Group faculties by programme type based on course levels
    const undergraduateFaculties: FacultyWithCourses[] = []
    const postgraduateFaculties: FacultyWithCourses[] = []

    campus.faculties.forEach((faculty) => {
      // Check if faculty has any courses to determine its type
      const hasUndergrad = faculty.courses.some((course) =>
        course.code.toLowerCase().includes('undergrad') ||
        course.name.toLowerCase().includes('bachelor') ||
        course.name.toLowerCase().includes('bcom') ||
        course.name.toLowerCase().includes('bsc') ||
        course.name.toLowerCase().includes('ba ') ||
        course.name.toLowerCase().includes('beng')
      )

      const hasPostgrad = faculty.courses.some((course) =>
        course.code.toLowerCase().includes('postgrad') ||
        course.name.toLowerCase().includes('honours') ||
        course.name.toLowerCase().includes('master') ||
        course.name.toLowerCase().includes('phd') ||
        course.name.toLowerCase().includes('doctorate')
      )

      // If no clear distinction, default to undergraduate
      if (hasPostgrad && !hasUndergrad) {
        postgraduateFaculties.push(faculty)
      } else {
        // Default to undergraduate or include in both if mixed
        undergraduateFaculties.push(faculty)
        if (hasPostgrad && hasUndergrad) {
          postgraduateFaculties.push(faculty)
        }
      }
    })

    // Build programmeTypes array
    const programmeTypes: ProgrammeType[] = []

    if (undergraduateFaculties.length > 0) {
      programmeTypes.push({
        type: 'undergraduate',
        displayName: 'Undergraduate Programmes',
        faculties: undergraduateFaculties,
      })
    }

    if (postgraduateFaculties.length > 0) {
      programmeTypes.push({
        type: 'postgraduate',
        displayName: 'Postgraduate Programmes',
        faculties: postgraduateFaculties,
      })
    }

    return {
      id: campus.id,
      name: campus.name,
      code: campus.code,
      programmeTypes,
    }
  })
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
  const { data: campuses } = await supabase
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

  // Transform data for MasterDetailLayout
  const transformedCampuses = hasCampuses ? transformCampusData(campuses as DatabaseCampus[]) : []

  return (
    <>
      {hasCampuses ? (
        <MasterDetailLayout
          campuses={transformedCampuses}
          institutionSlug={institution_slug}
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
