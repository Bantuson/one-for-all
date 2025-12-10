import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { RefineRequest, RefineResponse, ScanResults, Campus, Faculty, Course } from '@/lib/scanner/types'

/**
 * AI Scan Refinement API Route
 *
 * Allows users to request targeted re-scans or modifications to scan results:
 * - Re-scan a specific section (campus, faculty, course)
 * - Add missing items by providing a URL
 * - Merge duplicate entries
 */

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RefineRequest = await req.json()
    const { jobId, action, targetType, targetId, targetUrl, instructions } = body

    if (!jobId || !action || !targetType) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, action, targetType' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['rescan_section', 'add_missing', 'merge_duplicates']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Process refinement based on action
    let result: RefineResponse

    switch (action) {
      case 'rescan_section':
        result = await handleRescanSection(targetType, targetId, targetUrl)
        break

      case 'add_missing':
        result = await handleAddMissing(targetType, targetUrl, instructions)
        break

      case 'merge_duplicates':
        result = await handleMergeDuplicates(targetType, targetId)
        break

      default:
        result = { success: false, error: 'Unknown action' }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Refine scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error during refinement' },
      { status: 500 }
    )
  }
}

/**
 * Re-scan a specific section by fetching the URL again
 */
async function handleRescanSection(
  targetType: string,
  targetId?: string,
  targetUrl?: string
): Promise<RefineResponse> {
  if (!targetUrl) {
    return {
      success: false,
      error: 'Target URL required for rescan',
    }
  }

  try {
    // Fetch the page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'OneForAll-Scanner/1.0',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: HTTP ${response.status}`,
      }
    }

    const html = await response.text()

    // Parse the page
    const { parsePage, extractCampusFromPage, extractFacultyFromPage, extractCourseFromPage } =
      await import('@/lib/scanner/parser')

    const page = parsePage(targetUrl, html, targetUrl)

    // Extract based on target type
    let extractedItem: Campus | Faculty | Course | null = null

    switch (targetType) {
      case 'campus':
        extractedItem = extractCampusFromPage(page)
        break
      case 'faculty':
        extractedItem = extractFacultyFromPage(page)
        break
      case 'course':
        extractedItem = extractCourseFromPage(page)
        break
    }

    if (!extractedItem) {
      return {
        success: false,
        error: `Could not extract ${targetType} data from the URL`,
      }
    }

    return {
      success: true,
      updatedResults: {
        institutionId: '',
        websiteUrl: targetUrl,
        scannedAt: new Date().toISOString(),
        totalPagesScraped: 1,
        totalTimeMs: 0,
        campuses:
          targetType === 'campus'
            ? [extractedItem as Campus]
            : [],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rescan failed',
    }
  }
}

/**
 * Add missing items by scanning a provided URL
 */
async function handleAddMissing(
  targetType: string,
  targetUrl?: string,
  instructions?: string
): Promise<RefineResponse> {
  if (!targetUrl) {
    return {
      success: false,
      error: 'URL required to add missing items',
    }
  }

  // Use the same logic as rescan but return as new items
  return handleRescanSection(targetType, undefined, targetUrl)
}

/**
 * Merge duplicate entries
 * TODO: Implement actual merging logic with AI assistance
 */
async function handleMergeDuplicates(
  targetType: string,
  targetId?: string
): Promise<RefineResponse> {
  // Placeholder - would need the full results context to merge
  return {
    success: false,
    error: 'Merge duplicates not yet implemented. Please edit items manually.',
  }
}
