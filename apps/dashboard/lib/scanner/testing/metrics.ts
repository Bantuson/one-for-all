/**
 * Metrics Collection Utilities
 *
 * Parses scraper NDJSON output and calculates coverage/extraction metrics.
 */

import type {
  TestingMetrics,
  PageTypeDistribution,
  CoverageMetrics,
  ErrorEntry,
} from './types'

// ============================================================================
// Scraper Event Types (from scraper output)
// ============================================================================

interface ScraperEvent {
  type: string
  timestamp: number
  [key: string]: unknown
}

interface PageScrapedEvent extends ScraperEvent {
  type: 'page_scraped'
  url: string
  pageType: string
  contentLength: number
}

interface PageErrorEvent extends ScraperEvent {
  type: 'page_error'
  url: string
  error: string
}

interface CompleteEvent extends ScraperEvent {
  type: 'complete'
  results: {
    pages: Array<{
      url: string
      pageType: string
      title?: string
    }>
    totalPages: number
    elapsedMs: number
  }
}

// ============================================================================
// Output Parsing
// ============================================================================

/**
 * Parse NDJSON output from scraper into typed events
 */
export function parseScraperOutput(output: string): ScraperEvent[] {
  const events: ScraperEvent[] = []
  const lines = output.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    // Skip non-JSON lines (console.log output from scraper)
    if (!line.startsWith('{')) continue

    try {
      const event = JSON.parse(line) as ScraperEvent
      if (event.type) {
        events.push(event)
      }
    } catch {
      // Skip malformed JSON lines
      continue
    }
  }

  return events
}

/**
 * Extract page_scraped events
 */
export function getPageScrapedEvents(events: ScraperEvent[]): PageScrapedEvent[] {
  return events.filter(
    (e): e is PageScrapedEvent => e.type === 'page_scraped'
  )
}

/**
 * Extract page_error events
 */
export function getPageErrorEvents(events: ScraperEvent[]): PageErrorEvent[] {
  return events.filter((e): e is PageErrorEvent => e.type === 'page_error')
}

/**
 * Extract complete event (should be last)
 */
export function getCompleteEvent(events: ScraperEvent[]): CompleteEvent | null {
  const complete = events.find((e): e is CompleteEvent => e.type === 'complete')
  return complete || null
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Count pages by type
 */
export function countPageTypes(events: PageScrapedEvent[]): PageTypeDistribution {
  const counts: PageTypeDistribution = {
    campus: 0,
    faculty: 0,
    course: 0,
    programme: 0,
    department: 0,
    unknown: 0,
  }

  for (const event of events) {
    const pageType = event.pageType.toLowerCase()
    if (pageType in counts) {
      counts[pageType as keyof PageTypeDistribution]++
    } else {
      counts.unknown++
    }
  }

  return counts
}

/**
 * Calculate extraction success rate
 * Success = page has a known type (not 'unknown')
 */
export function calculateExtractionRate(pageTypes: PageTypeDistribution): number {
  const total =
    pageTypes.campus +
    pageTypes.faculty +
    pageTypes.course +
    pageTypes.programme +
    pageTypes.department +
    pageTypes.unknown

  if (total === 0) return 0

  const successful = total - pageTypes.unknown
  return successful / total
}

/**
 * Calculate coverage metrics against targets
 */
export function calculateCoverage(
  pageTypes: PageTypeDistribution,
  targets: { minFaculties: number; minCourses: number; minCampuses: number }
): CoverageMetrics {
  // Combine course and programme counts (they're the same thing)
  const coursesFound = pageTypes.course + pageTypes.programme

  return {
    facultiesFound: pageTypes.faculty,
    facultiesTarget: targets.minFaculties,
    facultyPercent:
      targets.minFaculties > 0
        ? Math.min(pageTypes.faculty / targets.minFaculties, 1)
        : 1,

    coursesFound: coursesFound,
    coursesTarget: targets.minCourses,
    coursePercent:
      targets.minCourses > 0
        ? Math.min(coursesFound / targets.minCourses, 1)
        : 1,

    campusesFound: pageTypes.campus,
    campusesTarget: targets.minCampuses,
    campusPercent:
      targets.minCampuses > 0
        ? Math.min(pageTypes.campus / targets.minCampuses, 1)
        : 1,
  }
}

/**
 * Group errors by type
 */
export function groupErrors(events: PageErrorEvent[]): ErrorEntry[] {
  const errorMap = new Map<string, { count: number; examples: string[] }>()

  for (const event of events) {
    // Extract error type from message
    let errorType = 'unknown'
    const errorMsg = event.error.toLowerCase()

    if (errorMsg.includes('timeout')) {
      errorType = 'timeout'
    } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
      errorType = '404'
    } else if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
      errorType = '403'
    } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      errorType = 'rate_limit'
    } else if (errorMsg.includes('500') || errorMsg.includes('server error')) {
      errorType = 'server_error'
    } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
      errorType = 'network'
    }

    const existing = errorMap.get(errorType)
    if (existing) {
      existing.count++
      if (existing.examples.length < 3) {
        existing.examples.push(event.url)
      }
    } else {
      errorMap.set(errorType, { count: 1, examples: [event.url] })
    }
  }

  return Array.from(errorMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    examples: data.examples,
  }))
}

