import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { spawn } from 'child_process'
import path from 'path'
import type { ScanEvent, ScanResults, ScrapedPage } from '@/lib/scanner/types'

/**
 * AI Website Scanner Streaming API
 *
 * Spawns a Bun subprocess to scrape the website, then sends scraped pages
 * to the CrewAI backend for analysis. Results are streamed via SSE.
 *
 * Flow:
 * 1. Validate request and authenticate user
 * 2. Spawn Bun scraper subprocess
 * 3. Read scraper output as NDJSON events
 * 4. Forward events to client via SSE
 * 5. When scraping completes, send pages to CrewAI for analysis
 * 6. Stream analysis results back to client
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Analyze scraped pages using local regex-based extraction with validation.
 *
 * Previously used CrewAI backend, but it was too slow (15-30 sec/page).
 * Now uses validated local extraction with SA university-specific patterns.
 */
async function analyzeWithRegex(
  institutionId: string,
  websiteUrl: string,
  pages: ScrapedPage[]
): Promise<ScanResults> {
  console.log('[Scanner] Using validated regex extraction')
  const { extractAllFromPages } = await import('@/lib/scanner/parser')
  const { validateFacultyName, validateCampusName, validateCourseName } = await import('@/lib/scanner/validator')
  const { getUniversityConfig } = await import('@/lib/scanner/university-configs')

  const config = getUniversityConfig(websiteUrl)
  const { campuses, faculties, courses } = extractAllFromPages(pages)

  // Validate extracted items
  const validatedFaculties = faculties.filter((f) => {
    const result = validateFacultyName(f.name, websiteUrl)
    if (!result.isValid || result.confidence < 0.5) {
      console.log(`[Regex] Rejected faculty: "${f.name}" - ${result.reason || 'low confidence'}`)
      return false
    }
    // Apply corrected name if available
    if (result.correctedValue) {
      f.name = result.correctedValue
    }
    f.confidence = result.confidence
    return true
  })

  const validatedCampuses = campuses.filter((c) => {
    const result = validateCampusName(c.name, websiteUrl)
    if (!result.isValid || result.confidence < 0.5) {
      console.log(`[Regex] Rejected campus: "${c.name}" - ${result.reason || 'low confidence'}`)
      return false
    }
    if (result.correctedValue) {
      c.name = result.correctedValue
    }
    c.confidence = result.confidence
    return true
  })

  const validatedCourses = courses.filter((c) => {
    const result = validateCourseName(c.name)
    if (!result.isValid || result.confidence < 0.5) {
      console.log(`[Regex] Rejected course: "${c.name}" - ${result.reason || 'low confidence'}`)
      return false
    }
    c.confidence = result.confidence
    return true
  })

  console.log(`[Regex] Validated: ${validatedFaculties.length} faculties, ${validatedCampuses.length} campuses, ${validatedCourses.length} courses`)

  // Try to associate faculties with campuses
  const mainCampusFromConfig = config?.campuses.find((c) => c.isMain)
  const mainCampus = validatedCampuses[0] || {
    id: `campus_${Date.now()}`,
    name: mainCampusFromConfig?.name || (config ? `${config.shortName} Main Campus` : 'Main Campus'),
    code: 'MAIN',
    location: mainCampusFromConfig?.location,
    sourceUrl: pages[0]?.url || '',
    confidence: 0.5,
    faculties: [],
  }

  // Assign faculties to main campus if not already assigned
  const assignedFaculties = validatedFaculties.map((faculty) => ({
    ...faculty,
    courses: validatedCourses.filter((course) => {
      // Try to match courses to faculties by URL similarity or naming
      const facultyKeywords = faculty.name.toLowerCase().split(/\s+/)
      const courseKeywords = course.name.toLowerCase()
      return facultyKeywords.some((kw) => kw.length > 3 && courseKeywords.includes(kw))
    }),
  }))

  // Add remaining courses to a "General" faculty
  const assignedCourseIds = new Set(
    assignedFaculties.flatMap((f) => f.courses.map((c) => c.id))
  )
  const unassignedCourses = validatedCourses.filter((c) => !assignedCourseIds.has(c.id))

  if (unassignedCourses.length > 0) {
    assignedFaculties.push({
      id: `faculty_${Date.now()}_general`,
      name: 'Other Programmes',
      code: 'OTHER',
      description: 'Programmes not assigned to a specific faculty',
      sourceUrl: '',
      confidence: 0.4,
      courses: unassignedCourses,
    })
  }

  mainCampus.faculties = assignedFaculties

  // If we found multiple campuses, use them
  const finalCampuses =
    validatedCampuses.length > 0
      ? validatedCampuses.map((c, i) =>
          i === 0 ? { ...c, faculties: assignedFaculties } : c
        )
      : [mainCampus]

  return {
    institutionName: config?.name || 'Unknown Institution',
    institutionId,
    websiteUrl: pages[0]?.url || websiteUrl,
    scannedAt: new Date().toISOString(),
    totalPagesScraped: pages.length,
    totalTimeMs: 0,
    campuses: finalCampuses,
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { institution_id, website_url, config } = body

    if (!institution_id || !website_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: institution_id, website_url',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL format
    try {
      new URL(website_url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid website URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate job ID
    const jobId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: ScanEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        }

        // Send connected event
        sendEvent({
          type: 'connected',
          jobId,
          timestamp: Date.now(),
        })

        const scrapedPages: ScrapedPage[] = []

        try {
          // Determine the scraper path
          const scannerPath = path.join(
            process.cwd(),
            'lib',
            'scanner',
            'index.ts'
          )

          // Check if Bun is available, fall back to mock if not
          const hasBun = await checkBunAvailable()

          if (hasBun) {
            // Spawn Bun subprocess
            const scraperProcess = spawn('bun', [
              'run',
              scannerPath,
              website_url,
              JSON.stringify(config || {}),
            ])

            let buffer = ''

            // Process stdout
            scraperProcess.stdout.on('data', (data: Buffer) => {
              buffer += data.toString()
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.trim()) continue

                try {
                  const event = JSON.parse(line) as ScanEvent
                  sendEvent(event)

                  // Collect scraped pages for analysis
                  if (event.type === 'complete' && 'results' in event) {
                    const results = (event as any).results
                    if (results?.pages) {
                      scrapedPages.push(...results.pages)
                    }
                  }
                } catch {
                  // Not valid JSON, might be log output
                  console.log('[Scraper]', line)
                }
              }
            })

            // Process stderr
            scraperProcess.stderr.on('data', (data: Buffer) => {
              console.error('[Scraper Error]', data.toString())
            })

            // Wait for scraper to complete
            await new Promise<void>((resolve, reject) => {
              scraperProcess.on('close', (code) => {
                if (code === 0) {
                  resolve()
                } else {
                  reject(new Error(`Scraper exited with code ${code}`))
                }
              })

              scraperProcess.on('error', (err) => {
                reject(err)
              })
            })
          } else {
            // Fallback: Recursive fetch-based scraping (Chatbase-style)
            sendEvent({
              type: 'progress',
              stage: 'Scraping',
              percent: 20,
              message: 'Starting recursive crawl...',
              timestamp: Date.now(),
            })

            const { parsePage, findAcademicLinks } = await import('@/lib/scanner/parser')
            const { getUniversityConfig } = await import('@/lib/scanner/university-configs')

            // Get institution-specific scraping config or use conservative defaults
            const config = getUniversityConfig(website_url)
            const maxPages = config?.scrapingConfig.maxPages ?? 50
            const maxDepth = config?.scrapingConfig.maxDepth ?? 3

            console.log(`[Scraper] Config-based limits for ${config?.name ?? 'unknown institution'}: ${maxPages} pages, depth ${maxDepth}`)

            const visitedUrls = new Set<string>()
            const urlQueue: Array<{ url: string; depth: number }> = [{ url: website_url, depth: 0 }]

            while (urlQueue.length > 0 && scrapedPages.length < maxPages) {
              const item = urlQueue.shift()
              if (!item) break

              const { url: currentUrl, depth } = item

              // Skip if already visited
              if (visitedUrls.has(currentUrl)) continue
              visitedUrls.add(currentUrl)

              try {
                const response = await fetch(currentUrl, {
                  headers: {
                    'User-Agent': 'OneForAll-Scanner/1.0',
                    'Accept': 'text/html',
                  },
                  signal: AbortSignal.timeout(10000), // 10s per page
                })

                if (!response.ok) continue

                const contentType = response.headers.get('content-type') || ''
                if (!contentType.includes('text/html')) continue

                const html = await response.text()
                const page = parsePage(currentUrl, html, website_url)
                scrapedPages.push(page)

                sendEvent({
                  type: 'page_scraped',
                  url: currentUrl,
                  pageType: page.pageType,
                  contentLength: html.length,
                  timestamp: Date.now(),
                })

                // Discover new links if not at max depth
                if (depth < maxDepth) {
                  // Use academic links for ALL depths to filter out irrelevant pages
                  const linkLimit = depth === 0 ? 30 : 15  // More links from homepage
                  const links = findAcademicLinks(page).slice(0, linkLimit)

                  for (const link of links) {
                    const fullUrl = link.href.startsWith('http')
                      ? link.href
                      : new URL(link.href, website_url).href

                    // Only crawl same-domain URLs
                    if (fullUrl.startsWith(new URL(website_url).origin) && !visitedUrls.has(fullUrl)) {
                      urlQueue.push({ url: fullUrl, depth: depth + 1 })
                    }
                  }
                }

                // Update progress
                sendEvent({
                  type: 'progress',
                  stage: 'Scraping',
                  percent: 20 + Math.min((scrapedPages.length / maxPages) * 60, 60),
                  message: `Scraped ${scrapedPages.length} pages, ${urlQueue.length} in queue`,
                  timestamp: Date.now(),
                })

                // Small delay to be polite
                await new Promise(resolve => setTimeout(resolve, 500))
              } catch (error) {
                // Skip failed pages, continue crawling
                console.log(`[Scraper] Failed to fetch ${currentUrl}:`, error)
              }
            }

            sendEvent({
              type: 'progress',
              stage: 'Scraping',
              percent: 80,
              message: `Crawl complete: ${scrapedPages.length} pages`,
              timestamp: Date.now(),
            })
          }

          // Analysis phase
          sendEvent({
            type: 'analysis_start',
            totalPages: scrapedPages.length,
            timestamp: Date.now(),
          })

          const jobTimestamp = jobId.split('_')[1] ?? '0'
          const { isDeepSeekAvailable } = await import('@/lib/openai')

          // LLM-FIRST approach: Try DeepSeek first, fall back to validated regex
          if (isDeepSeekAvailable()) {
            sendEvent({
              type: 'progress',
              stage: 'Analyzing',
              percent: 80,
              message: 'AI is analyzing scraped content...',
              timestamp: Date.now(),
            })

            // Try LLM-first extraction
            const { extractWithLLM } = await import('@/lib/scanner/llm-extract')
            const llmResults = await extractWithLLM(scrapedPages, website_url)

            if (llmResults) {
              // LLM succeeded - validate and send results
              llmResults.totalTimeMs = Date.now() - parseInt(jobTimestamp, 10)
              llmResults.totalPagesScraped = scrapedPages.length
              llmResults.institutionId = institution_id

              // Validate against targets
              try {
                const { validateExtractionTargets } = await import('@/lib/scanner/validator')
                validateExtractionTargets(llmResults, website_url)

                sendEvent({
                  type: 'complete',
                  results: llmResults,
                  timestamp: Date.now(),
                })
              } catch (validationError) {
                sendEvent({
                  type: 'error',
                  message:
                    validationError instanceof Error
                      ? validationError.message
                      : 'Target validation failed',
                  recoverable: false,
                  timestamp: Date.now(),
                })
                return
              }
            } else {
              // LLM failed - fall back to validated regex
              console.log('[Scanner] LLM extraction failed, falling back to regex')
              sendEvent({
                type: 'progress',
                stage: 'Analyzing',
                percent: 85,
                message: 'Using pattern-based extraction...',
                timestamp: Date.now(),
              })

              const regexResults = await analyzeWithRegex(institution_id, website_url, scrapedPages)
              regexResults.totalTimeMs = Date.now() - parseInt(jobTimestamp, 10)

              // Validate against targets
              try {
                const { validateExtractionTargets } = await import('@/lib/scanner/validator')
                validateExtractionTargets(regexResults, website_url)

                sendEvent({
                  type: 'complete',
                  results: regexResults,
                  timestamp: Date.now(),
                })
              } catch (validationError) {
                sendEvent({
                  type: 'error',
                  message:
                    validationError instanceof Error
                      ? validationError.message
                      : 'Target validation failed',
                  recoverable: false,
                  timestamp: Date.now(),
                })
                return
              }
            }
          } else {
            // No DeepSeek - use validated regex extraction
            sendEvent({
              type: 'progress',
              stage: 'Analyzing',
              percent: 80,
              message: 'Analyzing content with pattern matching...',
              timestamp: Date.now(),
            })

            const regexResults = await analyzeWithRegex(institution_id, website_url, scrapedPages)
            regexResults.totalTimeMs = Date.now() - parseInt(jobTimestamp, 10)

            // Validate against targets
            try {
              const { validateExtractionTargets } = await import('@/lib/scanner/validator')
              validateExtractionTargets(regexResults, website_url)

              sendEvent({
                type: 'complete',
                results: regexResults,
                timestamp: Date.now(),
              })
            } catch (validationError) {
              sendEvent({
                type: 'error',
                message:
                  validationError instanceof Error
                    ? validationError.message
                    : 'Target validation failed',
                recoverable: false,
                timestamp: Date.now(),
              })
              return
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          sendEvent({
            type: 'error',
            message,
            recoverable: false,
            timestamp: Date.now(),
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI scan stream error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error during scan' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Check if Bun is available
async function checkBunAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['--version'])
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
    setTimeout(() => {
      proc.kill()
      resolve(false)
    }, 2000)
  })
}
