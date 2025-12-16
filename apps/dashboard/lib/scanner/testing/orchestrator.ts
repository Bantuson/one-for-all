/**
 * Multi-Agent Scanner Testing Orchestrator
 *
 * Coordinates Testing, Research, and Config Enhancement agents
 * to systematically improve university scanner configurations
 * until 90% accuracy is achieved.
 *
 * This file is designed to be used as reference/documentation
 * for the Claude Code agent that will orchestrate the testing.
 * The actual orchestration happens via the Task tool in conversation.
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  Institution,
  OrchestratorState,
  InstitutionResults,
  IterationResult,
  TestingMetrics,
  ResearchFindings,
  ConfigChanges,
  SummaryReport,
  InstitutionReport,
  IterationCommit,
  DEFAULT_CONFIG,
} from './types'
import { TARGET_INSTITUTIONS } from './types'
import {
  calculateTestingMetrics,
  evaluateMetrics,
  formatMetricsSummary,
  compareMetrics,
} from './metrics'

// ============================================================================
// State Management
// ============================================================================

/**
 * Initialize orchestrator state for a new run
 */
export function initializeState(
  institutions: Institution[] = TARGET_INSTITUTIONS,
  config: Partial<typeof DEFAULT_CONFIG> = {}
): OrchestratorState {
  const runId = `test-${new Date().toISOString().split('T')[0]}-${Date.now().toString(36)}`

  const results: Record<string, InstitutionResults> = {}
  for (const inst of institutions) {
    results[inst.shortName] = {
      iterations: [],
      currentStatus: 'untested',
      lastTestedAt: null,
    }
  }

  return {
    runId,
    startedAt: new Date().toISOString(),
    currentIteration: 0,
    maxIterations: config.maxIterations ?? 5,
    targetCoverage: config.targetCoverage ?? 0.9,
    targetExtraction: config.targetExtraction ?? 0.9,
    institutions,
    results,
    summary: {
      institutionsPassing: 0,
      institutionsFailing: 0,
      institutionsError: 0,
      averageCoverage: 0,
      averageExtraction: 0,
      totalPagesScraped: 0,
      totalConfigChanges: 0,
    },
  }
}

/**
 * Update state with testing results for an institution
 */
export function recordTestingResult(
  state: OrchestratorState,
  shortName: string,
  metrics: TestingMetrics
): OrchestratorState {
  const evaluation = evaluateMetrics(
    metrics,
    state.targetCoverage,
    state.targetExtraction
  )

  const iterationResult: IterationResult = {
    iteration: state.currentIteration,
    timestamp: new Date().toISOString(),
    testing: metrics,
    coveragePassed: evaluation.coveragePassed,
    extractionPassed: evaluation.extractionPassed,
    overallPassed: evaluation.overallPassed,
  }

  const instResults = state.results[shortName]
  if (!instResults) {
    throw new Error(`Institution ${shortName} not found in state`)
  }
  instResults.iterations.push(iterationResult)
  instResults.currentStatus = evaluation.overallPassed ? 'passing' : 'failing'
  instResults.lastTestedAt = iterationResult.timestamp

  // Update summary
  updateSummary(state)

  return state
}

/**
 * Record research findings for an institution
 */
export function recordResearchResult(
  state: OrchestratorState,
  shortName: string,
  research: ResearchFindings
): OrchestratorState {
  const instResults = state.results[shortName]
  if (!instResults) return state
  const lastIteration = instResults.iterations[instResults.iterations.length - 1]

  if (lastIteration) {
    lastIteration.research = research
  }

  return state
}

/**
 * Record config changes for an institution
 */
export function recordConfigChanges(
  state: OrchestratorState,
  shortName: string,
  changes: ConfigChanges
): OrchestratorState {
  const instResults = state.results[shortName]
  if (!instResults) return state
  const lastIteration = instResults.iterations[instResults.iterations.length - 1]

  if (lastIteration) {
    lastIteration.configChanges = changes
    state.summary.totalConfigChanges++
  }

  return state
}

/**
 * Mark an institution as having an error
 */
export function recordError(
  state: OrchestratorState,
  shortName: string,
  errorMessage: string
): OrchestratorState {
  const instResults = state.results[shortName]
  if (!instResults) return state
  instResults.currentStatus = 'error'
  instResults.errorMessage = errorMessage
  updateSummary(state)
  return state
}

/**
 * Update summary statistics
 */
