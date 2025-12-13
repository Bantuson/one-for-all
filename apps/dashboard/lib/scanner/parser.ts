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
 * SA University Campus URL Patterns (URL-path based, NOT title-based)
 * Only match if the URL path explicitly indicates a campus page.
 */
const SA_CAMPUS_URL_PATTERNS = [
  // URL path patterns (must be in URL, not page title)
  '/campus/', '/campuses/',
  '/campus-', '-campus',
]

/**
 * Known SA campus names - must appear in URL path to qualify
 */
const SA_CAMPUS_NAMES = [
  // UKZN Campuses
  'edgewood', 'howard-college', 'medical-school', 'pietermaritzburg', 'westville',
  // TUT Campuses
  'arcadia', 'polokwane', 'emalahleni', 'ga-rankuwa', 'mbombela', 'soshanguve',
  // EDUVOS Campuses
  'midrand', 'mowbray', 'vanderbijlpark', 'nelspruit', 'bedfordview', 'potchefstroom',
  // UFS Campuses
  'qwaqwa', 'south-campus',
  // NWU Campuses
  'mafikeng', 'vaal-triangle',
  // UCT Campuses
  'upper-campus', 'middle-campus', 'lower-campus', 'hiddingh',
  // Stellenbosch Campuses
  'tygerberg', 'bellville-park', 'saldanha',
]

/**
 * Extract campus information from a page.
 *
 * IMPORTANT: Only extract if URL explicitly indicates a campus page.
 * Avoid matching "campus" in page titles (e.g., "University of Pretoria Campus").
 */
export function extractCampusFromPage(page: ScrapedPage): Campus | null {
  const urlLower = page.url.toLowerCase()
  const urlPath = new URL(page.url).pathname.toLowerCase()

  // STRICT: Only match campus pages by URL path, NOT by title/text content
  const isCampusPage =
    // Check explicit URL patterns
    SA_CAMPUS_URL_PATTERNS.some((p) => urlPath.includes(p)) ||
    // Check known campus names in URL path
    SA_CAMPUS_NAMES.some((name) => urlPath.includes(name))

  if (!isCampusPage) {
    return null
  }

  const name = extractCampusName(page, urlPath)
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
      matchesPattern: true,
      sourceReliability: 0.9,
    }),
    faculties: [],
  }
}

function extractCampusName(page: ScrapedPage, urlPath: string): string | null {
  // First, check if any known campus name is in the URL
  for (const campusName of SA_CAMPUS_NAMES) {
    if (urlPath.includes(campusName)) {
      // Convert URL-style name to proper case
      const properName = campusName
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return properName + ' Campus'
    }
  }

  // Try h1 if URL doesn't give us a name
  const h1Match = page.html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(h1Match[1])
    // Only use h1 if it's short and specific
    if (text.length > 2 && text.length < 50 && !text.toLowerCase().includes('university')) {
      return text.includes('Campus') ? text : text + ' Campus'
    }
  }

  // Extract from URL path segment
  const segments = urlPath.split('/').filter(Boolean)
  const campusSegment = segments.find((s) => s.includes('campus'))
  if (campusSegment) {
    const name = campusSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    return name.includes('Campus') ? name : name + ' Campus'
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
 * Invalid faculty name patterns - reject these
 */
const INVALID_FACULTY_NAMES = [
  'faculties', 'faculty of faculties', 'schools', 'departments',
  'colleges', 'home', 'index', 'overview', 'about', 'contact',
  'welcome', 'all faculties', 'our faculties',
]

/**
 * Known SA university faculties for validation
 */
const KNOWN_SA_FACULTIES = [
  // Common faculty disciplines
  'engineering', 'science', 'humanities', 'commerce', 'law', 'medicine',
  'health sciences', 'education', 'arts', 'natural sciences',
  'economic and management sciences', 'business', 'agriculture',
  'veterinary science', 'theology', 'dentistry', 'pharmacy',
  'information technology', 'computing', 'applied sciences',
  // EDUVOS faculties
  'applied science', 'humanities and arts', 'commerce and business',
]

/**
 * Extract faculty information from a page.
 *
 * Uses URL-based detection and validates extracted names against known patterns.
 */
export function extractFacultyFromPage(page: ScrapedPage): Faculty | null {
  const urlPath = new URL(page.url).pathname.toLowerCase()

  // Only match faculty/school/department pages by URL path
  const isFacultyPage =
    urlPath.includes('/facult') ||
    urlPath.includes('/school') ||
    urlPath.includes('/college') ||
    urlPath.includes('/department')

  if (!isFacultyPage) {
    return null
  }

  // Don't extract from listing pages - they list multiple faculties
  if (
    urlPath.endsWith('/faculties') ||
    urlPath.endsWith('/faculties/') ||
    urlPath.endsWith('/schools') ||
    urlPath.endsWith('/schools/') ||
    urlPath.match(/\/faculties?\/?$/) ||
    urlPath.match(/\/schools?\/?$/)
  ) {
    return null
  }

  const name = extractFacultyName(page, urlPath)
  if (!name) return null

  // Validate the name is not garbage
  if (INVALID_FACULTY_NAMES.includes(name.toLowerCase())) {
    return null
  }

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
      matchesPattern: true,
      sourceReliability: 0.85,
    }),
    courses: [],
  }
}

