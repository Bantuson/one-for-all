/**
 * Pagination Handlers for Web Scraping
 *
 * Handles various pagination mechanisms:
 * - Infinite scroll
 * - "Load More" buttons
 * - Numbered pagination links
 * - AJAX-based pagination
 *
 * Based on industry best practices from Firecrawl, Apify, and Chatbase.
 */

import type { Page } from 'playwright'

export type PaginationType =
  | 'infinite-scroll'
  | 'load-more-button'
  | 'numbered-links'
  | 'ajax-api'
  | 'none'

export interface PaginationInfo {
  type: PaginationType
  detected: boolean
  itemsLoaded?: number
  pagesLoaded?: number
}

/**
 * Detect pagination type on a page
 */
export async function detectPaginationType(page: Page): Promise<PaginationType> {
  // Check for "Load More" buttons
  const hasLoadMoreButton = await page.evaluate(() => {
    const selectors = [
      'button:has-text("Load More")',
      'button:has-text("Show More")',
      '.load-more',
      '[data-load-more]',
      'a:has-text("Load More")',
    ]

    return selectors.some(selector => {
      try {
        return !!document.querySelector(selector)
      } catch {
        return false
      }
    })
  })

  if (hasLoadMoreButton) {
    return 'load-more-button'
  }

  // Check for numbered pagination
  const hasNumberedPagination = await page.evaluate(() => {
    const selectors = [
      '.pagination',
      '[role="navigation"] a[href*="page="]',
      'a[rel="next"]',
      'nav a[href*="?page"]',
    ]

    return selectors.some(selector => {
      try {
        return !!document.querySelector(selector)
      } catch {
        return false
      }
    })
  })

  if (hasNumberedPagination) {
    return 'numbered-links'
  }

  // Check for infinite scroll indicators
  const hasInfiniteScroll = await page.evaluate(() => {
    const body = document.body
    const html = body.innerHTML.toLowerCase()

    return (
      html.includes('infinite-scroll') ||
      html.includes('data-scroll') ||
      html.includes('lazy-load') ||
      !!document.querySelector('[data-infinite-scroll]') ||
      !!document.querySelector('.infinite-scroll')
    )
  })

  if (hasInfiniteScroll) {
    return 'infinite-scroll'
  }

  return 'none'
}

/**
 * Handle infinite scroll by scrolling to bottom multiple times
 */
export async function handleInfiniteScroll(
  page: Page,
  maxScrolls = 10,
  waitMs = 2000
): Promise<PaginationInfo> {
  let scrollCount = 0
  let previousHeight = 0
  let noChangeCount = 0

  console.log('[Pagination] Starting infinite scroll simulation...')

  while (scrollCount < maxScrolls && noChangeCount < 3) {
    // Get current scroll height
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)

    // Check if content loaded
    if (currentHeight === previousHeight) {
      noChangeCount++
      console.log(`[Pagination] No new content (attempt ${noChangeCount}/3)`)
    } else {
      noChangeCount = 0
      console.log(`[Pagination] Scroll ${scrollCount + 1}: Height ${previousHeight} → ${currentHeight}`)
    }

    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    // Wait for content to load
    await page.waitForTimeout(waitMs)

    previousHeight = currentHeight
    scrollCount++
  }

  console.log(`[Pagination] Infinite scroll complete: ${scrollCount} scrolls`)

  return {
    type: 'infinite-scroll',
    detected: true,
    pagesLoaded: scrollCount,
  }
}

/**
 * Handle "Load More" buttons by clicking until exhausted
 */
export async function handleLoadMoreButtons(
  page: Page,
  maxClicks = 20,
  waitMs = 2000
): Promise<PaginationInfo> {
  let clickCount = 0
  let itemsBeforeClick = 0

  console.log('[Pagination] Looking for "Load More" buttons...')

  // Get initial item count (approximate)
  itemsBeforeClick = await page.evaluate(() => {
    const items = document.querySelectorAll('article, .card, .item, li, tr')
    return items.length
  })

  while (clickCount < maxClicks) {
    // Look for "Load More" button with multiple selectors
    const loadMoreButton = await page.$(
      'button:has-text("Load More"), ' +
      'button:has-text("Show More"), ' +
      'a:has-text("Load More"), ' +
      '.load-more, ' +
      '[data-load-more]'
    )

    if (!loadMoreButton) {
      console.log('[Pagination] No more "Load More" buttons found')
      break
    }

    // Check if button is visible and enabled
    const isVisible = await loadMoreButton.isVisible()
    const isDisabled = await loadMoreButton.evaluate((el) => {
      return (
        (el as HTMLButtonElement).disabled ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.classList.contains('disabled')
      )
    })

    if (!isVisible || isDisabled) {
      console.log('[Pagination] "Load More" button is disabled or hidden')
      break
    }

    // Click the button
    try {
      console.log(`[Pagination] Clicking "Load More" (${clickCount + 1}/${maxClicks})`)
      await loadMoreButton.click()

      // Wait for content to load
      await page.waitForTimeout(waitMs)

      clickCount++
    } catch (error) {
      console.log('[Pagination] Failed to click "Load More":', (error as Error).message)
      break
    }
  }

  // Get final item count
  const itemsAfterClick = await page.evaluate(() => {
    const items = document.querySelectorAll('article, .card, .item, li, tr')
    return items.length
  })

  const itemsLoaded = itemsAfterClick - itemsBeforeClick

  console.log(`[Pagination] "Load More" complete: ${clickCount} clicks, ${itemsLoaded} items loaded`)

  return {
    type: 'load-more-button',
    detected: true,
    pagesLoaded: clickCount,
    itemsLoaded,
  }
}