function updateSummary(state: OrchestratorState): void {
  let passing = 0
  let failing = 0
  let error = 0
  let totalCoverage = 0
  let totalExtraction = 0
  let totalPages = 0
  let validInstitutions = 0

  for (const shortName of Object.keys(state.results)) {
    const inst = state.results[shortName]
    if (!inst) continue

    switch (inst.currentStatus) {
      case 'passing':
        passing++
        break
      case 'failing':
        failing++
        break
      case 'error':
        error++
        break
    }

    // Get latest iteration metrics
    const lastIteration = inst.iterations[inst.iterations.length - 1]
    if (lastIteration?.testing) {
      const cm = lastIteration.testing.coverageMetrics
      const avgCoverage =
        (cm.facultyPercent + cm.coursePercent + cm.campusPercent) / 3
      totalCoverage += avgCoverage
      totalExtraction += lastIteration.testing.extractionSuccessRate
      totalPages += lastIteration.testing.pagesScraped
      validInstitutions++
    }
  }

  state.summary = {
    institutionsPassing: passing,
    institutionsFailing: failing,
    institutionsError: error,
    averageCoverage: validInstitutions > 0 ? totalCoverage / validInstitutions : 0,
    averageExtraction:
      validInstitutions > 0 ? totalExtraction / validInstitutions : 0,
    totalPagesScraped: totalPages,
    totalConfigChanges: state.summary.totalConfigChanges,
  }
}

// ============================================================================
// Prompt Generation
// ============================================================================

/**
 * Load a prompt template and fill in placeholders
 */
export function loadPromptTemplate(
  templateName: 'testing' | 'research' | 'config',
  variables: Record<string, string | number>
): string {
  const templatePath = path.join(__dirname, 'prompts', `${templateName}.md`)
  let template = fs.readFileSync(templatePath, 'utf-8')

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    template = template.replace(placeholder, String(value))
  }

  return template
}

/**
 * Generate testing agent prompt for an institution
 */
export function generateTestingPrompt(
  institution: Institution,
  config: { maxPages: number; maxDepth: number; minFaculties: number; minCourses: number; minCampuses: number }
): string {
  return loadPromptTemplate('testing', {
    INSTITUTION_NAME: institution.name,
    SHORT_NAME: institution.shortName,
    DOMAIN: institution.domain,
    BASE_URL: institution.baseUrl,
    CONFIG_PATH: institution.configPath,
    MAX_PAGES: config.maxPages,
    MAX_DEPTH: config.maxDepth,
    MIN_FACULTIES: config.minFaculties,
    MIN_COURSES: config.minCourses,
    MIN_CAMPUSES: config.minCampuses,
  })
}

/**
 * Generate research agent prompt for an institution
 */
export function generateResearchPrompt(
  institution: Institution,
  currentMetrics: TestingMetrics,
  currentPriorityUrls: string[]
): string {
  const cm = currentMetrics.coverageMetrics
  return loadPromptTemplate('research', {
    INSTITUTION_NAME: institution.name,
    SHORT_NAME: institution.shortName,
    DOMAIN: institution.domain,
    BASE_URL: institution.baseUrl,
    CURRENT_PRIORITY_URLS: JSON.stringify(currentPriorityUrls, null, 2),
    FACULTY_PERCENT: (cm.facultyPercent * 100).toFixed(1),
    COURSE_PERCENT: (cm.coursePercent * 100).toFixed(1),
    CAMPUS_PERCENT: (cm.campusPercent * 100).toFixed(1),
    EXTRACTION_RATE: (currentMetrics.extractionSuccessRate * 100).toFixed(1),
  })
}

/**
 * Generate config enhancement agent prompt
 */
export function generateConfigPrompt(
  institution: Institution,
  currentConfig: string,
  researchFindings: ResearchFindings
): string {
  return loadPromptTemplate('config', {
    INSTITUTION_NAME: institution.name,
    SHORT_NAME: institution.shortName,
    CONFIG_PATH: institution.configPath,
    CURRENT_CONFIG: currentConfig,
    RESEARCH_FINDINGS: JSON.stringify(researchFindings, null, 2),
  })
}

// ============================================================================
// Iteration Control
// ============================================================================

/**
 * Get institutions that need testing (not yet tested or failed)
 */
export function getInstitutionsToTest(state: OrchestratorState): Institution[] {
  return state.institutions.filter((inst) => {
    const results = state.results[inst.shortName]
    if (!results) return true // untested
    return results.currentStatus !== 'passing' && results.currentStatus !== 'error'
  })
}

/**
 * Get institutions that need research (failed testing)
 */
