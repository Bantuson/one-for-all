/**
 * Types for Multi-Agent Scanner Testing System
 *
 * Defines state management, metrics, and result structures for the
 * orchestrator that coordinates Testing, Research, and Config Enhancement agents.
 */

// ============================================================================
// Institution Types
// ============================================================================

export interface Institution {
  shortName: string
  name: string
  domain: string
  baseUrl: string
  configPath: string
}

export const TARGET_INSTITUTIONS: Institution[] = [
  {
    shortName: 'UP',
    name: 'University of Pretoria',
    domain: 'up.ac.za',
    baseUrl: 'https://www.up.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/up.ts',
  },
  {
    shortName: 'UCT',
    name: 'University of Cape Town',
    domain: 'uct.ac.za',
    baseUrl: 'https://www.uct.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/uct.ts',
  },
  {
    shortName: 'Wits',
    name: 'University of the Witwatersrand',
    domain: 'wits.ac.za',
    baseUrl: 'https://www.wits.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/wits.ts',
  },
  {
    shortName: 'SUN',
    name: 'Stellenbosch University',
    domain: 'sun.ac.za',
    baseUrl: 'https://www.sun.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/sun.ts',
  },
  {
    shortName: 'UKZN',
    name: 'University of KwaZulu-Natal',
    domain: 'ukzn.ac.za',
    baseUrl: 'https://www.ukzn.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/ukzn.ts',
  },
  {
    shortName: 'UJ',
    name: 'University of Johannesburg',
    domain: 'uj.ac.za',
    baseUrl: 'https://www.uj.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/uj.ts',
  },
  {
    shortName: 'UFS',
    name: 'University of the Free State',
    domain: 'ufs.ac.za',
    baseUrl: 'https://www.ufs.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/ufs.ts',
  },
  {
    shortName: 'TUT',
    name: 'Tshwane University of Technology',
    domain: 'tut.ac.za',
    baseUrl: 'https://www.tut.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/tut.ts',
  },
  {
    shortName: 'UNISA',
    name: 'University of South Africa',
    domain: 'unisa.ac.za',
    baseUrl: 'https://www.unisa.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/unisa.ts',
  },
  {
    shortName: 'NWU',
    name: 'North-West University',
    domain: 'nwu.ac.za',
    baseUrl: 'https://www.nwu.ac.za',
    configPath: 'apps/dashboard/lib/scanner/university-configs/nwu.ts',
  },
  {
    shortName: 'Eduvos',
    name: 'Eduvos',
    domain: 'eduvos.com',
    baseUrl: 'https://www.eduvos.com',
    configPath: 'apps/dashboard/lib/scanner/university-configs/eduvos.ts',
  },
]

// ============================================================================
// Testing Metrics Types
// ============================================================================

export interface PageTypeDistribution {
  campus: number
  faculty: number
  course: number
  programme: number
  department: number
  unknown: number
}

export interface CoverageMetrics {
  facultiesFound: number
  facultiesTarget: number
  facultyPercent: number
  coursesFound: number
  coursesTarget: number
  coursePercent: number
  campusesFound: number
  campusesTarget: number
  campusPercent: number
}

export interface ErrorEntry {
  type: string
  count: number
  examples?: string[]
}

export interface TestingMetrics {
  pagesScraped: number
  pageTypes: PageTypeDistribution
  extractionSuccessRate: number
  coverageMetrics: CoverageMetrics
  errors: ErrorEntry[]
  elapsedMs: number
}

// ============================================================================
// Research Findings Types
// ============================================================================

export interface ResearchFindings {
  discoveredUrls: string[]
  recommendedPriorityUrls: string[]
  paginationPatterns: string[]
  selectorRecommendations: {
    mainContent?: string
    facultyList?: string
    programmeList?: string
    courseCard?: string
  }
  urlPatternRecommendations: {
    faculty?: string
    programme?: string
    campus?: string
  }
  notes: string
}

