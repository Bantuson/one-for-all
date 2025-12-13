/**
 * Test Scan API Endpoint
 *
 * Returns mock scan results using HTML fixtures for testing
 * without needing a real institution website URL.
 *
 * Usage: POST /api/ai-scan/test
 * Body: { institution_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { ScanResults, Campus, Faculty, Course, ScrapedPage } from '@/lib/scanner/types'
import { parsePage, extractAllFromPages } from '@/lib/scanner/parser'

// Fixture file paths
const FIXTURES_DIR = path.join(process.cwd(), 'lib/scanner/__fixtures__')

const FIXTURE_FILES = [
  { file: 'sample-university-home.html', url: 'https://test-university.edu/' },
  { file: 'sample-campus-page.html', url: 'https://test-university.edu/campus/main-campus' },
  { file: 'sample-faculty-page.html', url: 'https://test-university.edu/faculty/engineering' },
  { file: 'sample-course-page.html', url: 'https://test-university.edu/course/beng-civil' },
]

/**
 * Load and parse fixture files
 */
async function loadFixtures(): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = []

  for (const fixture of FIXTURE_FILES) {
    try {
      const filePath = path.join(FIXTURES_DIR, fixture.file)
      const html = await fs.readFile(filePath, 'utf-8')
      const page = parsePage(fixture.url, html, 'https://test-university.edu')
      pages.push(page)
    } catch (error) {
      console.error(`Failed to load fixture: ${fixture.file}`, error)
    }
  }

  return pages
}

/**
 * Generate mock scan results from fixtures
 */
