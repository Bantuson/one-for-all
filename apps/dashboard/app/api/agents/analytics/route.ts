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

// GET /api/agents/analytics
// Fetch saved/pinned charts for an institution
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const institutionId = searchParams.get('institutionId')
    const pinnedOnly = searchParams.get('pinnedOnly') === 'true'

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

    // Fetch saved charts
    let query = supabase
      .from('saved_charts')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (pinnedOnly) {
      query = query.eq('is_pinned', true)
    }

    const { data: charts, error } = await query

    if (error) {
      console.error('Error fetching charts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch charts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      charts: charts || [],
      total: charts?.length || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/agents/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents/analytics
// Run an analytics query and generate a chart
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, institutionId, saveResult, pinChart } = body

    if (!query || !institutionId) {
      return NextResponse.json(
        { error: 'query and institutionId are required' },
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

    // Only admins and reviewers can run analytics
    if (!['admin', 'reviewer'].includes(access.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to run analytics' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // For now, we'll process the analytics directly without the CrewAI backend
    // This is a simplified implementation that can be enhanced later
    // to call the Python backend API

    // Determine query type and generate appropriate data
    const lowerQuery = query.toLowerCase()
    let chartConfig = null
    let chartType = 'bar'
    let title = query

    // Status distribution query
    if (
      lowerQuery.includes('status') &&
      (lowerQuery.includes('distribution') || lowerQuery.includes('breakdown'))
    ) {
      const { data: statusData } = await supabase
        .from('application_choices')
        .select('status')
        .eq('institution_id', institutionId)

      const statusCounts: Record<string, number> = {}
      statusData?.forEach((row) => {
        const status = row.status || 'unknown'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      const data = Object.entries(statusCounts).map(([name, value]) => ({
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
      }))

      chartConfig = {
        type: 'pie' as const,
        title: 'Application Status Distribution',
        data,
        colors: ['#22c55e', '#facc15', '#ef4444', '#6b7280'],
      }
      chartType = 'pie'
      title = 'Application Status Distribution'
    }
    // Faculty breakdown query
    else if (lowerQuery.includes('faculty') || lowerQuery.includes('faculties')) {
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

      const data = Object.entries(facultyCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      chartConfig = {
        type: 'bar' as const,
        title: 'Applications by Faculty',
        data,
        xKey: 'name',
        yKey: 'value',
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'],
      }
      chartType = 'bar'
      title = 'Applications by Faculty'
    }
    // Campus breakdown query
    else if (lowerQuery.includes('campus') || lowerQuery.includes('campuses')) {
      const { data: campusData } = await supabase
        .from('application_choices')
        .select('campus_id, campuses(name)')
        .eq('institution_id', institutionId)

      const campusCounts: Record<string, number> = {}
      campusData?.forEach((row) => {
        const campus = row.campuses as { name?: string } | null
        const campusName = campus?.name || 'Unknown'
        campusCounts[campusName] = (campusCounts[campusName] || 0) + 1
      })

      const data = Object.entries(campusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      chartConfig = {
        type: 'bar' as const,
        title: 'Applications by Campus',
        data,
        xKey: 'name',
        yKey: 'value',
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'],
      }
      chartType = 'bar'
      title = 'Applications by Campus'
    }
    // Monthly trend query
    else if (
      lowerQuery.includes('trend') ||
      lowerQuery.includes('month') ||
      lowerQuery.includes('over time')
    ) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: trendData } = await supabase
        .from('application_choices')
        .select('created_at')
        .eq('institution_id', institutionId)
        .gte('created_at', sixMonthsAgo.toISOString())

      const monthlyCounts: Record<string, number> = {}
      trendData?.forEach((row) => {
        const date = new Date(row.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1
      })

      const data = Object.entries(monthlyCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))

      chartConfig = {
        type: 'line' as const,
        title: 'Applications Over Time',
        data,
        xKey: 'name',
        yKey: 'value',
        colors: ['#3b82f6'],
      }
      chartType = 'line'
      title = 'Applications Over Time'
    }
    // Top courses query
    else if (lowerQuery.includes('course') || lowerQuery.includes('top')) {
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

      const data = Object.entries(courseCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      chartConfig = {
        type: 'bar' as const,
        title: 'Top Applied Courses',
        data,
        xKey: 'name',
        yKey: 'value',
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'],
      }
      chartType = 'bar'
      title = 'Top Applied Courses'
    }
    // Acceptance rate query
    else if (
      lowerQuery.includes('acceptance rate') ||
      lowerQuery.includes('accepted')
    ) {
      const { data: rateData } = await supabase
        .from('application_choices')
        .select('faculty_id, status, faculties(name)')
        .eq('institution_id', institutionId)

      const facultyStats: Record<string, { total: number; accepted: number }> = {}
      rateData?.forEach((row) => {
        const faculty = row.faculties as { name?: string } | null
        const facultyName = faculty?.name || 'Unknown'
        if (!facultyStats[facultyName]) {
          facultyStats[facultyName] = { total: 0, accepted: 0 }
        }
        facultyStats[facultyName].total++
        if (row.status === 'accepted') {
          facultyStats[facultyName].accepted++
        }
      })

      const data = Object.entries(facultyStats)
        .map(([name, stats]) => ({
          name,
          value: stats.total > 0
            ? Math.round((stats.accepted / stats.total) * 100)
            : 0,
        }))
        .sort((a, b) => b.value - a.value)

      chartConfig = {
        type: 'bar' as const,
        title: 'Acceptance Rate by Faculty (%)',
        data,
        xKey: 'name',
        yKey: 'value',
        colors: ['#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'],
      }
      chartType = 'bar'
      title = 'Acceptance Rate by Faculty (%)'
    }
    // Default: status distribution
    else {
      const { data: defaultData } = await supabase
        .from('application_choices')
        .select('status')
        .eq('institution_id', institutionId)

      const statusCounts: Record<string, number> = {}
      defaultData?.forEach((row) => {
        const status = row.status || 'unknown'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      const data = Object.entries(statusCounts).map(([name, value]) => ({
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
      }))

      chartConfig = {
        type: 'pie' as const,
        title: 'Application Status Distribution',
        data,
        colors: ['#22c55e', '#facc15', '#ef4444', '#6b7280'],
      }
      chartType = 'pie'
      title = 'Application Status Distribution'
    }

    // Save chart if requested
    let chartId = null
    if (saveResult && chartConfig) {
      const { data: savedChart, error: saveError } = await supabase
        .from('saved_charts')
        .insert({
          institution_id: institutionId,
          chart_config: chartConfig,
          title,
          description: `Generated from: "${query}"`,
          is_pinned: pinChart || false,
          created_by: access.userId,
        })
        .select('id')
        .single()

      if (!saveError && savedChart) {
        chartId = savedChart.id
      }
    }

    return NextResponse.json({
      success: true,
      chart_config: chartConfig,
      chart_type: chartType,
      title,
      saved: !!chartId,
      chart_id: chartId,
      query,
    })
  } catch (error) {
    console.error('Error in POST /api/agents/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
