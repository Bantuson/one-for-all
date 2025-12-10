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

// Mock analysis function - replace with actual CrewAI integration
async function analyzeWithCrewAI(
  institutionId: string,
  pages: ScrapedPage[]
): Promise<ScanResults> {
  // TODO: Integrate with Python CrewAI backend
  // For now, we'll do basic extraction from the scraped pages

  const { extractAllFromPages } = await import('@/lib/scanner/parser')
  const { campuses, faculties, courses } = extractAllFromPages(pages)

  // Try to associate faculties with campuses
  const mainCampus = campuses[0] || {
    id: `campus_${Date.now()}`,
    name: 'Main Campus',
    code: 'MAIN',
    location: undefined,
    sourceUrl: pages[0]?.url || '',
    confidence: 0.5,
    faculties: [],
  }

  // Assign faculties to main campus if not already assigned
  const assignedFaculties = faculties.map((faculty) => ({
    ...faculty,
    courses: courses.filter((course) => {
      // Try to match courses to faculties by URL similarity or naming
      const facultyKeywords = faculty.name.toLowerCase().split(/\s+/)
      const courseKeywords = course.name.toLowerCase()
      return facultyKeywords.some((kw) => courseKeywords.includes(kw))
    }),
  }))

  // Add remaining courses to a "General" faculty
  const assignedCourseIds = new Set(
    assignedFaculties.flatMap((f) => f.courses.map((c) => c.id))
  )
  const unassignedCourses = courses.filter((c) => !assignedCourseIds.has(c.id))

  if (unassignedCourses.length > 0) {
    assignedFaculties.push({
      id: `faculty_${Date.now()}_general`,
      name: 'General Programs',
      code: 'GEN',
      description: 'Programs not assigned to a specific faculty',
      sourceUrl: '',
      confidence: 0.3,
      courses: unassignedCourses,
    })
  }

  mainCampus.faculties = assignedFaculties

  // If we found multiple campuses, use them
  const finalCampuses =
    campuses.length > 0
      ? campuses.map((c, i) =>
          i === 0 ? { ...c, faculties: assignedFaculties } : c
        )
      : [mainCampus]

  return {
    institutionId,
    websiteUrl: pages[0]?.url || '',
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
            // Fallback: Use fetch-based scraping for demo
            sendEvent({
              type: 'progress',
              stage: 'Scraping',
              percent: 20,
              message: 'Using lightweight scraper (Bun not available)...',
              timestamp: Date.now(),
            })

            // Simple fetch-based scraping
            const response = await fetch(website_url, {
              headers: {
                'User-Agent': 'OneForAll-Scanner/1.0',
              },
            })

            if (response.ok) {
              const html = await response.text()
              const { parsePage } = await import('@/lib/scanner/parser')
              const page = parsePage(website_url, html, website_url)
              scrapedPages.push(page)

              sendEvent({
                type: 'page_scraped',
                url: website_url,
                pageType: page.pageType,
                contentLength: html.length,
                timestamp: Date.now(),
              })
            }
          }

          // Analysis phase
          sendEvent({
            type: 'analysis_start',
            totalPages: scrapedPages.length,
            timestamp: Date.now(),
          })

          sendEvent({
            type: 'progress',
            stage: 'Analyzing',
            percent: 80,
            message: 'Analyzing scraped content...',
            timestamp: Date.now(),
          })

          // Analyze with CrewAI (or mock)
          const results = await analyzeWithCrewAI(institution_id, scrapedPages)
          const jobTimestamp = jobId.split('_')[1] ?? '0'
          results.totalTimeMs = Date.now() - parseInt(jobTimestamp, 10)

          // Send complete event
          sendEvent({
            type: 'complete',
            results,
            timestamp: Date.now(),
          })
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