function generateMockResults(
  institutionId: string,
  pages: ScrapedPage[]
): ScanResults {
  const startTime = Date.now()

  // Extract data from parsed pages
  const { campuses: rawCampuses, faculties: rawFaculties, courses: rawCourses } =
    extractAllFromPages(pages)

  // Build hierarchical structure
  // If no campuses found, create a default one
  const campuses: Campus[] =
    rawCampuses.length > 0
      ? rawCampuses.map((campus) => ({
          ...campus,
          faculties: rawFaculties.map((faculty) => ({
            ...faculty,
            courses: rawCourses.filter(() => Math.random() > 0.5), // Randomly assign courses
          })),
        }))
      : [
          {
            id: 'campus_test_main',
            name: 'Main Campus',
            code: 'MAIN',
            location: 'Central City, Gauteng',
            sourceUrl: 'https://test-university.edu/campus/main-campus',
            confidence: 0.95,
            faculties:
              rawFaculties.length > 0
                ? rawFaculties.map((faculty) => ({
                    ...faculty,
                    courses: rawCourses,
                  }))
                : [
                    {
                      id: 'faculty_test_eng',
                      name: 'Faculty of Engineering and Technology',
                      code: 'FOEAT',
                      description:
                        'The Faculty of Engineering and Technology offers world-class engineering programs.',
                      sourceUrl: 'https://test-university.edu/faculty/engineering',
                      confidence: 0.92,
                      courses:
                        rawCourses.length > 0
                          ? rawCourses
                          : [
                              {
                                id: 'course_test_civil',
                                name: 'Bachelor of Engineering in Civil Engineering',
                                code: 'BENG-CIV',
                                description:
                                  'Prepares students for careers in construction and infrastructure development.',
                                requirements: {
                                  minimumAps: 34,
                                  requiredSubjects: [
                                    'Mathematics Level 6',
                                    'Physical Science Level 5',
                                    'English Level 4',
                                  ],
                                },
                                durationYears: 4,
                                sourceUrl:
                                  'https://test-university.edu/course/beng-civil',
                                confidence: 0.88,
                              },
                              {
                                id: 'course_test_elec',
                                name: 'BEng Electrical Engineering',
                                code: 'BENG-ELEC',
                                description:
                                  'Comprehensive electrical engineering programme.',
                                requirements: {
                                  minimumAps: 32,
                                  requiredSubjects: [
                                    'Mathematics Level 5',
                                    'Physical Science Level 5',
                                  ],
                                },
                                durationYears: 4,
                                sourceUrl:
                                  'https://test-university.edu/programme/beng-electrical',
                                confidence: 0.85,
                              },
                              {
                                id: 'course_test_cs',
                                name: 'BSc Computer Science',
                                code: 'BSC-CS',
                                description:
                                  'Three-year programme in computer science and software development.',
                                requirements: {
                                  minimumAps: 30,
                                  requiredSubjects: ['Mathematics Level 5'],
                                },
                                durationYears: 3,
                                sourceUrl:
                                  'https://test-university.edu/programme/bsc-computer-science',
                                confidence: 0.9,
                              },
                            ],
                    },
                    {
                      id: 'faculty_test_sci',
                      name: 'Faculty of Natural Sciences',
                      code: 'FONS',
                      description:
                        'Exploring the natural world through rigorous scientific inquiry.',
                      sourceUrl: 'https://test-university.edu/faculty/sciences',
                      confidence: 0.89,
                      courses: [
                        {
                          id: 'course_test_physics',
                          name: 'BSc Physics',
                          code: 'BSC-PHY',
                          description: 'Study the fundamental laws of the universe.',
                          requirements: {
                            minimumAps: 32,
                            requiredSubjects: [
                              'Mathematics Level 6',
                              'Physical Science Level 5',
                            ],
                          },
                          durationYears: 3,
                          sourceUrl:
                            'https://test-university.edu/course/bsc-physics',
                          confidence: 0.87,
                        },
                        {
                          id: 'course_test_chem',
                          name: 'BSc Chemistry',
                          code: 'BSC-CHEM',
                          description:
                            'Explore molecular science and chemical reactions.',
                          requirements: {
                            minimumAps: 30,
                            requiredSubjects: [
                              'Mathematics Level 5',
                              'Physical Science Level 5',
                            ],
                          },
                          durationYears: 3,
                          sourceUrl:
                            'https://test-university.edu/course/bsc-chemistry',
                          confidence: 0.86,
                        },
                      ],
                    },
                    {
                      id: 'faculty_test_hum',
                      name: 'Faculty of Humanities and Social Sciences',
                      code: 'FOHSS',
                      description:
                        'Understanding human culture, society, and expression.',
                      sourceUrl: 'https://test-university.edu/faculty/humanities',
                      confidence: 0.91,
                      courses: [
                        {
                          id: 'course_test_ba',
                          name: 'Bachelor of Arts',
                          code: 'BA',
                          description:
                            'Flexible arts degree with multiple majoring options.',
                          requirements: {
                            minimumAps: 26,
                            requiredSubjects: ['English Level 4'],
                          },
                          durationYears: 3,
                          sourceUrl:
                            'https://test-university.edu/course/bachelor-of-arts',
                          confidence: 0.93,
                        },
                        {
                          id: 'course_test_psych',
                          name: 'BA Psychology',
                          code: 'BA-PSY',
                          description:
                            'Study human behavior and mental processes.',
                          requirements: {
                            minimumAps: 28,
                            requiredSubjects: [
                              'English Level 4',
                              'Mathematics Level 3',
                            ],
                          },
                          durationYears: 3,
                          sourceUrl:
                            'https://test-university.edu/course/ba-psychology',
                          confidence: 0.88,
                        },
                      ],
                    },
                  ],
          },
        ]

  return {
    institutionId,
    websiteUrl: 'https://test-university.edu',
    scannedAt: new Date().toISOString(),
    totalPagesScraped: pages.length,
    totalTimeMs: Date.now() - startTime + 2500, // Simulate some processing time
    campuses,
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { institution_id } = body

    if (!institution_id) {
      return NextResponse.json(
        { error: 'Missing required field: institution_id' },
        { status: 400 }
      )
    }

    // Load and parse fixture files
    const pages = await loadFixtures()

    // Generate mock results
    const results = generateMockResults(institution_id, pages)

    // Return results (simulating a small delay for realism)
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      results,
      isTestMode: true,
      message: 'Test scan completed using fixture data',
    })
  } catch (error) {
    console.error('Test scan error:', error)
    return NextResponse.json(
      {
        error: 'Test scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for SSE streaming test mode
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const institutionId = searchParams.get('institution_id')

  if (!institutionId) {
    return NextResponse.json(
      { error: 'Missing institution_id query parameter' },
      { status: 400 }
    )
  }

  // Create SSE stream for test mode
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Send connected event
        sendEvent({
          type: 'connected',
          jobId: `test_${Date.now()}`,
          timestamp: Date.now(),
        })

        // Simulate progress
        sendEvent({
          type: 'progress',
          stage: 'Initializing',
          percent: 10,
          message: 'Loading test fixtures...',
          timestamp: Date.now(),
        })

        await new Promise((r) => setTimeout(r, 300))

        // Load fixtures
        const pages = await loadFixtures()

        sendEvent({
          type: 'progress',
          stage: 'Scraping',
          percent: 40,
          message: `Parsed ${pages.length} test pages`,
          timestamp: Date.now(),
        })

        await new Promise((r) => setTimeout(r, 500))

        // Send page events
        for (const page of pages) {
          sendEvent({
            type: 'page_scraped',
            url: page.url,
            pageType: page.pageType,
            contentLength: page.html.length,
            timestamp: Date.now(),
          })
          await new Promise((r) => setTimeout(r, 200))
        }

        sendEvent({
          type: 'progress',
          stage: 'Analyzing',
          percent: 70,
          message: 'Extracting academic data...',
          timestamp: Date.now(),
        })

        await new Promise((r) => setTimeout(r, 500))

        // Generate results
        const results = generateMockResults(institutionId, pages)

        sendEvent({
          type: 'progress',
          stage: 'Complete',
          percent: 100,
          message: 'Test scan complete',
          timestamp: Date.now(),
        })

        // Send complete event
        sendEvent({
          type: 'complete',
          results,
          timestamp: Date.now(),
        })
      } catch (error) {
        sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Test scan failed',
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
}