/**
 * Handle numbered pagination by following "Next" links
 */
export async function handleNumberedPagination(
  page: Page,
  maxPages = 10,
  waitMs = 2000
): Promise<PaginationInfo> {
  let currentPage = 1
  const visitedUrls = new Set<string>()

  console.log('[Pagination] Looking for numbered pagination...')

  // Record starting URL
  visitedUrls.add(page.url())

  while (currentPage < maxPages) {
    // Look for "Next" button
    const nextButton = await page.$(
      'a[rel="next"], ' +
      '.pagination .next, ' +
      '.pagination a:has-text("Next"), ' +
      '[aria-label*="Next page"], ' +
      'a:has-text("Next")'
    )

    if (!nextButton) {
      console.log('[Pagination] No "Next" link found')
      break
    }

    // Check if disabled
    const isDisabled = await nextButton.evaluate((el) => {
      return (
        el.classList.contains('disabled') ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.getAttribute('disabled') !== null
      )
    })

    if (isDisabled) {
      console.log('[Pagination] "Next" link is disabled')
      break
    }

    // Get the href to check if we've visited it
    const nextUrl = await nextButton.evaluate((el) => (el as HTMLAnchorElement).href)

    if (visitedUrls.has(nextUrl)) {
      console.log('[Pagination] Circular navigation detected, stopping')
      break
    }

    visitedUrls.add(nextUrl)

    try {
      console.log(`[Pagination] Following page ${currentPage + 1}...`)

      // Click and wait for navigation (use domcontentloaded to avoid timeout on slow sites)
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
        nextButton.click(),
      ])

      // Additional wait for content
      await page.waitForTimeout(waitMs)

      currentPage++
    } catch (error) {
      console.log('[Pagination] Navigation failed:', (error as Error).message)
      break
    }
  }

  console.log(`[Pagination] Numbered pagination complete: ${currentPage} pages`)

  return {
    type: 'numbered-links',
    detected: true,
    pagesLoaded: currentPage,
  }
}

/**
 * Smart pagination handler - tries multiple strategies
 */
export async function handlePagination(
  page: Page,
  url: string,
  options: {
    maxScrolls?: number
    maxClicks?: number
    maxPages?: number
    waitMs?: number
  } = {}
): Promise<PaginationInfo> {
  const {
    maxScrolls = 10,
    maxClicks = 20,
    maxPages = 10,
    waitMs = 2000,
  } = options

  // Only apply pagination to listing pages
  const isListingPage =
    url.includes('/programme') ||
    url.includes('/course') ||
    url.includes('/facult') ||
    url.includes('/undergraduate') ||
    url.includes('/postgraduate') ||
    url.includes('/catalog') ||
    url.includes('/search')

  if (!isListingPage) {
    console.log('[Pagination] Not a listing page, skipping pagination')
    return { type: 'none', detected: false }
  }

  console.log('[Pagination] Detected listing page, analyzing pagination...')

  // Detect pagination type
  const paginationType = await detectPaginationType(page)

  console.log(`[Pagination] Detected type: ${paginationType}`)

  // Handle based on detected type
  switch (paginationType) {
    case 'load-more-button':
      return await handleLoadMoreButtons(page, maxClicks, waitMs)

    case 'numbered-links':
      return await handleNumberedPagination(page, maxPages, waitMs)

    case 'infinite-scroll':
      return await handleInfiniteScroll(page, maxScrolls, waitMs)

    default:
      // Try scroll as fallback (might still load content)
      console.log('[Pagination] No specific pagination detected, trying scroll fallback...')
      const scrollResult = await handleInfiniteScroll(page, 5, waitMs)

      if (scrollResult.pagesLoaded && scrollResult.pagesLoaded > 1) {
        return scrollResult
      }

      return { type: 'none', detected: false }
  }
}
