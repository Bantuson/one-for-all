import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  verifyInstitutionAccess,
  getOrCreateChatSession,
} from '../../_shared/auth'

/**
 * POST /api/agents/analytics/chat
 *
 * Handle analytics chat queries that generate charts.
 * Creates a session for natural language analytics queries that
 * produce Recharts-compatible visualizations.
 *
 * Request body:
 * - sessionId?: string - Existing session ID to continue conversation
 * - message: string - The analytics query in natural language
 * - institutionId: string - Institution context
 * - saveResult?: boolean - Whether to save the generated chart
 * - pinChart?: boolean - Whether to pin the chart to dashboard
 *
 * Response:
 * - sessionId: string - The session ID for tracking
 * - status: 'pending' | 'running' - Session status
 * - queryType: string - Classification of the analytics query
 */

interface AnalyticsChatRequest {
  sessionId?: string
  message: string
  institutionId: string
  saveResult?: boolean
  pinChart?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AnalyticsChatRequest = await request.json()
    const { sessionId, message, institutionId, saveResult, pinChart } = body

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!institutionId) {
      return NextResponse.json(
        { error: 'institutionId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the institution
    const access = await verifyInstitutionAccess(institutionId, [
      'admin',
      'reviewer',
    ])
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this institution' },
        { status: 403 }
      )
    }

    // Classify the analytics query
    const queryAnalysis = analyzeQuery(message)

    // Create or update chat session
    const session = await getOrCreateChatSession({
      sessionId,
      institutionId,
      agentType: 'analytics',
      inputContext: {
        query: message,
        query_type: queryAnalysis.type,
        suggested_chart_type: queryAnalysis.chartType,
        time_range: queryAnalysis.timeRange,
        save_result: saveResult || false,
        pin_chart: pinChart || false,
        requested_at: new Date().toISOString(),
      },
      targetType: 'analytics',
      targetIds: [],
      initiatedBy: access.userId,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create chat session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      status: 'pending',
      isNewSession: session.isNew,
      queryType: queryAnalysis.type,
      suggestedChartType: queryAnalysis.chartType,
      saveResult: saveResult || false,
      pinChart: pinChart || false,
      message: getProcessingMessage(queryAnalysis.type),
    })
  } catch (error) {
    console.error('Analytics chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

type QueryType =
  | 'status_distribution'
  | 'trend_analysis'
  | 'faculty_breakdown'
  | 'campus_breakdown'
  | 'course_popularity'
  | 'acceptance_rate'
  | 'aps_distribution'
  | 'document_status'
  | 'comparison'
  | 'custom'

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter'

interface QueryAnalysis {
  type: QueryType
  chartType: ChartType
  timeRange?: string
}

/**
 * Analyze the analytics query to determine type and suggested visualization
 */
function analyzeQuery(message: string): QueryAnalysis {
  const lowerMessage = message.toLowerCase()

  // Status distribution queries
  if (
    (lowerMessage.includes('status') &&
      (lowerMessage.includes('distribution') ||
        lowerMessage.includes('breakdown'))) ||
    lowerMessage.includes('how many pending') ||
    lowerMessage.includes('how many accepted')
  ) {
    return { type: 'status_distribution', chartType: 'pie' }
  }

  // Trend/time-based queries
  if (
    lowerMessage.includes('trend') ||
    lowerMessage.includes('over time') ||
    lowerMessage.includes('month') ||
    lowerMessage.includes('weekly') ||
    lowerMessage.includes('daily') ||
    lowerMessage.includes('history')
  ) {
    const timeRange = extractTimeRange(lowerMessage)
    return { type: 'trend_analysis', chartType: 'line', timeRange }
  }

  // Faculty breakdown
  if (
    lowerMessage.includes('faculty') ||
    lowerMessage.includes('faculties') ||
    lowerMessage.includes('department')
  ) {
    return { type: 'faculty_breakdown', chartType: 'bar' }
  }

  // Campus breakdown
  if (
    lowerMessage.includes('campus') ||
    lowerMessage.includes('campuses') ||
    lowerMessage.includes('location')
  ) {
    return { type: 'campus_breakdown', chartType: 'bar' }
  }

  // Course popularity
  if (
    lowerMessage.includes('course') ||
    lowerMessage.includes('top') ||
    lowerMessage.includes('popular') ||
    lowerMessage.includes('most applied')
  ) {
    return { type: 'course_popularity', chartType: 'bar' }
  }

  // Acceptance rate
  if (
    lowerMessage.includes('acceptance rate') ||
    lowerMessage.includes('success rate') ||
    lowerMessage.includes('conversion')
  ) {
    return { type: 'acceptance_rate', chartType: 'bar' }
  }

  // APS distribution
  if (
    lowerMessage.includes('aps') ||
    lowerMessage.includes('score') ||
    lowerMessage.includes('points')
  ) {
    return { type: 'aps_distribution', chartType: 'bar' }
  }

  // Document status
  if (
    lowerMessage.includes('document') ||
    lowerMessage.includes('upload') ||
    lowerMessage.includes('missing')
  ) {
    return { type: 'document_status', chartType: 'pie' }
  }

  // Comparison queries
  if (
    lowerMessage.includes('compare') ||
    lowerMessage.includes('versus') ||
    lowerMessage.includes('vs')
  ) {
    return { type: 'comparison', chartType: 'bar' }
  }

  // Default to custom
  return { type: 'custom', chartType: 'bar' }
}

/**
 * Extract time range from query
 */
function extractTimeRange(message: string): string | undefined {
  if (message.includes('year') || message.includes('annual')) {
    return 'year'
  }
  if (message.includes('month') || message.includes('monthly')) {
    return 'month'
  }
  if (message.includes('week') || message.includes('weekly')) {
    return 'week'
  }
  if (message.includes('today') || message.includes('daily')) {
    return 'day'
  }
  if (message.includes('quarter')) {
    return 'quarter'
  }
  // Default to last 6 months
  return '6months'
}

/**
 * Get a user-friendly message while processing
 */
function getProcessingMessage(queryType: QueryType): string {
  switch (queryType) {
    case 'status_distribution':
      return 'Analyzing application status distribution...'
    case 'trend_analysis':
      return 'Generating trend analysis over time...'
    case 'faculty_breakdown':
      return 'Breaking down applications by faculty...'
    case 'campus_breakdown':
      return 'Breaking down applications by campus...'
    case 'course_popularity':
      return 'Analyzing course popularity and demand...'
    case 'acceptance_rate':
      return 'Calculating acceptance rates...'
    case 'aps_distribution':
      return 'Analyzing APS score distribution...'
    case 'document_status':
      return 'Analyzing document submission status...'
    case 'comparison':
      return 'Generating comparison data...'
    default:
      return 'Processing your analytics query...'
  }
}
