#!/usr/bin/env bun
/**
 * Scanner Testing Runner
 *
 * CLI entry point for running the multi-agent scanner testing system.
 * This script provides commands to run scraper tests and collect metrics.
 *
 * Usage:
 *   bun run lib/scanner/testing/runner.ts test <institution>
 *   bun run lib/scanner/testing/runner.ts test-all
 *   bun run lib/scanner/testing/runner.ts metrics <ndjson-file>
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { TARGET_INSTITUTIONS, DEFAULT_CONFIG, type Institution } from './types'
import {
  calculateTestingMetrics,
  evaluateMetrics,
  formatMetricsSummary,
} from './metrics'
import {
  initializeState,
  recordTestingResult,
  generateSummaryReport,
  formatSummaryReport,
  getScraperCommand,
} from './orchestrator'

// ============================================================================
// Institution Lookup
// ============================================================================

function findInstitution(shortName: string): Institution | null {
  const normalized = shortName.toUpperCase()
  return (
    TARGET_INSTITUTIONS.find(
      (i) =>
        i.shortName.toUpperCase() === normalized ||
        i.name.toLowerCase().includes(shortName.toLowerCase())
    ) || null
  )
}

function getInstitutionTargets(institution: Institution): {
  minFaculties: number
  minCourses: number
  minCampuses: number
} {
  // Default targets - these would normally come from the config file
  // For now, use sensible defaults
  const defaultTargets = {
    minFaculties: 8,
    minCourses: 100,
    minCampuses: 3,
  }

  // Try to load from config file
  try {
    const configPath = path.join(
      '/home/mzansi_agentive/projects/portfolio',
      institution.configPath
    )
    const configContent = fs.readFileSync(configPath, 'utf-8')

    // Parse targets from config (simple regex extraction)
    const facultyMatch = configContent.match(/minFaculties:\s*(\d+)/)
    const courseMatch = configContent.match(/minCourses:\s*(\d+)/)
    const campusMatch = configContent.match(/minCampuses:\s*(\d+)/)

    return {
      minFaculties: facultyMatch?.[1] ? parseInt(facultyMatch[1], 10) : defaultTargets.minFaculties,
      minCourses: courseMatch?.[1] ? parseInt(courseMatch[1], 10) : defaultTargets.minCourses,
      minCampuses: campusMatch?.[1] ? parseInt(campusMatch[1], 10) : defaultTargets.minCampuses,
    }
  } catch {
    return defaultTargets
  }
}

// ============================================================================
// Scraper Execution
// ============================================================================

async function runScraper(
  institution: Institution,
  maxPages: number = DEFAULT_CONFIG.maxPagesPerScan,
  maxDepth: number = 3,
  timeout: number = DEFAULT_CONFIG.scraperTimeout
): Promise<{ output: string; success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const config = JSON.stringify({ maxPages, maxDepth })
    const args = [
      'run',
      'lib/scanner/scraper.ts',
      institution.baseUrl,
      config,
    ]

    console.log(`\n🚀 Starting scraper for ${institution.shortName}...`)
    console.log(`   URL: ${institution.baseUrl}`)
    console.log(`   Config: maxPages=${maxPages}, maxDepth=${maxDepth}`)
    console.log(`   Timeout: ${timeout / 1000}s\n`)

    let output = ''
    let hasError = false
    let errorMessage = ''

    const proc = spawn('bun', args, {
      cwd: '/home/mzansi_agentive/projects/portfolio/apps/dashboard',
      env: { ...process.env, BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: '1' },
    })

    const timeoutId = setTimeout(() => {
      console.log(`\n⏱️  Timeout reached (${timeout / 1000}s), stopping scraper...`)
      proc.kill('SIGTERM')
      hasError = true
      errorMessage = `Timeout after ${timeout / 1000} seconds`
    }, timeout)

    proc.stdout.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      // Print progress events only
      for (const line of chunk.split('\n')) {
        if (line.startsWith('{')) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'progress') {
              process.stdout.write(`\r   Progress: ${event.pagesScraped} pages, ${event.pagesQueued} queued`)
            } else if (event.type === 'page_scraped') {
              console.log(`   ✓ ${event.pageType}: ${event.url.substring(0, 60)}...`)
            } else if (event.type === 'page_error') {
              console.log(`   ✗ Error: ${event.error.substring(0, 50)}...`)
            }
          } catch {
            // Non-JSON line, skip
          }
        }
      }
    })

    proc.stderr.on('data', (data) => {
      const chunk = data.toString()
      // Only log actual errors, not playwright noise
      if (chunk.includes('Error') || chunk.includes('error')) {
        console.error(`   stderr: ${chunk.trim().substring(0, 100)}`)
      }
    })

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      console.log(`\n✅ Scraper finished with code ${code}`)

      if (code !== 0 && !hasError) {
        hasError = true
        errorMessage = `Process exited with code ${code}`
      }

      resolve({
        output,
        success: !hasError,
        error: hasError ? errorMessage : undefined,
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timeoutId)
      hasError = true
      errorMessage = err.message
      resolve({
        output,
        success: false,
        error: errorMessage,
      })
    })
  })
}

// ============================================================================
// Commands
// ============================================================================

async function testInstitution(shortName: string): Promise<void> {
  const institution = findInstitution(shortName)
  if (!institution) {
    console.error(`❌ Institution not found: ${shortName}`)
    console.log('\nAvailable institutions:')
    for (const inst of TARGET_INSTITUTIONS) {
      console.log(`  - ${inst.shortName}: ${inst.name}`)
    }
    process.exit(1)
  }

  const targets = getInstitutionTargets(institution)
  console.log(`\n📊 Testing: ${institution.name} (${institution.shortName})`)
  console.log(`   Targets: ${targets.minFaculties} faculties, ${targets.minCourses} courses, ${targets.minCampuses} campuses`)

  const result = await runScraper(institution)

  if (!result.success) {
    console.error(`\n❌ Scraper failed: ${result.error}`)
    if (result.output) {
      console.log('\nPartial output collected, calculating metrics anyway...')
    } else {
      process.exit(1)
    }
  }

  // Calculate metrics
  const metrics = calculateTestingMetrics(result.output, targets)
  const evaluation = evaluateMetrics(metrics)

  // Print results
  console.log('\n' + '═'.repeat(60))
  console.log(`  RESULTS: ${institution.shortName}`)
  console.log('═'.repeat(60))
  console.log(formatMetricsSummary(metrics))
  console.log('')
  console.log(`Coverage Passed: ${evaluation.coveragePassed ? '✅' : '❌'}`)
  console.log(`Extraction Passed: ${evaluation.extractionPassed ? '✅' : '❌'}`)
  console.log(`Overall: ${evaluation.overallPassed ? '✅ PASSING' : '❌ FAILING'}`)
  console.log('═'.repeat(60))

  // Output JSON for piping
  const jsonResult = {
    institution: institution.shortName,
    timestamp: new Date().toISOString(),
    testing: metrics,
    coveragePassed: evaluation.coveragePassed,
    extractionPassed: evaluation.extractionPassed,
    overallPassed: evaluation.overallPassed,
  }
  console.log('\n📋 JSON Result:')
  console.log(JSON.stringify(jsonResult, null, 2))
}

async function testAllInstitutions(): Promise<void> {
  console.log('═'.repeat(60))
  console.log('  SCANNER TESTING - ALL INSTITUTIONS')
  console.log('═'.repeat(60))
  console.log(`\nTesting ${TARGET_INSTITUTIONS.length} institutions...`)
  console.log('This will take approximately 30-60 minutes.\n')

  const state = initializeState()

  for (const institution of TARGET_INSTITUTIONS) {
    try {
      const targets = getInstitutionTargets(institution)
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`Testing ${institution.shortName} (${institution.name})`)
      console.log('─'.repeat(60))

      const result = await runScraper(institution)
      const metrics = calculateTestingMetrics(result.output, targets)

      recordTestingResult(state, institution.shortName, metrics)

      const evaluation = evaluateMetrics(metrics)
      console.log(`\n   Result: ${evaluation.overallPassed ? '✅ PASSING' : '❌ FAILING'}`)
    } catch (error) {
      console.error(`\n   ❌ Error testing ${institution.shortName}:`, error)
    }
  }

  // Generate final report
  state.currentIteration = 1
  const report = generateSummaryReport(state)
  console.log('\n')
  console.log(formatSummaryReport(report))

  // Save report to file
  const reportPath = path.join(
    '/home/mzansi_agentive/projects/portfolio/apps/dashboard/lib/scanner/testing',
    `report-${state.runId}.json`
  )
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

function parseMetrics(ndjsonPath: string): void {
  if (!fs.existsSync(ndjsonPath)) {
    console.error(`❌ File not found: ${ndjsonPath}`)
    process.exit(1)
  }

  const output = fs.readFileSync(ndjsonPath, 'utf-8')

  // Use default targets for standalone parsing
  const targets = { minFaculties: 8, minCourses: 100, minCampuses: 3 }
  const metrics = calculateTestingMetrics(output, targets)
  const evaluation = evaluateMetrics(metrics)

  console.log(formatMetricsSummary(metrics))
  console.log('')
  console.log(`Overall: ${evaluation.overallPassed ? '✅ PASSING' : '❌ FAILING'}`)
}

function listInstitutions(): void {
  console.log('\n📋 Target Institutions:\n')
  for (const inst of TARGET_INSTITUTIONS) {
    const targets = getInstitutionTargets(inst)
    console.log(`  ${inst.shortName.padEnd(8)} ${inst.name}`)
    console.log(`           ${inst.baseUrl}`)
    console.log(`           Targets: F=${targets.minFaculties} C=${targets.minCourses} Ca=${targets.minCampuses}`)
    console.log('')
  }
}

function printHelp(): void {
  console.log(`
Scanner Testing Runner

Usage:
  bun run runner.ts <command> [args]

Commands:
  test <institution>    Test a single institution (by shortName)
  test-all              Test all 11 target institutions
  metrics <file>        Parse metrics from NDJSON output file
  list                  List all target institutions

Examples:
  bun run runner.ts test UP
  bun run runner.ts test UCT
  bun run runner.ts test-all
  bun run runner.ts metrics ./scraper-output.ndjson

Environment:
  Scraper timeout: ${DEFAULT_CONFIG.scraperTimeout / 1000}s
  Max pages per scan: ${DEFAULT_CONFIG.maxPagesPerScan}
`)
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'test':
      if (!args[1]) {
        console.error('❌ Please specify an institution')
        printHelp()
        process.exit(1)
      }
      await testInstitution(args[1])
      break

    case 'test-all':
      await testAllInstitutions()
      break

    case 'metrics':
      if (!args[1]) {
        console.error('❌ Please specify an NDJSON file')
        printHelp()
        process.exit(1)
      }
      parseMetrics(args[1])
      break

    case 'list':
      listInstitutions()
      break

    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break

    default:
      console.error(`❌ Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main().catch(console.error)
