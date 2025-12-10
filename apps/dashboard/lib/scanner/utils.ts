/**
 * Scanner Utility Functions
 *
 * URL handling, rate limiting, and helper functions
 */

import type {
  PageType,
  UrlInfo,
  ExtractedLink,
  ScraperConfig,
} from './types'

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Parse and normalize a URL
 */
export function parseUrl(url: string, baseUrl?: string): UrlInfo | null {
  try {
    const parsed = baseUrl ? new URL(url, baseUrl) : new URL(url)

    // Normalize the URL
    parsed.hash = '' // Remove fragment
    const normalized = parsed.href.replace(/\/+$/, '') // Remove trailing slashes

    return {
      full: normalized,
      origin: parsed.origin,
      pathname: parsed.pathname,
      hostname: parsed.hostname,
      isInternal: baseUrl
        ? parsed.hostname === new URL(baseUrl).hostname
        : true,
    }
  } catch {
    return null
  }
}

/**
 * Check if a URL should be scraped based on config patterns
 */
export function shouldScrapeUrl(
  url: string,
  config: ScraperConfig
): { should: boolean; reason: string } {
  const urlInfo = parseUrl(url)
  if (!urlInfo) {
    return { should: false, reason: 'Invalid URL' }
  }

  const pathname = urlInfo.pathname.toLowerCase()

  // Check exclude patterns first
  for (const pattern of config.excludePatterns) {
    try {
      if (new RegExp(pattern, 'i').test(pathname)) {
        return { should: false, reason: `Matches exclude pattern: ${pattern}` }
      }
    } catch {
      // Invalid regex, skip
    }
  }

  // Check if it matches any include pattern
  const matchesInclude = config.includePatterns.some((pattern) => {
    try {
      return new RegExp(pattern, 'i').test(pathname)
    } catch {
      return false
    }
  })

  // For the homepage and about pages, always include
  if (pathname === '/' || pathname === '' || pathname.includes('/about')) {
    return { should: true, reason: 'Base page' }
  }

  if (matchesInclude) {
    return { should: true, reason: 'Matches include pattern' }
  }

  return { should: false, reason: 'Does not match any include pattern' }
}

/**
 * Infer page type from URL and content hints
 */
export function inferPageType(
  url: string,
  title?: string,
  breadcrumbs?: string[]
): PageType {
  const pathname = url.toLowerCase()
  const titleLower = (title || '').toLowerCase()
  const crumbText = (breadcrumbs || []).join(' ').toLowerCase()
  const combined = `${pathname} ${titleLower} ${crumbText}`

  // Order matters - more specific patterns first
  const patterns: [RegExp, PageType][] = [
    [/\b(course|module|subject)\b.*\b(detail|info|overview)\b/, 'course'],
    [/\b(programme|program|qualification|degree)\b/, 'programme'],
    [/\bcourse[s]?\b/, 'course'],
    [/\b(department|dept)\b/, 'department'],
    [/\b(faculty|school)\b/, 'faculty'],
    [/\bcampus(es)?\b/, 'campus'],
    [/\b(admission|apply|entry|requirement)\b/, 'admission'],
    [/\babout\b/, 'about'],
    [/\bcontact\b/, 'contact'],
    [/^\/?$/, 'home'],
  ]

  for (const [pattern, type] of patterns) {
    if (pattern.test(combined)) {
      return type
    }
  }

  return 'unknown'
}

/**
 * Extract clean text from HTML
 */
export function extractTextContent(html: string): string {
  // Remove script and style tags with their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  text = decodeHtmlEntities(text)

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Decode common HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&ndash;': '-',
    '&mdash;': '-',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '*',
    '&hellip;': '...',
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  )
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  )

  return decoded
}

// ============================================================================
// Link Extraction
// ============================================================================

/**
 * Extract links from HTML content
 */
