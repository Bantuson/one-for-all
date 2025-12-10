/**
 * HTML Parser for Academic Content Extraction
 *
 * Extracts structured data from university website HTML
 */

import type {
  ScrapedPage,
  PageType,
  PageMetadata,
  ExtractedLink,
  Campus,
  Faculty,
  Course,
  Requirements,
} from './types'
import {
  extractTextContent,
  extractLinks,
  inferPageType,
  generateId,
  generateCode,
  calculateConfidence,
  cleanText,
} from './utils'

// ============================================================================
// Page Parsing
// ============================================================================

/**
 * Parse a raw HTML page into structured data
 */
export function parsePage(
  url: string,
  html: string,
  baseUrl: string
): ScrapedPage {
  const title = extractTitle(html)
  const metadata = extractMetadata(html)
  const breadcrumbs = extractBreadcrumbs(html)
  const pageType = inferPageType(url, title, breadcrumbs)
  const links = extractLinks(html, baseUrl)
  const text = extractTextContent(html)

  return {
    url,
    title,
    pageType,
    html,
    text,
    links,
    metadata: {
      ...metadata,
      breadcrumbs,
    },
    scrapedAt: new Date().toISOString(),
  }
}

/**
 * Extract the page title
 */
function extractTitle(html: string): string {
  // Try <title> tag first
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    return cleanText(titleMatch[1])
  }

  // Try h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    return cleanText(h1Match[1])
  }

  return ''
}

/**
 * Extract page metadata from meta tags
 */
function extractMetadata(html: string): Omit<PageMetadata, 'breadcrumbs'> {
  const metadata: Omit<PageMetadata, 'breadcrumbs'> = {}

  // Description
  const descMatch = html.match(
    /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i
  )
  if (descMatch && descMatch[1]) {
    metadata.description = cleanText(descMatch[1])
  }

  // Keywords
  const keywordsMatch = html.match(
    /<meta[^>]*name\s*=\s*["']keywords["'][^>]*content\s*=\s*["']([^"']+)["']/i
  )
  if (keywordsMatch && keywordsMatch[1]) {
    metadata.keywords = keywordsMatch[1].split(',').map((k) => k.trim())
  }

  // Open Graph
  const ogTitleMatch = html.match(
    /<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i
  )
  if (ogTitleMatch && ogTitleMatch[1]) {
    metadata.ogTitle = cleanText(ogTitleMatch[1])
  }

  const ogDescMatch = html.match(
    /<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i
  )
  if (ogDescMatch && ogDescMatch[1]) {
    metadata.ogDescription = cleanText(ogDescMatch[1])
  }

  return metadata
}

/**
 * Extract breadcrumb navigation
 */
function extractBreadcrumbs(html: string): string[] {
  const breadcrumbs: string[] = []

  // Look for common breadcrumb patterns
  const patterns = [
    // Schema.org BreadcrumbList
    /<[^>]+itemtype\s*=\s*["'][^"']*BreadcrumbList[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    // Common class names
    /<[^>]+class\s*=\s*["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<nav[^>]+aria-label\s*=\s*["']breadcrumb["'][^>]*>([\s\S]*?)<\/nav>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      // Extract text from links within the breadcrumb
      const linkPattern = /<a[^>]*>([^<]+)<\/a>/gi
      let linkMatch
      while ((linkMatch = linkPattern.exec(match[1])) !== null) {
        if (linkMatch[1]) {
          const text = cleanText(linkMatch[1])
          if (text && text.length < 100) {
            breadcrumbs.push(text)
          }
        }
      }

      if (breadcrumbs.length > 0) break
    }
  }

  return breadcrumbs
}

// ============================================================================
// Campus Extraction
// ============================================================================

/**
 * Extract campus information from a page
 */
export function extractCampusFromPage(page: ScrapedPage): Campus | null {
  if (page.pageType !== 'campus' && !page.url.toLowerCase().includes('campus')) {
    return null
  }

  const name = extractCampusName(page)
  if (!name) return null

  const location = extractLocation(page)
  const code = generateCode(name, 6)

  return {
    id: generateId('campus'),
    name,
    code,
    location: location ?? undefined,
    sourceUrl: page.url,
    confidence: calculateConfidence({
      hasTitle: !!name,
      hasDescription: !!location,
      hasCode: true,
      matchesPattern: page.pageType === 'campus',
      sourceReliability: 0.8,
    }),
    faculties: [],
  }
}

function extractCampusName(page: ScrapedPage): string | null {
  // Try title first
  if (page.title) {
    // Remove common suffixes
    const cleaned = page.title
      .replace(/\s*[-|]\s*.*$/i, '')
      .replace(/campus/i, '')
      .trim()

    if (cleaned.length > 2 && cleaned.length < 100) {
      return cleaned + ' Campus'
    }
  }

  // Try h1
  const h1Match = page.html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(h1Match[1])
    if (text.length > 2 && text.length < 100) {
      return text.includes('Campus') ? text : text + ' Campus'
    }
  }

  return null
}

function extractLocation(page: ScrapedPage): string | null {
  // Look for address patterns
  const addressPatterns = [
    // Street address pattern
    /(\d+\s+[\w\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr)[,.\s]+[\w\s]+)/i,
    // City, Province pattern
    /((?:Pretoria|Johannesburg|Cape Town|Durban|Bloemfontein|Port Elizabeth|Polokwane)[,\s]+(?:Gauteng|Western Cape|KwaZulu-Natal|Eastern Cape|Free State|Limpopo|Mpumalanga|North West|Northern Cape))/i,
  ]

  for (const pattern of addressPatterns) {
    const match = page.text.match(pattern)
    if (match && match[1]) {
      return cleanText(match[1])
    }
  }

  return null
}

// ============================================================================
// Faculty Extraction
// ============================================================================

/**
 * Extract faculty information from a page
 */
export function extractFacultyFromPage(page: ScrapedPage): Faculty | null {
  if (
    page.pageType !== 'faculty' &&
    page.pageType !== 'department' &&
    !page.url.toLowerCase().match(/facult|school|department/)
  ) {
    return null
  }

  const name = extractFacultyName(page)
  if (!name) return null

  const description = extractDescription(page)
  const code = generateCode(name, 6)

  return {
    id: generateId('faculty'),
    name,
    code,
    description: description ?? undefined,
    sourceUrl: page.url,
    confidence: calculateConfidence({
      hasTitle: !!name,
      hasDescription: !!description,
      hasCode: true,
      matchesPattern: page.pageType === 'faculty',
      sourceReliability: 0.8,
    }),
    courses: [],
  }
}

function extractFacultyName(page: ScrapedPage): string | null {
  // Try title first
  if (page.title) {
    const cleaned = page.title
      .replace(/\s*[-|]\s*.*$/i, '')
      .trim()

    // Check if it looks like a faculty name
    if (
      cleaned.length > 5 &&
      cleaned.length < 100 &&
      (cleaned.toLowerCase().includes('faculty') ||
        cleaned.toLowerCase().includes('school of') ||
        cleaned.toLowerCase().includes('department'))
    ) {
      return cleaned
    }
  }

  // Try h1
  const h1Match = page.html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(h1Match[1])
    if (text.length > 5 && text.length < 100) {
      // Ensure it sounds like a faculty
      if (!text.toLowerCase().includes('faculty')) {
        return 'Faculty of ' + text
      }
      return text
    }
  }

  return null
}

