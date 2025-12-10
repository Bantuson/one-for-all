/**
 * Website Scraper
 *
 * Crawls university websites to extract academic content.
 * Designed to run as a Bun subprocess with streaming output.
 */

// Declare Bun types for runtime check
declare const Bun: { main: string } | undefined

import type {
  ScraperConfig,
  ScrapedPage,
  ScanEvent,
  PageType,
} from './types'
import { createScanEvent } from './types'
import {
  parseUrl,
  shouldScrapeUrl,
  RateLimiter,
  parseRobotsTxt,
  isPathAllowed,
  type RobotsTxtRules,
} from './utils'
import { parsePage, findAcademicLinks } from './parser'

// ============================================================================
// Scraper Class
// ============================================================================

export class WebsiteScraper {
  private config: ScraperConfig
  private baseUrl: string
  private rateLimiter: RateLimiter
  private robotsRules: RobotsTxtRules | null = null
  private visitedUrls = new Set<string>()
  private urlQueue: Array<{ url: string; depth: number }> = []
  private scrapedPages: ScrapedPage[] = []
  private startTime = 0
  private aborted = false

  constructor(
    baseUrl: string,
    config: Partial<ScraperConfig> = {}
  ) {
    // Import default config at runtime to avoid circular dependency
    this.config = {
      maxPages: config.maxPages ?? 100,
      maxDepth: config.maxDepth ?? 4,
      requestDelayMs: config.requestDelayMs ?? 1000,
      timeoutMs: config.timeoutMs ?? 30000,
      respectRobotsTxt: config.respectRobotsTxt ?? true,
      includePatterns: config.includePatterns ?? [
        '/campus',
        '/facult',
        '/school',
        '/department',
        '/course',
        '/programme',
        '/program',
        '/qualification',
        '/study',
        '/admission',
        '/undergraduate',
        '/postgraduate',
        '/degree',
      ],
      excludePatterns: config.excludePatterns ?? [
        '/staff/',
        '/news/',
        '/events/',
        '/blog/',
        '/media/',
        '/downloads/',
        '/pdf/',
        '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$',
        '/login',
        '/register',
        '/cart',
        '/checkout',
      ],
      userAgent:
        config.userAgent ??
        'OneForAll-Scanner/1.0 (+https://oneforall.co.za/scanner; educational-data-collection)',
      renderJs: config.renderJs ?? false, // Default to false for speed
    }

    const parsedUrl = parseUrl(baseUrl)
    if (!parsedUrl) {
      throw new Error(`Invalid base URL: ${baseUrl}`)
    }
    this.baseUrl = parsedUrl.origin
    this.rateLimiter = new RateLimiter(this.config.requestDelayMs)
  }

