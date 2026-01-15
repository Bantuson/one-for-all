import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Verify user has access to the institution
 */
async function verifyInstitutionAccess(
  clerkUserId: string,
  institutionId: string
): Promise<{ userId: string; role: string } | null> {
  const supabase = createServiceClient()

  // Get Supabase user ID from Clerk ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return null
  }

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', institutionId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  return { userId: user.id, role: membership.role }
}

// GET /api/agents/analytics/stats
// Get quick application statistics for an institution
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const institutionId = searchParams.get('institutionId')

    if (!institutionId) {
      return NextResponse.json(
        { error: 'institutionId is required' },
        { status: 400 }
      )
    }

    // Verify access
    const access = await verifyInstitutionAccess(clerkUserId, institutionId)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // Get total applications count
    const { count: totalApplications } = await supabase
      .from('application_choices')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    // Get status distribution
    const { data: statusData } = await supabase
      .from('application_choices')
      .select('status')
      .eq('institution_id', institutionId)

    const statusCounts: Record<string, number> = {}
    statusData?.forEach((row) => {
      const status = row.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const statusDistribution = Object.entries(statusCounts).map(
      ([name, value]) => ({
        name,
        value,
        fill:
          name === 'accepted'
            ? '#22c55e'
            : name === 'pending'
              ? '#facc15'
              : name === 'rejected'
                ? '#ef4444'
                : '#6b7280',
      })
    )

    // Get applications by faculty
    const { data: facultyData } = await supabase
      .from('application_choices')
      .select('faculty_id, faculties(name)')
      .eq('institution_id', institutionId)

    const facultyCounts: Record<string, number> = {}
    facultyData?.forEach((row) => {
      const faculty = row.faculties as { name?: string } | null
      const facultyName = faculty?.name || 'Unknown'
      facultyCounts[facultyName] = (facultyCounts[facultyName] || 0) + 1
    })

    const applicationsByFaculty = Object.entries(facultyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: monthlyData } = await supabase
      .from('application_choices')
      .select('created_at')
      .eq('institution_id', institutionId)
      .gte('created_at', sixMonthsAgo.toISOString())

    const monthlyCounts: Record<string, number> = {}
    monthlyData?.forEach((row) => {
      const date = new Date(row.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1
    })

    const applicationsByMonth = Object.entries(monthlyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Get top courses
    const { data: courseData } = await supabase
      .from('application_choices')
      .select('course_id, courses(name)')
      .eq('institution_id', institutionId)

    const courseCounts: Record<string, number> = {}
    courseData?.forEach((row) => {
      const course = row.courses as { name?: string } | null
      const courseName = course?.name || 'Unknown'
      courseCounts[courseName] = (courseCounts[courseName] || 0) + 1
    })

    const topCourses = Object.entries(courseCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      stats: {
        total_applications: totalApplications || 0,
        status_distribution: statusDistribution,
        applications_by_faculty: applicationsByFaculty,
        applications_by_month: applicationsByMonth,
        top_courses: topCourses,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/agents/analytics/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