// ============================================================================
// Full Metrics Calculation
// ============================================================================

/**
 * Calculate all testing metrics from scraper output
 */
export function calculateTestingMetrics(
  output: string,
  targets: { minFaculties: number; minCourses: number; minCampuses: number }
): TestingMetrics {
  const events = parseScraperOutput(output)
  const pageEvents = getPageScrapedEvents(events)
  const errorEvents = getPageErrorEvents(events)
  const completeEvent = getCompleteEvent(events)

  const pageTypes = countPageTypes(pageEvents)
  const extractionRate = calculateExtractionRate(pageTypes)
  const coverage = calculateCoverage(pageTypes, targets)
  const errors = groupErrors(errorEvents)

  // Get elapsed time from complete event or estimate
  const elapsedMs = completeEvent?.results?.elapsedMs || 0

  return {
    pagesScraped: pageEvents.length,
    pageTypes,
    extractionSuccessRate: extractionRate,
    coverageMetrics: coverage,
    errors,
    elapsedMs,
  }
}

/**
 * Determine if metrics pass the targets
 */
export function evaluateMetrics(
  metrics: TestingMetrics,
  targetCoverage: number = 0.9,
  targetExtraction: number = 0.9
): { coveragePassed: boolean; extractionPassed: boolean; overallPassed: boolean } {
  const { coverageMetrics, extractionSuccessRate } = metrics

  // All three coverage metrics must pass
  const coveragePassed =
    coverageMetrics.facultyPercent >= targetCoverage &&
    coverageMetrics.coursePercent >= targetCoverage &&
    coverageMetrics.campusPercent >= targetCoverage

  const extractionPassed = extractionSuccessRate >= targetExtraction

  return {
    coveragePassed,
    extractionPassed,
    overallPassed: coveragePassed && extractionPassed,
  }
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Format metrics as human-readable summary
 */
export function formatMetricsSummary(metrics: TestingMetrics): string {
  const { coverageMetrics: c, extractionSuccessRate, pagesScraped, errors } = metrics

  const lines = [
    `Pages Scraped: ${pagesScraped}`,
    ``,
    `Coverage:`,
    `  Faculties: ${c.facultiesFound}/${c.facultiesTarget} (${(c.facultyPercent * 100).toFixed(1)}%)`,
    `  Courses: ${c.coursesFound}/${c.coursesTarget} (${(c.coursePercent * 100).toFixed(1)}%)`,
    `  Campuses: ${c.campusesFound}/${c.campusesTarget} (${(c.campusPercent * 100).toFixed(1)}%)`,
    ``,
    `Extraction Rate: ${(extractionSuccessRate * 100).toFixed(1)}%`,
  ]

  if (errors.length > 0) {
    lines.push(``, `Errors:`)
    for (const e of errors) {
      lines.push(`  ${e.type}: ${e.count}`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate comparison between two metrics (before/after)
 */
export function compareMetrics(
  before: TestingMetrics,
  after: TestingMetrics
): { improved: boolean; delta: string } {
  const beforeAvg =
    (before.coverageMetrics.facultyPercent +
      before.coverageMetrics.coursePercent +
      before.coverageMetrics.campusPercent) /
    3
  const afterAvg =
    (after.coverageMetrics.facultyPercent +
      after.coverageMetrics.coursePercent +
      after.coverageMetrics.campusPercent) /
    3

  const coverageDelta = afterAvg - beforeAvg
  const extractionDelta =
    after.extractionSuccessRate - before.extractionSuccessRate

  const improved = coverageDelta > 0 || extractionDelta > 0

  const delta = [
    `Coverage: ${(beforeAvg * 100).toFixed(1)}% → ${(afterAvg * 100).toFixed(1)}% (${coverageDelta >= 0 ? '+' : ''}${(coverageDelta * 100).toFixed(1)}%)`,
    `Extraction: ${(before.extractionSuccessRate * 100).toFixed(1)}% → ${(after.extractionSuccessRate * 100).toFixed(1)}% (${extractionDelta >= 0 ? '+' : ''}${(extractionDelta * 100).toFixed(1)}%)`,
  ].join('\n')

  return { improved, delta }
}