function extractFacultyName(page: ScrapedPage, urlPath: string): string | null {
  // 1. Try to extract from URL path (most reliable)
  const urlName = extractFacultyNameFromUrl(urlPath)
  if (urlName && isValidFacultyName(urlName)) {
    return urlName
  }

  // 2. Try h1 with validation
  const h1Match = page.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(extractTextContent(h1Match[1]))
    if (text.length > 5 && text.length < 100 && isValidFacultyName(text)) {
      return normalizeFacultyName(text)
    }
  }

  // 3. Try title with strict validation
  if (page.title) {
    const cleaned = page.title
      .replace(/\s*[-|]\s*.*$/i, '')
      .trim()

    if (cleaned.length > 5 && cleaned.length < 80 && isValidFacultyName(cleaned)) {
      return normalizeFacultyName(cleaned)
    }
  }

  return null
}

function extractFacultyNameFromUrl(urlPath: string): string | null {
  // Get the last meaningful segment
  const segments = urlPath.split('/').filter((s): s is string => Boolean(s))

  // Find the segment after 'faculty', 'faculties', 'school', etc.
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (seg && seg.match(/^facult|^school|^college|^department/)) {
      const nextSeg = segments[i + 1]
      if (nextSeg && nextSeg.length > 2 && !nextSeg.match(/^(home|index|about|contact)$/)) {
        return convertUrlToFacultyName(nextSeg)
      }
    }
  }

  // If no pattern found, check if last segment looks like a faculty
  const lastSeg = segments[segments.length - 1]
  if (lastSeg && lastSeg.length > 3) {
    const name = convertUrlToFacultyName(lastSeg)
    if (KNOWN_SA_FACULTIES.some((f) => name.toLowerCase().includes(f))) {
      return name
    }
  }

  return null
}

function convertUrlToFacultyName(urlSegment: string): string {
  // Convert URL segment to proper faculty name
  const name = urlSegment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

  // Add "Faculty of" prefix if not already present
  if (
    !name.toLowerCase().startsWith('faculty') &&
    !name.toLowerCase().startsWith('school') &&
    !name.toLowerCase().startsWith('college') &&
    !name.toLowerCase().startsWith('department')
  ) {
    return 'Faculty of ' + name
  }

  return name
}

function isValidFacultyName(name: string): boolean {
  const lower = name.toLowerCase()

  // Reject invalid names
  if (INVALID_FACULTY_NAMES.some((inv) => lower === inv || lower.includes(inv))) {
    return false
  }

  // Must contain a discipline keyword or be a known faculty
  const hasKnownDiscipline = KNOWN_SA_FACULTIES.some((f) => lower.includes(f))
  const hasStructuralWord = ['faculty', 'school', 'college', 'department'].some((w) =>
    lower.includes(w)
  )

  return hasKnownDiscipline || hasStructuralWord
}