export function extractLinks(
  html: string,
  baseUrl: string
): ExtractedLink[] {
  const links: ExtractedLink[] = []
  const seen = new Set<string>()

  // Match anchor tags with href
  const linkPattern = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match

  while ((match = linkPattern.exec(html)) !== null) {
    const [, href, innerHtml] = match

    // Skip empty hrefs, javascript:, mailto:, tel:
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      continue
    }

    const urlInfo = parseUrl(href, baseUrl)
    if (!urlInfo) continue

    // Skip if already seen
    if (seen.has(urlInfo.full)) continue
    seen.add(urlInfo.full)

    // Extract title attribute if present
    const titleMatch = match[0].match(/title\s*=\s*["']([^"']+)["']/i)

    // Clean inner HTML to get link text
    const text = innerHtml ? extractTextContent(innerHtml).slice(0, 200) : ''

    links.push({
      href: urlInfo.full,
      text,
      title: titleMatch?.[1],
      isInternal: urlInfo.isInternal,
      suggestedType: inferPageType(urlInfo.full, text),
    })
  }

  return links
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private lastRequestTime = 0

  constructor(private delayMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    const remaining = this.delayMs - elapsed

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }

    this.lastRequestTime = Date.now()
  }

  setDelay(delayMs: number): void {
    this.delayMs = delayMs
  }
}

// ============================================================================
// Robots.txt Parser
// ============================================================================

export interface RobotsTxtRules {
  allowedPaths: string[]
  disallowedPaths: string[]
  crawlDelay?: number
  sitemaps: string[]
}

export async function parseRobotsTxt(
  baseUrl: string
): Promise<RobotsTxtRules | null> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'OneForAll-Scanner/1.0' },
    })

    if (!response.ok) {
      return null
    }

    const text = await response.text()
    return parseRobotsTxtContent(text)
  } catch {
    return null
  }
}

export function parseRobotsTxtContent(content: string): RobotsTxtRules {
  const rules: RobotsTxtRules = {
    allowedPaths: [],
    disallowedPaths: [],
    sitemaps: [],
  }

  let inRelevantUserAgent = false
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(':')
    const directive = parts[0]
    if (!directive) continue

    const valueParts = parts.slice(1)
    const value = valueParts.join(':').trim()

    const directiveLower = directive.toLowerCase()

    if (directiveLower === 'user-agent') {
      // Check if this applies to us (* or our bot name)
      inRelevantUserAgent = value === '*' || value.includes('OneForAll')
    } else if (inRelevantUserAgent) {
      if (directiveLower === 'allow') {
        rules.allowedPaths.push(value)
      } else if (directiveLower === 'disallow') {
        rules.disallowedPaths.push(value)
      } else if (directiveLower === 'crawl-delay') {
        const delay = parseInt(value, 10)
        if (!isNaN(delay)) {
          rules.crawlDelay = delay * 1000 // Convert to ms
        }
      }
    }

    // Sitemaps apply globally
    if (directiveLower === 'sitemap') {
      rules.sitemaps.push(value)
    }
  }

  return rules
}

/**
 * Check if a path is allowed by robots.txt rules
 */
export function isPathAllowed(
  pathname: string,
  rules: RobotsTxtRules
): boolean {
  // Check disallow first
  for (const pattern of rules.disallowedPaths) {
    if (pathname.startsWith(pattern)) {
      // Check if there's a more specific allow
      for (const allowPattern of rules.allowedPaths) {
        if (pathname.startsWith(allowPattern) && allowPattern.length > pattern.length) {
          return true
        }
      }
      return false
    }
  }

  return true
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique ID for extracted items
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

// ============================================================================
// Text Cleaning
// ============================================================================

/**
 * Clean and normalize extracted text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,;:!?'"()-]/g, '')
    .trim()
}

/**
 * Generate a code from a name
 */
export function generateCode(name: string, maxLength: number = 10): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, maxLength)
    .padEnd(3, 'X')
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Calculate confidence score based on various factors
 */
export function calculateConfidence(factors: {
  hasTitle: boolean
  hasDescription: boolean
  hasCode: boolean
  matchesPattern: boolean
  sourceReliability: number // 0-1
}): number {
  let score = 0.5 // Base score

  if (factors.hasTitle) score += 0.15
  if (factors.hasDescription) score += 0.1
  if (factors.hasCode) score += 0.1
  if (factors.matchesPattern) score += 0.1

  // Apply source reliability multiplier
  score *= 0.5 + factors.sourceReliability * 0.5

  return Math.min(1, Math.max(0, score))
}