function extractDescription(page: ScrapedPage): string | null {
  // Try meta description
  if (page.metadata.description) {
    return page.metadata.description.slice(0, 500)
  }

  // Try first paragraph
  const pMatch = page.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  if (pMatch && pMatch[1]) {
    const text = extractTextContent(pMatch[1])
    if (text.length > 50 && text.length < 500) {
      return text
    }
  }

  return null
}

// ============================================================================
// Course Extraction
// ============================================================================

/**
 * Extract course information from a page
 */
export function extractCourseFromPage(page: ScrapedPage): Course | null {
  if (
    page.pageType !== 'course' &&
    page.pageType !== 'programme' &&
    !page.url.toLowerCase().match(/course|programme|program|qualification|degree/)
  ) {
    return null
  }

  const name = extractCourseName(page)
  if (!name) return null

  const code = extractCourseCode(page) || generateCode(name, 10)
  const description = extractDescription(page)
  const requirements = extractRequirements(page)
  const duration = extractDuration(page)

  return {
    id: generateId('course'),
    name,
    code,
    description: description ?? undefined,
    requirements: requirements ?? undefined,
    durationYears: duration ?? undefined,
    sourceUrl: page.url,
    confidence: calculateConfidence({
      hasTitle: !!name,
      hasDescription: !!description,
      hasCode: !!code,
      matchesPattern: page.pageType === 'course' || page.pageType === 'programme',
      sourceReliability: 0.8,
    }),
  }
}

function extractCourseName(page: ScrapedPage): string | null {
  // Try title first
  if (page.title) {
    const cleaned = page.title.replace(/\s*[-|]\s*.*$/i, '').trim()

    // Check if it looks like a course name
    if (cleaned.length > 5 && cleaned.length < 200) {
      // Common course prefixes
      const prefixes = [
        'Bachelor',
        'Master',
        'Doctor',
        'PhD',
        'Diploma',
        'Certificate',
        'Honours',
        'BSc',
        'BA',
        'BCom',
        'BEng',
        'LLB',
        'MB',
      ]

      if (prefixes.some((p) => cleaned.includes(p))) {
        return cleaned
      }
    }
  }

  // Try h1
  const h1Match = page.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(extractTextContent(h1Match[1]))
    if (text.length > 5 && text.length < 200) {
      return text
    }
  }

  return null
}