// ============================================================================
// Config Changes Types
// ============================================================================

export interface ConfigChanges {
  priorityUrlsAdded: string[]
  priorityUrlsRemoved: string[]
  urlPatternsUpdated: {
    faculty?: string | null
    programme?: string | null
    campus?: string | null
  }
  targetsAdjusted: {
    minFaculties?: number | null
    minCourses?: number | null
    minCampuses?: number | null
  }
  selectorsUpdated: {
    mainContent?: string | null
    facultyList?: string | null
    programmeList?: string | null
  }
  notes: string
}

// ============================================================================
// Iteration Result Types
// ============================================================================

export interface IterationResult {
  iteration: number
  timestamp: string

  // Testing phase results
  testing: TestingMetrics

  // Research phase results (if applicable)
  research?: ResearchFindings

  // Config changes made (if applicable)
  configChanges?: ConfigChanges

  // Pass/fail determination
  coveragePassed: boolean
  extractionPassed: boolean
  overallPassed: boolean
}

export interface InstitutionResults {
  iterations: IterationResult[]
  currentStatus: 'passing' | 'failing' | 'untested' | 'error'
  lastTestedAt: string | null
  errorMessage?: string
}

// ============================================================================
// Orchestrator State Types
// ============================================================================

export interface OrchestratorState {
  // Metadata
  runId: string
  startedAt: string
  currentIteration: number
  maxIterations: number

  // Targets
  targetCoverage: number
  targetExtraction: number

  // Institutions being tested
  institutions: Institution[]

  // Results per institution
  results: Record<string, InstitutionResults>

  // Summary statistics
  summary: {
    institutionsPassing: number
    institutionsFailing: number
    institutionsError: number
    averageCoverage: number
    averageExtraction: number
    totalPagesScraped: number
    totalConfigChanges: number
  }
}

// ============================================================================
// Agent Response Types
// ============================================================================

export interface TestingAgentResponse {
  institution: string
  timestamp: string
  testing: TestingMetrics
  coveragePassed: boolean
  extractionPassed: boolean
  overallPassed: boolean
  notes: string
}

export interface ResearchAgentResponse {
  institution: string
  timestamp: string
  research: ResearchFindings
}

export interface ConfigAgentResponse {
  institution: string
  timestamp: string
  configChanges: ConfigChanges
  updatedConfigCode: string
}

// ============================================================================
// Report Types
// ============================================================================

export interface InstitutionReport {
  shortName: string
  name: string
  status: 'PASSING' | 'FAILING' | 'ERROR'
  iterations: number
  finalMetrics?: {
    coverage: {
      faculties: { found: number; target: number; percent: number }
      courses: { found: number; target: number; percent: number }
      campuses: { found: number; target: number; percent: number }
    }
    extraction: { successRate: number }
    performance: { pagesScraped: number; elapsedMs: number }
  }
  configChanges: string[]
  errorMessage?: string
}

export interface SummaryReport {
  runId: string
  totalIterations: number
  duration: string
  results: {
    passing: string[]
    failing: string[]
    error: string[]
    passRate: string
  }
  metrics: {
    averageCoverage: number
    averageExtraction: number
    totalPagesScraped: number
    totalConfigChanges: number
  }
  byInstitution: Record<string, InstitutionReport>
  failureReasons: Record<string, string>
}

// ============================================================================
// Git Commit Types
// ============================================================================

export interface IterationCommit {
  iteration: number
  timestamp: string
  institutionsModified: string[]
  coverageDelta: { before: number; after: number }
  extractionDelta: { before: number; after: number }
  changes: Array<{ institution: string; description: string }>
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CONFIG = {
  maxIterations: 5,
  targetCoverage: 0.9,
  targetExtraction: 0.9,
  maxParallelAgents: 10,
  scraperTimeout: 300000, // 5 minutes per institution
  maxPagesPerScan: 50, // Limit for baseline testing
}
