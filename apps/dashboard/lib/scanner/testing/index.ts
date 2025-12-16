/**
 * Multi-Agent Scanner Testing System
 *
 * Exports all utilities for the orchestrator that coordinates
 * Testing, Research, and Config Enhancement agents.
 */

// Types
export type {
  Institution,
  PageTypeDistribution,
  CoverageMetrics,
  ErrorEntry,
  TestingMetrics,
  ResearchFindings,
  ConfigChanges,
  IterationResult,
  InstitutionResults,
  OrchestratorState,
  TestingAgentResponse,
  ResearchAgentResponse,
  ConfigAgentResponse,
  InstitutionReport,
  SummaryReport,
  IterationCommit,
} from './types'

export { TARGET_INSTITUTIONS, DEFAULT_CONFIG } from './types'

// Metrics utilities
export {
  parseScraperOutput,
  getPageScrapedEvents,
  getPageErrorEvents,
  getCompleteEvent,
  countPageTypes,
  calculateExtractionRate,
  calculateCoverage,
  groupErrors,
  calculateTestingMetrics,
  evaluateMetrics,
  formatMetricsSummary,
  compareMetrics,
} from './metrics'

// Orchestrator utilities
export {
  initializeState,
  recordTestingResult,
  recordResearchResult,
  recordConfigChanges,
  recordError,
  loadPromptTemplate,
  generateTestingPrompt,
  generateResearchPrompt,
  generateConfigPrompt,
  getInstitutionsToTest,
  getInstitutionsForResearch,
  shouldContinueIteration,
  generateCommitMessage,
  generateSummaryReport,
  formatSummaryReport,
  getScraperCommand,
  getGitCommitCommands,
  getConfigPath,
} from './orchestrator'