function normalizeFacultyName(name: string): string {
  // Remove redundant words and clean up
  let normalized = name
    .replace(/\s+/g, ' ')
    .trim()

  // Ensure proper capitalization
  if (normalized.toLowerCase().startsWith('faculty of')) {
    normalized = 'Faculty of ' + normalized.slice(11).trim()
  } else if (normalized.toLowerCase().startsWith('school of')) {
    normalized = 'School of ' + normalized.slice(10).trim()
  } else if (normalized.toLowerCase().startsWith('college of')) {
    normalized = 'College of ' + normalized.slice(11).trim()
  }

  return normalized
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
 * Invalid course names - reject these generic terms
 */
const INVALID_COURSE_NAMES = [
  'undergraduate', 'postgraduate', 'programmes', 'courses', 'qualifications',
  'degrees', 'study', 'studies', 'academic', 'prospectus', 'home', 'index',
  'apply', 'application', 'admissions', 'registration', 'overview',
  'all programmes', 'all courses', 'all qualifications', 'our programmes',
]

/**
 * Course degree prefixes - used to validate actual course names
 */
const COURSE_DEGREE_PREFIXES = [
  // Full names
  'bachelor of', 'master of', 'doctor of', 'diploma in', 'certificate in',
  'honours in', 'postgraduate diploma', 'advanced diploma', 'higher certificate',
  // Abbreviations
  'bsc', 'ba', 'bcom', 'beng', 'llb', 'mb', 'bba', 'bed', 'btech', 'bpharm',
  'msc', 'ma', 'mcom', 'meng', 'llm', 'mba', 'med', 'mtech', 'mpharm',
  'phd', 'dphil', 'dcom', 'deng',
  // National Diploma/Certificate (SA specific)
  'nd', 'nc', 'national diploma', 'national certificate',
]

/**
 * Extract course information from a page.
 *
 * Uses URL-based detection and validates course names against degree patterns.
 */
export function extractCourseFromPage(page: ScrapedPage): Course | null {
  const urlPath = new URL(page.url).pathname.toLowerCase()

  // Only match course/programme pages by URL path
  const isCoursePage =
    urlPath.includes('/course') ||
    urlPath.includes('/programme') ||
    urlPath.includes('/program') ||
    urlPath.includes('/qualification') ||
    urlPath.includes('/degree')

  if (!isCoursePage) {
    return null
  }

  // Don't extract from listing pages
  if (
    urlPath.match(/\/programmes?\/?$/) ||
    urlPath.match(/\/courses?\/?$/) ||
    urlPath.match(/\/qualifications?\/?$/) ||
    urlPath.match(/\/degrees?\/?$/) ||
    urlPath.includes('/undergraduate/') && urlPath.endsWith('/') ||
    urlPath.includes('/postgraduate/') && urlPath.endsWith('/')
  ) {
    return null
  }

  const name = extractCourseName(page, urlPath)
  if (!name) return null

  // Validate it's not a generic term
  if (INVALID_COURSE_NAMES.some((inv) => name.toLowerCase() === inv)) {
    return null
  }

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
      matchesPattern: true,
      sourceReliability: 0.85,
    }),
  }
}

function extractCourseName(page: ScrapedPage, urlPath: string): string | null {
  // 1. Try h1 first (most reliable for course pages)
  const h1Match = page.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1Match && h1Match[1]) {
    const text = cleanText(extractTextContent(h1Match[1]))
    if (isValidCourseName(text)) {
      return normalizeCourseName(text)
    }
  }

  // 2. Try title with degree prefix validation
  if (page.title) {
    const cleaned = page.title.replace(/\s*[-|]\s*.*$/i, '').trim()
    if (isValidCourseName(cleaned)) {
      return normalizeCourseName(cleaned)
    }
  }

  // 3. Try to extract from URL path
  const urlName = extractCourseNameFromUrl(urlPath)
  if (urlName && urlName.length > 5) {
    return urlName
  }

  // 4. Look for degree patterns in page content
  const degreePattern = /(?:Bachelor|Master|Doctor|Diploma|Certificate|Honours|BSc|BA|BCom|BEng|BBA|BEd|BTech)\s+(?:of\s+)?[\w\s&,]+(?:Sciences?|Arts?|Engineering|Commerce|Business|Education|Law|Medicine|Technology|Management)?/gi
  const matches = page.text.match(degreePattern)
  if (matches && matches.length > 0) {
    // Take the first match that's a reasonable length
    for (const match of matches) {
      const cleaned = cleanText(match)
      if (cleaned.length > 10 && cleaned.length < 150) {
        return normalizeCourseName(cleaned)
      }
    }
  }

  return null
}

function extractCourseNameFromUrl(urlPath: string): string | null {
  const segments = urlPath.split('/').filter((s): s is string => Boolean(s))

  // Look for a meaningful segment after programme/course/qualification
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (seg && seg.match(/^(programme|course|qualification|degree)/)) {
      const nextSeg = segments[i + 1]
      if (nextSeg && nextSeg.length > 5 && !nextSeg.match(/^(home|index|about|overview)$/)) {
        const name = nextSeg
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim()
        // Only return if it doesn't look like a generic term
        if (!INVALID_COURSE_NAMES.includes(name.toLowerCase())) {
          return name
        }
      }
    }
  }

  return null
}

