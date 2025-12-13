/**
 * Structured HTML Content Extractor
 *
 * Uses Cheerio to extract main content from HTML pages while
 * preserving structure and filtering out nav/header/footer noise.
 */

import * as cheerio from 'cheerio'

export interface ExtractedContent {
  mainContent: string
  headings: string[]
  lists: { type: 'ul' | 'ol'; items: string[] }[]
  links: { text: string; href: string }[]
  tables: string[][]
  sections: { heading: string; content: string }[]
}

// Selectors for main content areas (priority order)
const MAIN_CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '#main-content',
  '#content',
  '.main-content',
  '.content-wrapper',
  '.article-content',
  '.page-content',
  '.node-content',
  '.field-content',
  '.body-content',
  '#body',
]

// Selectors for elements to remove before extraction
const EXCLUDE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'header',
  'footer',
  'nav',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '.sidebar',
  '.menu',
  '.nav',
  '.navigation',
  '.breadcrumb',
  '.breadcrumbs',
  '.social-links',
  '.footer-links',
  '.header-nav',
  '.cookie-notice',
  '.cookie-banner',
  '#skip-nav',
  '.skip-link',
  '.search-form',
  '.login-form',
  '.share-buttons',
  '.social-share',
  '.advertisement',
  '.ad-banner',
  '.popup',
  '.modal',
  '.newsletter-signup',
]

/**
 * Extract structured content from HTML
 *
 * @param html - Raw HTML string
 * @param baseUrl - Base URL for resolving relative links
 * @returns Structured content object
 */
export function extractStructuredContent(
  html: string,
  baseUrl: string
): ExtractedContent {
  const $ = cheerio.load(html)

  // Remove non-content elements
  $(EXCLUDE_SELECTORS.join(', ')).remove()

  // Find main content area
  let $main: cheerio.Cheerio<cheerio.Element> | null = null
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const found = $(selector)
    if (found.length > 0) {
      $main = found.first()
      break
    }
  }

  // Fallback to body if no main content area found
  if (!$main || $main.length === 0) {
    $main = $('body')
  }

  // Extract headings
  const headings: string[] = []
  $main.find('h1, h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text)
    }
  })

  // Extract lists
  const lists: { type: 'ul' | 'ol'; items: string[] }[] = []
  $main.find('ul, ol').each((_, el) => {
    const items: string[] = []
    $(el)
      .children('li')
      .each((_, li) => {
        const text = $(li).text().trim()
        if (text && text.length > 2 && text.length < 500) {
          items.push(text)
        }
      })
    if (items.length > 0) {
      lists.push({
        type: el.tagName.toLowerCase() as 'ul' | 'ol',
        items,
      })
    }
  })

  // Extract links with academic relevance
  const links: { text: string; href: string }[] = []
  $main.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()

    // Skip empty, anchor, or javascript links
    if (
      !text ||
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return
    }

    // Resolve relative URLs
    let fullUrl = href
    try {
      fullUrl = new URL(href, baseUrl).href
    } catch {
      // Invalid URL, skip
      return
    }

    // Only include if text is reasonable length
    if (text.length > 2 && text.length < 200) {
      links.push({ text, href: fullUrl })
    }
  })

  // Extract tables (useful for course listings)
  const tables: string[][] = []
  $main.find('table').each((_, table) => {
    const rows: string[] = []
    $(table)
      .find('tr')
      .each((_, tr) => {
        const cells: string[] = []
        $(tr)
          .find('td, th')
          .each((_, cell) => {
            cells.push($(cell).text().trim())
          })
        if (cells.length > 0) {
          rows.push(cells.join(' | '))
        }
      })
    if (rows.length > 0) {
      tables.push(rows)
    }
  })

  // Extract sections (heading + following content)
  const sections: { heading: string; content: string }[] = []
  $main.find('h2, h3').each((_, heading) => {
    const headingText = $(heading).text().trim()
    if (!headingText || headingText.length < 3) return

    // Get content until next heading
    let content = ''
    let next = $(heading).next()
    while (next.length > 0 && !next.is('h1, h2, h3')) {
      content += ' ' + next.text().trim()
      next = next.next()
    }

    content = content.trim()
    if (content.length > 10) {
      sections.push({
        heading: headingText,
        content: content.slice(0, 1000), // Limit content length
      })
    }
  })

  // Get main content text (cleaned)
  const mainContent = $main
    .text()
    .replace(/\s+/g, ' ')
    .trim()

  return {
    mainContent,
    headings,
    lists,
    links,
    tables,
    sections,
  }
}

/**
 * Extract only academic-relevant links from HTML
 *
 * @param html - Raw HTML string
 * @param baseUrl - Base URL for resolving relative links
 * @returns Array of academic links
 */
export function extractAcademicLinks(
  html: string,
  baseUrl: string
): { text: string; href: string; type: string }[] {
  const $ = cheerio.load(html)

  // Remove noise
  $(EXCLUDE_SELECTORS.join(', ')).remove()

  const academicKeywords = [
    'faculty',
    'faculties',
    'school',
    'schools',
    'college',
    'department',
    'programme',
    'program',
    'course',
    'qualification',
    'degree',
    'bachelor',
    'master',
    'doctorate',
    'phd',
    'diploma',
    'certificate',
    'undergraduate',
    'postgraduate',
    'campus',
    'academics',
    'study',
    'admission',
  ]

  const links: { text: string; href: string; type: string }[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim().toLowerCase()

    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return
    }

    // Check if link is academically relevant
    const hrefLower = href.toLowerCase()
    const isAcademic =
      academicKeywords.some((kw) => hrefLower.includes(kw)) ||
      academicKeywords.some((kw) => text.includes(kw))

    if (!isAcademic) return

    // Resolve URL
    let fullUrl: string
    try {
      fullUrl = new URL(href, baseUrl).href
    } catch {
      return
    }

    // Determine link type
    let type = 'other'
    if (hrefLower.includes('faculty') || hrefLower.includes('school')) {
      type = 'faculty'
    } else if (
      hrefLower.includes('programme') ||
      hrefLower.includes('course') ||
      hrefLower.includes('qualification')
    ) {
      type = 'programme'
    } else if (hrefLower.includes('campus')) {
      type = 'campus'
    }

    links.push({
      text: $(el).text().trim(),
      href: fullUrl,
      type,
    })
  })

  return links
}

/**
 * Extract page title from HTML
 */
export function extractPageTitle(html: string): string {
  const $ = cheerio.load(html)

  // Try meta og:title first
  const ogTitle = $('meta[property="og:title"]').attr('content')
  if (ogTitle) return ogTitle.trim()

  // Try title tag
  const title = $('title').text().trim()
  if (title) {
    // Remove common suffixes
    return title
      .replace(/\s*[-|]\s*University of.*/i, '')
      .replace(/\s*[-|]\s*[A-Z]{2,5}$/, '')
      .trim()
  }

  // Try h1
  const h1 = $('h1').first().text().trim()
  if (h1) return h1

  return ''
}

/**
 * Extract meta description from HTML
 */
export function extractMetaDescription(html: string): string {
  const $ = cheerio.load(html)

  const ogDesc = $('meta[property="og:description"]').attr('content')
  if (ogDesc) return ogDesc.trim()

  const metaDesc = $('meta[name="description"]').attr('content')
  if (metaDesc) return metaDesc.trim()

  return ''
}