export function getInstitutionsForResearch(state: OrchestratorState): Institution[] {
  return state.institutions.filter((inst) => {
    const results = state.results[inst.shortName]
    if (!results) return false
    return results.currentStatus === 'failing'
  })
}

/**
 * Check if iteration should continue
 */
export function shouldContinueIteration(state: OrchestratorState): {
  continue: boolean
  reason: string
} {
  // Check max iterations
  if (state.currentIteration >= state.maxIterations) {
    return {
      continue: false,
      reason: `Reached maximum iterations (${state.maxIterations})`,
    }
  }

  // Check if all passing
  const allPassing = Object.values(state.results).every(
    (r) => r.currentStatus === 'passing' || r.currentStatus === 'error'
  )
  if (allPassing) {
    return { continue: false, reason: 'All institutions are passing or have errors' }
  }

  // Check for improvement in last iteration
  if (state.currentIteration > 1) {
    const hasImprovement = checkForImprovement(state)
    if (!hasImprovement) {
      return { continue: false, reason: 'No improvement in last iteration' }
    }
  }

  return { continue: true, reason: 'Continuing to improve failing institutions' }
}

/**
 * Check if there was improvement compared to previous iteration
 */
function checkForImprovement(state: OrchestratorState): boolean {
  let improvementCount = 0

  for (const shortName of Object.keys(state.results)) {
    const instResults = state.results[shortName]
    if (!instResults) continue
    const iterations = instResults.iterations
    if (iterations.length < 2) continue

    const current = iterations[iterations.length - 1]
    const previous = iterations[iterations.length - 2]

    if (current && previous) {
      const currentAvg =
        (current.testing.coverageMetrics.facultyPercent +
          current.testing.coverageMetrics.coursePercent +
          current.testing.coverageMetrics.campusPercent) /
          3 +
        current.testing.extractionSuccessRate

      const previousAvg =
        (previous.testing.coverageMetrics.facultyPercent +
          previous.testing.coverageMetrics.coursePercent +
          previous.testing.coverageMetrics.campusPercent) /
          3 +
        previous.testing.extractionSuccessRate

      if (currentAvg > previousAvg) {
        improvementCount++
      }
    }
  }

  return improvementCount > 0
}

// ============================================================================
// Git Integration
// ============================================================================

/**
 * Generate git commit message for an iteration
 */