function isValidCourseName(name: string): boolean {
  const lower = name.toLowerCase()

  // Reject invalid/generic names
  if (INVALID_COURSE_NAMES.some((inv) => lower === inv || lower.startsWith(inv + ' '))) {
    return false
  }

  // Must be reasonable length
  if (name.length < 8 || name.length > 150) {
    return false
  }

  // Should contain a degree prefix/pattern
  const hasDegreePrefix = COURSE_DEGREE_PREFIXES.some((p) => lower.includes(p))

  // Or should look like a specific discipline
  const disciplines = [
    'science', 'engineering', 'commerce', 'business', 'law', 'medicine',
    'education', 'arts', 'humanities', 'technology', 'computing', 'accounting',
    'management', 'nursing', 'pharmacy', 'architecture', 'economics',
  ]
  const hasDiscipline = disciplines.some((d) => lower.includes(d))

  return hasDegreePrefix || hasDiscipline
}

function normalizeCourseName(name: string): string {
  // Clean up whitespace
  let normalized = name.replace(/\s+/g, ' ').trim()

  // Capitalize degree abbreviations
  const abbreviations = ['BSc', 'BA', 'BCom', 'BEng', 'LLB', 'MB', 'BBA', 'BEd', 'BTech', 'MSc', 'MA', 'MCom', 'MBA', 'PhD']
  for (const abbr of abbreviations) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    normalized = normalized.replace(regex, abbr)
  }

  return normalized
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
 * Extract all relevant items from a collection of pages.
 *
 * Strategy:
 * 1. First, find listing pages (/faculties, /programmes, etc.)
 * 2. Extract entities from links on listing pages
 * 3. Then supplement with individual page extraction
 */
export function extractAllFromPages(pages: ScrapedPage[]): {
  campuses: Campus[]
  faculties: Faculty[]
  courses: Course[]
} {
  const campusesMap = new Map<string, Campus>()
  const facultiesMap = new Map<string, Faculty>()
  const coursesMap = new Map<string, Course>()

  // Phase 1: Extract from listing pages (most reliable)
  for (const page of pages) {
    const urlPath = new URL(page.url).pathname.toLowerCase()

    // Faculty listing pages
    if (
      urlPath.match(/\/faculties?\/?$/) ||
      urlPath.match(/\/schools?\/?$/) ||
      urlPath.match(/\/colleges?\/?$/)
    ) {
      const facultiesFromListing = extractFacultiesFromListingPage(page)
      for (const faculty of facultiesFromListing) {
        if (!facultiesMap.has(faculty.name.toLowerCase())) {
          facultiesMap.set(faculty.name.toLowerCase(), faculty)
        }
      }
    }

    // Course/Programme listing pages
    if (
      urlPath.match(/\/programmes?\/?$/) ||
      urlPath.match(/\/courses?\/?$/) ||
      urlPath.match(/\/qualifications?\/?$/) ||
      urlPath.includes('/undergraduate') ||
      urlPath.includes('/postgraduate')
    ) {
      const coursesFromListing = extractCoursesFromListingPage(page)
      for (const course of coursesFromListing) {
        if (!coursesMap.has(course.name.toLowerCase())) {
          coursesMap.set(course.name.toLowerCase(), course)
        }
      }
    }

    // Campus listing pages
    if (urlPath.match(/\/campuses?\/?$/)) {
      const campusesFromListing = extractCampusesFromListingPage(page)
      for (const campus of campusesFromListing) {
        if (!campusesMap.has(campus.name.toLowerCase())) {
          campusesMap.set(campus.name.toLowerCase(), campus)
        }
      }
    }
  }

  // Phase 2: Extract from individual pages (supplement)
  for (const page of pages) {
    const campus = extractCampusFromPage(page)
    if (campus && !campusesMap.has(campus.name.toLowerCase())) {
      campusesMap.set(campus.name.toLowerCase(), campus)
    }

    const faculty = extractFacultyFromPage(page)
    if (faculty && !facultiesMap.has(faculty.name.toLowerCase())) {
      facultiesMap.set(faculty.name.toLowerCase(), faculty)
    }

    const course = extractCourseFromPage(page)
    if (course && !coursesMap.has(course.name.toLowerCase())) {
      coursesMap.set(course.name.toLowerCase(), course)
    }
  }

  return {
    campuses: Array.from(campusesMap.values()),
    faculties: Array.from(facultiesMap.values()),
    courses: Array.from(coursesMap.values()),
  }
}

