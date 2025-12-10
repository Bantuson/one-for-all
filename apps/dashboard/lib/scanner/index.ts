/**
 * AI Website Scanner Module
 *
 * Entry point for the Bun subprocess scraper.
 * This file is executed by `bun run` from the Next.js API routes.
 *
 * Usage:
 *   bun run lib/scanner/index.ts <website_url> [config_json]
 *
 * Output:
 *   JSON events to stdout, one per line (NDJSON format)
 */

// Declare Bun types for runtime check
declare const Bun: { main: string } | undefined

export * from './types'
export * from './utils'
export * from './parser'
export * from './scraper'

import { runScraperSubprocess } from './scraper'

// Run scraper if this is the main module
if (typeof Bun !== 'undefined' && Bun) {
  // Check if running as main entry point
  const isMain = Bun.main === (import.meta as { path?: string }).path

  if (isMain) {
    runScraperSubprocess().catch((error) => {
      console.error('Scraper error:', error)
      process.exit(1)
    })
  }
}