function extractCourseCode(page: ScrapedPage): string | null {
  // Look for course code patterns
  const patterns = [
    // Common formats: ABC123, ABCD1234, AB-123
    /\b([A-Z]{2,5}[-\s]?\d{3,4})\b/,
    // With explicit label
    /code[:\s]+([A-Z0-9-]+)/i,
    /qualification[:\s]+code[:\s]+([A-Z0-9-]+)/i,
  ]

  for (const pattern of patterns) {
    const match = page.text.match(pattern)
    if (match && match[1] && match[1].length <= 15) {
      return match[1].replace(/\s/g, '')
    }
  }

  return null
}

function extractRequirements(page: ScrapedPage): Requirements | null {
  const requirements: Requirements = {}
  let found = false

  // Look for APS score
  const apsMatch = page.text.match(
    /(?:APS|admission point[s]?|point score)[:\s]+(\d{1,2})/i
  )
  if (apsMatch && apsMatch[1]) {
    requirements.minimumAps = parseInt(apsMatch[1], 10)
    found = true
  }

  // Look for required subjects
  const subjectPatterns = [
    /(?:require|need|must have)[:\s]+([\w\s,]+(?:Mathematics|Physical Science|English|Afrikaans|Life Sciences|Accounting)[\w\s,]*)/i,
    /(?:Mathematics|Physical Science|English|Life Sciences|Accounting)\s*(?:at level)?\s*(\d)/gi,
  ]

  for (const pattern of subjectPatterns) {
    const match = page.text.match(pattern)
    if (match && match[1]) {
      requirements.requiredSubjects = match[1]
        .split(/[,;]/)
        .map((s) => cleanText(s))
        .filter((s) => s.length > 0)
      found = true
      break
    }
  }

  // Extract requirements section text
  const reqSectionMatch = page.html.match(
    /<(?:section|div)[^>]*class\s*=\s*["'][^"']*(?:requirement|admission|entry)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div)>/i
  )
  if (reqSectionMatch && reqSectionMatch[1]) {
    const text = extractTextContent(reqSectionMatch[1])
    if (text.length > 20 && text.length < 2000) {
      requirements.text = text
      found = true
    }
  }

  return found ? requirements : null
}

function extractDuration(page: ScrapedPage): number | null {
  // Look for duration patterns
  const patterns = [
    /(\d)\s*(?:-\s*\d\s*)?year[s]?\s*(?:duration|programme|degree)/i,
    /duration[:\s]+(\d)\s*year[s]?/i,
    /(\d)\s*year\s*(?:full[- ]time|part[- ]time)/i,
  ]

  for (const pattern of patterns) {
    const match = page.text.match(pattern)
    if (match && match[1]) {
      const years = parseInt(match[1], 10)
      if (years >= 1 && years <= 8) {
        return years
      }
    }
  }

  return null
}

// ============================================================================
// Batch Extraction
// ============================================================================

/**
 * Extract all relevant items from a collection of pages
 */
export function extractAllFromPages(pages: ScrapedPage[]): {
  campuses: Campus[]
  faculties: Faculty[]
  courses: Course[]
} {
  const campuses: Campus[] = []
  const faculties: Faculty[] = []
  const courses: Course[] = []

  for (const page of pages) {
    const campus = extractCampusFromPage(page)
    if (campus) campuses.push(campus)

    const faculty = extractFacultyFromPage(page)
    if (faculty) faculties.push(faculty)

    const course = extractCourseFromPage(page)
    if (course) courses.push(course)
  }

  return { campuses, faculties, courses }
}

/**
 * Find links that likely lead to academic content
 */
export function findAcademicLinks(page: ScrapedPage): ExtractedLink[] {
  return page.links.filter((link) => {
    if (!link.isInternal) return false

    const url = link.href.toLowerCase()
    const text = link.text.toLowerCase()

    // Academic URL patterns
    const urlPatterns = [
      'campus',
      'faculty',
      'school',
      'department',
      'course',
      'programme',
      'program',
      'qualification',
      'undergraduate',
      'postgraduate',
      'degree',
      'study',
    ]

    // Check URL
    if (urlPatterns.some((p) => url.includes(p))) {
      return true
    }

    // Check link text
    if (urlPatterns.some((p) => text.includes(p))) {
      return true
    }

    return false
  })
}