/**
 * Extract faculties from a listing page (e.g., /faculties)
 */
function extractFacultiesFromListingPage(page: ScrapedPage): Faculty[] {
  const faculties: Faculty[] = []
  const seen = new Set<string>()

  // Look for links that point to faculty pages
  for (const link of page.links) {
    const linkUrl = link.href.toLowerCase()
    const linkText = link.text.trim()

    // Check if link points to a faculty page
    if (
      linkUrl.includes('/facult') ||
      linkUrl.includes('/school') ||
      linkUrl.includes('/college')
    ) {
      // Validate the link text looks like a faculty name
      if (linkText.length > 5 && linkText.length < 100 && isValidFacultyName(linkText)) {
        const normalizedName = normalizeFacultyName(linkText)
        const key = normalizedName.toLowerCase()

        if (!seen.has(key)) {
          seen.add(key)
          faculties.push({
            id: generateId('faculty'),
            name: normalizedName,
            code: generateCode(normalizedName, 6),
            sourceUrl: link.href,
            confidence: 0.9,
            courses: [],
          })
        }
      }
    }
  }

  // Also look for faculty names in headings/lists on the page
  const facultyPatterns = [
    /Faculty of ([\w\s&]+)/gi,
    /School of ([\w\s&]+)/gi,
    /College of ([\w\s&]+)/gi,
  ]

  for (const pattern of facultyPatterns) {
    const matches = page.text.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[1].length > 3 && match[1].length < 60) {
        const name = pattern.source.includes('Faculty')
          ? 'Faculty of ' + match[1].trim()
          : pattern.source.includes('School')
            ? 'School of ' + match[1].trim()
            : 'College of ' + match[1].trim()
        const key = name.toLowerCase()

        if (!seen.has(key) && !INVALID_FACULTY_NAMES.includes(key)) {
          seen.add(key)
          faculties.push({
            id: generateId('faculty'),
            name,
            code: generateCode(name, 6),
            sourceUrl: page.url,
            confidence: 0.8,
            courses: [],
          })
        }
      }
    }
  }

  return faculties
}

/**
 * Extract courses from a listing page (e.g., /programmes)
 */
function extractCoursesFromListingPage(page: ScrapedPage): Course[] {
  const courses: Course[] = []
  const seen = new Set<string>()

  // Look for links that point to course/programme pages
  for (const link of page.links) {
    const linkUrl = link.href.toLowerCase()
    const linkText = link.text.trim()

    // Check if link points to a course page
    if (
      linkUrl.includes('/course') ||
      linkUrl.includes('/programme') ||
      linkUrl.includes('/qualification') ||
      linkUrl.includes('/degree')
    ) {
      // Validate the link text looks like a course name
      if (linkText.length > 8 && linkText.length < 150 && isValidCourseName(linkText)) {
        const normalizedName = normalizeCourseName(linkText)
        const key = normalizedName.toLowerCase()

        if (!seen.has(key)) {
          seen.add(key)
          courses.push({
            id: generateId('course'),
            name: normalizedName,
            code: generateCode(normalizedName, 10),
            sourceUrl: link.href,
            confidence: 0.85,
          })
        }
      }
    }
  }

  // Also look for degree names in the page content
  const degreePattern = /(?:Bachelor|Master|Doctor|Diploma|Certificate|Honours|BSc|BA|BCom|BEng|BBA|BTech)\s+(?:of\s+|in\s+)?[\w\s&,]+/gi
  const matches = page.text.matchAll(degreePattern)

  for (const match of matches) {
    const name = cleanText(match[0])
    if (name.length > 10 && name.length < 150 && isValidCourseName(name)) {
      const normalizedName = normalizeCourseName(name)
      const key = normalizedName.toLowerCase()

      if (!seen.has(key)) {
        seen.add(key)
        courses.push({
          id: generateId('course'),
          name: normalizedName,
          code: generateCode(normalizedName, 10),
          sourceUrl: page.url,
          confidence: 0.7,
        })
      }
    }
  }

  return courses
}

/**
 * Extract campuses from a listing page (e.g., /campuses)
 */