  /**
   * Emit an event to stdout (for subprocess communication)
   */
  private emit(event: ScanEvent): void {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(JSON.stringify(event) + '\n')
    }
  }

  /**
   * Emit progress update
   */
  private emitProgress(stage: string, percent: number, message: string): void {
    this.emit(
      createScanEvent({
        type: 'progress',
        stage,
        percent,
        message,
      })
    )
  }

  /**
   * Initialize the scraper (fetch robots.txt, etc.)
   */
  async initialize(): Promise<void> {
    this.startTime = Date.now()

    if (this.config.respectRobotsTxt) {
      this.emitProgress('Initializing', 5, 'Checking robots.txt...')
      this.robotsRules = await parseRobotsTxt(this.baseUrl)

      if (this.robotsRules?.crawlDelay) {
        // Respect crawl delay from robots.txt
        const newDelay = Math.max(
          this.config.requestDelayMs,
          this.robotsRules.crawlDelay
        )
        this.rateLimiter.setDelay(newDelay)
        this.emitProgress(
          'Initializing',
          10,
          `Respecting crawl delay: ${newDelay}ms`
        )
      }
    }

    // Add starting URL to queue
    this.urlQueue.push({ url: this.baseUrl, depth: 0 })

    this.emitProgress('Initializing', 15, 'Scanner ready')
  }

  /**
   * Check if a URL can be scraped
   */
  private canScrape(url: string): boolean {
    const urlInfo = parseUrl(url, this.baseUrl)
    if (!urlInfo || !urlInfo.isInternal) return false

    // Already visited
    if (this.visitedUrls.has(urlInfo.full)) return false

    // Check robots.txt
    if (this.robotsRules && !isPathAllowed(urlInfo.pathname, this.robotsRules)) {
      return false
    }

    // Check config patterns
    const { should } = shouldScrapeUrl(url, this.config)
    return should
  }

  /**
   * Fetch a single page
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      await this.rateLimiter.wait()

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs
      )

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        this.emit(
          createScanEvent({
            type: 'page_error',
            url,
            error: `HTTP ${response.status}`,
          })
        )
        return null
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        return null
      }

      return await response.text()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.emit(
        createScanEvent({
          type: 'page_error',
          url,
          error: message,
        })
      )
      return null
    }
  }

  /**
   * Scrape a single URL
   */
  private async scrapeUrl(
    url: string,
    depth: number
  ): Promise<ScrapedPage | null> {
    const html = await this.fetchPage(url)
    if (!html) return null

    const page = parsePage(url, html, this.baseUrl)

    // Emit scraped event
    this.emit(
      createScanEvent({
        type: 'page_scraped',
        url,
        pageType: page.pageType,
        contentLength: html.length,
      })
    )

    // Find and queue new links if not at max depth
    if (depth < this.config.maxDepth) {
      const academicLinks = findAcademicLinks(page)

      for (const link of academicLinks) {
        if (this.canScrape(link.href)) {
          this.urlQueue.push({ url: link.href, depth: depth + 1 })

          this.emit(
            createScanEvent({
              type: 'page_discovered',
              url: link.href,
              pageType: link.suggestedType,
              depth: depth + 1,
            })
          )
        }
      }
    }

    return page
  }

  /**
   * Run the scraper
   */
  async scrape(): Promise<ScrapedPage[]> {
    await this.initialize()

    this.emitProgress('Scraping', 20, 'Starting to crawl website...')

    while (
      this.urlQueue.length > 0 &&
      this.scrapedPages.length < this.config.maxPages &&
      !this.aborted
    ) {
      const { url, depth } = this.urlQueue.shift()!

      // Skip if already visited
      if (this.visitedUrls.has(url)) continue
      this.visitedUrls.add(url)

      const page = await this.scrapeUrl(url, depth)
      if (page) {
        this.scrapedPages.push(page)
      }

      // Update progress
      const progress = Math.min(
        20 + (this.scrapedPages.length / this.config.maxPages) * 60,
        80
      )
      this.emitProgress(
        'Scraping',
        progress,
        `Scraped ${this.scrapedPages.length} pages, ${this.urlQueue.length} in queue`
      )
    }

    const elapsed = Date.now() - this.startTime
    this.emitProgress(
      'Complete',
      100,
      `Scraping complete: ${this.scrapedPages.length} pages in ${elapsed}ms`
    )

    return this.scrapedPages
  }

  /**
   * Abort the scraping process
   */
  abort(): void {
    this.aborted = true
    this.emit(
      createScanEvent({
        type: 'cancelled',
        reason: 'User cancelled',
      })
    )
  }

  /**
   * Get scraped pages
   */
  getPages(): ScrapedPage[] {
    return this.scrapedPages
  }

  /**
   * Get elapsed time
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime
  }
}

// ============================================================================
// Subprocess Entry Point
// ============================================================================

/**
 * Run scraper as a standalone subprocess
 * Input: JSON config via stdin or command line args
 * Output: JSON events to stdout (one per line)
 */
export async function runScraperSubprocess(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2)

  if (args.length < 1 || !args[0]) {
    console.error('Usage: bun run scraper.ts <website_url> [config_json]')
    process.exit(1)
  }

  const websiteUrl = args[0]
  let config: Partial<ScraperConfig> = {}

  if (args[1]) {
    try {
      config = JSON.parse(args[1])
    } catch {
      console.error('Invalid config JSON')
      process.exit(1)
    }
  }

  try {
    const scraper = new WebsiteScraper(websiteUrl, config)

    // Handle abort signal
    process.on('SIGINT', () => scraper.abort())
    process.on('SIGTERM', () => scraper.abort())

    const pages = await scraper.scrape()

    // Output final results
    console.log(
      JSON.stringify({
        type: 'complete',
        timestamp: Date.now(),
        results: {
          pages,
          totalPages: pages.length,
          elapsedMs: scraper.getElapsedMs(),
        },
      })
    )
  } catch (error) {
    console.log(
      JSON.stringify({
        type: 'error',
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      })
    )
    process.exit(1)
  }
}

// Run if executed directly with Bun
if (typeof Bun !== 'undefined' && Bun?.main === (import.meta as { path?: string }).path) {
  runScraperSubprocess()
}