export function generateCommitMessage(state: OrchestratorState): string {
  const { summary, currentIteration } = state
  const total = state.institutions.length
  const passing = summary.institutionsPassing

  // Get institutions that had config changes this iteration
  const changedInstitutions: string[] = []
  const changeDescriptions: string[] = []

  for (const [shortName, results] of Object.entries(state.results)) {
    const lastIteration = results.iterations[results.iterations.length - 1]
    if (lastIteration?.configChanges) {
      changedInstitutions.push(shortName)
      const added = lastIteration.configChanges.priorityUrlsAdded.length
      const patterns = Object.values(lastIteration.configChanges.urlPatternsUpdated)
        .filter((v) => v !== null).length
      changeDescriptions.push(
        `- [${shortName}] Added ${added} URLs, updated ${patterns} patterns`
      )
    }
  }

  // Calculate metrics delta if we have previous iteration
  let metricsLine = ''
  if (currentIteration > 1) {
    const prevCoverage = calculatePreviousAverageCoverage(state)
    const prevExtraction = calculatePreviousAverageExtraction(state)
    metricsLine = `
Metrics change:
- Coverage: ${(prevCoverage * 100).toFixed(1)}% → ${(summary.averageCoverage * 100).toFixed(1)}%
- Extraction: ${(prevExtraction * 100).toFixed(1)}% → ${(summary.averageExtraction * 100).toFixed(1)}%`
  } else {
    metricsLine = `
Baseline metrics:
- Coverage: ${(summary.averageCoverage * 100).toFixed(1)}%
- Extraction: ${(summary.averageExtraction * 100).toFixed(1)}%`
  }

  const changesSection =
    changeDescriptions.length > 0
      ? `
Config changes:
${changeDescriptions.join('\n')}`
      : ''

  return `feat(scanner): iteration ${currentIteration} - ${passing}/${total} institutions passing
${metricsLine}
${changesSection}

🤖 Generated by Scanner Testing Orchestrator

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
}

function calculatePreviousAverageCoverage(state: OrchestratorState): number {
  let total = 0
  let count = 0

  for (const results of Object.values(state.results)) {
    if (results.iterations.length >= 2) {
      const prev = results.iterations[results.iterations.length - 2]
      if (prev?.testing) {
        const cm = prev.testing.coverageMetrics
        total += (cm.facultyPercent + cm.coursePercent + cm.campusPercent) / 3
        count++
      }
    }
  }

  return count > 0 ? total / count : 0
}

function calculatePreviousAverageExtraction(state: OrchestratorState): number {
  let total = 0
  let count = 0

  for (const results of Object.values(state.results)) {
    if (results.iterations.length >= 2) {
      const prev = results.iterations[results.iterations.length - 2]
      if (prev?.testing) {
        total += prev.testing.extractionSuccessRate
        count++
      }
    }
  }

  return count > 0 ? total / count : 0
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate final summary report
 */
export function generateSummaryReport(state: OrchestratorState): SummaryReport {
  const passing: string[] = []
  const failing: string[] = []
  const error: string[] = []
  const failureReasons: Record<string, string> = {}
  const byInstitution: Record<string, InstitutionReport> = {}

  for (const inst of state.institutions) {
    const results = state.results[inst.shortName]
    if (!results) continue
    const lastIteration = results.iterations[results.iterations.length - 1]

    // Categorize
    switch (results.currentStatus) {
      case 'passing':
        passing.push(inst.shortName)
        break
      case 'failing':
        failing.push(inst.shortName)
        // Determine failure reason
        if (lastIteration) {
          const cm = lastIteration.testing.coverageMetrics
          const reasons: string[] = []
          if (cm.facultyPercent < 0.9) reasons.push(`faculties ${(cm.facultyPercent * 100).toFixed(0)}%`)
          if (cm.coursePercent < 0.9) reasons.push(`courses ${(cm.coursePercent * 100).toFixed(0)}%`)
          if (cm.campusPercent < 0.9) reasons.push(`campuses ${(cm.campusPercent * 100).toFixed(0)}%`)
          if (lastIteration.testing.extractionSuccessRate < 0.9) {
            reasons.push(`extraction ${(lastIteration.testing.extractionSuccessRate * 100).toFixed(0)}%`)
          }
          failureReasons[inst.shortName] = reasons.join(', ')
        }
        break
      case 'error':
        error.push(inst.shortName)
        failureReasons[inst.shortName] = results.errorMessage || 'Unknown error'
        break
    }

    // Build institution report
    const report: InstitutionReport = {
      shortName: inst.shortName,
      name: inst.name,
      status: results.currentStatus === 'passing' ? 'PASSING' : results.currentStatus === 'error' ? 'ERROR' : 'FAILING',
      iterations: results.iterations.length,
      configChanges: [],
    }

    if (lastIteration?.testing) {
      const cm = lastIteration.testing.coverageMetrics
      report.finalMetrics = {
        coverage: {
          faculties: { found: cm.facultiesFound, target: cm.facultiesTarget, percent: cm.facultyPercent },
          courses: { found: cm.coursesFound, target: cm.coursesTarget, percent: cm.coursePercent },
          campuses: { found: cm.campusesFound, target: cm.campusesTarget, percent: cm.campusPercent },
        },
        extraction: { successRate: lastIteration.testing.extractionSuccessRate },
        performance: {
          pagesScraped: lastIteration.testing.pagesScraped,
          elapsedMs: lastIteration.testing.elapsedMs,
        },
      }
    }

    // Collect config changes across iterations
    for (const iter of results.iterations) {
      if (iter.configChanges) {
        if (iter.configChanges.priorityUrlsAdded.length > 0) {
          report.configChanges.push(
            `Added ${iter.configChanges.priorityUrlsAdded.length} priority URLs`
          )
        }
        if (iter.configChanges.notes) {
          report.configChanges.push(iter.configChanges.notes)
        }
      }
    }

    if (results.errorMessage) {
      report.errorMessage = results.errorMessage
    }

    byInstitution[inst.shortName] = report
  }

  // Calculate duration
  const startTime = new Date(state.startedAt).getTime()
  const durationMs = Date.now() - startTime
  const durationMin = Math.floor(durationMs / 60000)
  const durationSec = Math.floor((durationMs % 60000) / 1000)
  const duration = `${durationMin}m ${durationSec}s`

  return {
    runId: state.runId,
    totalIterations: state.currentIteration,
    duration,
    results: {
      passing,
      failing,
      error,
      passRate: `${((passing.length / state.institutions.length) * 100).toFixed(1)}%`,
    },
    metrics: {
      averageCoverage: state.summary.averageCoverage,
      averageExtraction: state.summary.averageExtraction,
      totalPagesScraped: state.summary.totalPagesScraped,
      totalConfigChanges: state.summary.totalConfigChanges,
    },
    byInstitution,
    failureReasons,
  }
}

/**
 * Format summary report as human-readable text
 */
export function formatSummaryReport(report: SummaryReport): string {
  const lines: string[] = [
    `═══════════════════════════════════════════════════════════════════`,
    `  SCANNER TESTING REPORT - ${report.runId}`,
    `═══════════════════════════════════════════════════════════════════`,
    ``,
    `Duration: ${report.duration} | Iterations: ${report.totalIterations}`,
    ``,
    `RESULTS: ${report.results.passRate} passing`,
    `  ✅ Passing: ${report.results.passing.join(', ') || 'None'}`,
    `  ❌ Failing: ${report.results.failing.join(', ') || 'None'}`,
    `  ⚠️  Errors: ${report.results.error.join(', ') || 'None'}`,
    ``,
    `AGGREGATE METRICS:`,
    `  Coverage:   ${(report.metrics.averageCoverage * 100).toFixed(1)}%`,
    `  Extraction: ${(report.metrics.averageExtraction * 100).toFixed(1)}%`,
    `  Pages:      ${report.metrics.totalPagesScraped}`,
    `  Changes:    ${report.metrics.totalConfigChanges} configs modified`,
    ``,
    `───────────────────────────────────────────────────────────────────`,
    `  BY INSTITUTION`,
    `───────────────────────────────────────────────────────────────────`,
  ]

  for (const [shortName, inst] of Object.entries(report.byInstitution)) {
    const status = inst.status === 'PASSING' ? '✅' : inst.status === 'ERROR' ? '⚠️' : '❌'
    lines.push(``)
    lines.push(`${status} ${shortName} (${inst.name})`)

    if (inst.finalMetrics) {
      const fm = inst.finalMetrics
      lines.push(`   Coverage:`)
      lines.push(`     Faculties: ${fm.coverage.faculties.found}/${fm.coverage.faculties.target} (${(fm.coverage.faculties.percent * 100).toFixed(0)}%)`)
      lines.push(`     Courses:   ${fm.coverage.courses.found}/${fm.coverage.courses.target} (${(fm.coverage.courses.percent * 100).toFixed(0)}%)`)
      lines.push(`     Campuses:  ${fm.coverage.campuses.found}/${fm.coverage.campuses.target} (${(fm.coverage.campuses.percent * 100).toFixed(0)}%)`)
      lines.push(`   Extraction: ${(fm.extraction.successRate * 100).toFixed(1)}%`)
      lines.push(`   Pages: ${fm.performance.pagesScraped} in ${(fm.performance.elapsedMs / 1000).toFixed(1)}s`)
    }

    if (inst.configChanges.length > 0) {
      lines.push(`   Changes: ${inst.configChanges.join('; ')}`)
    }

    if (inst.errorMessage) {
      lines.push(`   Error: ${inst.errorMessage}`)
    }
  }

  if (Object.keys(report.failureReasons).length > 0) {
    lines.push(``)
    lines.push(`───────────────────────────────────────────────────────────────────`)
    lines.push(`  FAILURE REASONS`)
    lines.push(`───────────────────────────────────────────────────────────────────`)
    for (const [shortName, reason] of Object.entries(report.failureReasons)) {
      lines.push(`  ${shortName}: ${reason}`)
    }
  }

  lines.push(``)
  lines.push(`═══════════════════════════════════════════════════════════════════`)

  return lines.join('\n')
}

// ============================================================================
// Utility Functions for CLI
// ============================================================================

/**
 * Parse scraper command to run
 */
export function getScraperCommand(institution: Institution, maxPages = 50, maxDepth = 3): string {
  const config = JSON.stringify({ maxPages, maxDepth })
  return `cd /home/mzansi_agentive/projects/portfolio/apps/dashboard && ~/.bun/bin/bun run lib/scanner/scraper.ts "${institution.baseUrl}" '${config}'`
}

/**
 * Get git commands for committing iteration changes
 */
export function getGitCommitCommands(state: OrchestratorState): string[] {
  const commitMessage = generateCommitMessage(state)
  return [
    'git add apps/dashboard/lib/scanner/university-configs/',
    `git commit -m "$(cat <<'EOF'\n${commitMessage}\nEOF\n)"`,
  ]
}

/**
 * Read current config file for an institution
 */
export function getConfigPath(institution: Institution): string {
  return path.join(
    '/home/mzansi_agentive/projects/portfolio',
    institution.configPath
  )
}

// ============================================================================
// Export Constants
// ============================================================================

export { TARGET_INSTITUTIONS }