function extractCampusesFromListingPage(page: ScrapedPage): Campus[] {
  const campuses: Campus[] = []
  const seen = new Set<string>()

  // Look for links that point to campus pages
  for (const link of page.links) {
    const linkUrl = link.href.toLowerCase()
    const linkText = link.text.trim()

    // Check if link points to a campus page
    if (linkUrl.includes('/campus') || SA_CAMPUS_NAMES.some((c) => linkUrl.includes(c))) {
      // Validate the link text looks like a campus name
      if (linkText.length > 3 && linkText.length < 50) {
        const name = linkText.includes('Campus') ? linkText : linkText + ' Campus'
        const key = name.toLowerCase()

        if (!seen.has(key)) {
          seen.add(key)
          campuses.push({
            id: generateId('campus'),
            name,
            code: generateCode(name, 6),
            sourceUrl: link.href,
            confidence: 0.9,
            faculties: [],
          })
        }
      }
    }
  }

  return campuses
}

/**
 * Find ALL internal links from a page (for broader crawling)
 */
export function findAllInternalLinks(page: ScrapedPage): ExtractedLink[] {
  return page.links.filter((link) => {
    if (!link.isInternal) return false

    // Skip common non-content links
    const url = link.href.toLowerCase()
    const skipPatterns = [
      // Auth & User
      '/login', '/logout', '/register', '/signin', '/signup',
      '/cart', '/checkout', '/search', '/profile', '/account',

      // Non-academic content
      '/staff/', '/news/', '/events/', '/media/', '/blog/',
      '/yearbook', '/alumni', '/about/', '/press/', '/social/',
      '/athletics', '/sports/', '/library/', '/research/',
      '/vacancies', '/careers', '/jobs/', '/contact/',
      '/gallery/', '/photos/', '/videos/', '/podcast/',
      '/donate/', '/giving/', '/support-us/', '/foundation/',
      '/governance/', '/council/', '/senate/', '/policies/',
      '/student-life/', '/residence/', '/accommodation/',
      '/parking/', '/shuttle/', '/transport/', '/map/',
      '/calendar/', '/notices/', '/tender/', '/procurement/',

      // File types
      '.pdf', '.doc', '.docx', '.zip', '.jpg', '.png', '.gif',
      '.xls', '.xlsx', '.ppt', '.pptx',

      // Non-HTTP
      'javascript:', 'mailto:', 'tel:', '#',
    ]

    return !skipPatterns.some((p) => url.includes(p))
  })
}

/**
 * Find links that likely lead to academic content.
 * Includes comprehensive patterns for all 14 SA public universities + EDUVOS.
 */
export function findAcademicLinks(page: ScrapedPage): ExtractedLink[] {
  return page.links.filter((link) => {
    if (!link.isInternal) return false

    const url = link.href.toLowerCase()
    const text = link.text.toLowerCase()

    // Comprehensive academic URL patterns for SA universities
    const urlPatterns = [
      // Common patterns (all universities)
      'campus', 'campuses',
      'faculty', 'faculties',
      'school', 'schools',
      'department', 'departments',
      'course', 'courses',
      'programme', 'programmes', 'program', 'programs',
      'qualification', 'qualifications',
      'undergraduate', 'postgraduate',
      'degree', 'degrees',
      'study', 'academics', 'academic',
      'admission', 'admissions', 'apply',
      'prospectus', 'handbook',
      'college', 'colleges',

      // UP (up.ac.za)
      'schools-and-departments', 'postgraduate-studies',

      // UCT (uct.ac.za)
      'postgraduate-hub', 'courses-faculty',

      // Wits (wits.ac.za)
      'faculties-and-schools', 'academic-programmes',

      // UKZN (ukzn.ac.za)
      'our-colleges', 'organisational-structure',

      // Stellenbosch (sun.ac.za)
      'facultiesanddepartments', 'pgstudies',

      // UJ (uj.ac.za)
      'courses-and-programmes', 'undergraduate-programmes', 'postgraduate-programmes',

      // UFS (ufs.ac.za)
      'departments-and-divisions',

      // NWU (nwu.ac.za)
      'our-faculties', 'fields-study', 'fields-of-study',

      // Rhodes (ru.ac.za)
      'admissiongateway', 'departmentsandfaculties', 'listofdepartments',
      'courseandcurriculum',

      // UNISA (unisa.ac.za)
      'all-qualifications', 'short-learning-programmes',

      // TUT (tut.ac.za)
      'i-want-to-study', 'online-programmes',

      // DUT (dut.ac.za)
      'degrees-offered',

      // CPUT (cput.ac.za)
      'academic/faculties', 'search/prospectus',

      // VUT (vut.ac.za)
      'faculty-of-',

      // EDUVOS (eduvos.com) - Private College
      'programmes/degree', 'applied-science', 'humanities-and-arts',
      'commerce-and-business', 'technology',
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
