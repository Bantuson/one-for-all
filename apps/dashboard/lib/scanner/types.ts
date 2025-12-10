/**
 * AI Website Scanner Types
 *
 * Shared types for the Bun scraper, API routes, and frontend components
 */

// ============================================================================
// Core Data Structures
// ============================================================================

export interface Address {
  street?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
}

export interface Requirements {
  minimumAps?: number
  requiredSubjects?: string[]
  minimumSubjectLevels?: Record<string, number>
  additionalRequirements?: string[]
  text?: string
}

export interface Course {
  id: string
  name: string
  code: string
  description?: string
  requirements?: Requirements
  durationYears?: number
  sourceUrl: string
  confidence: number // 0-1 AI confidence score
}

export interface Faculty {
  id: string
  name: string
  code: string
  description?: string
  sourceUrl: string
  confidence: number
  courses: Course[]
}

export interface Campus {
  id: string
  name: string
  code: string
  location?: string
  address?: Address
  sourceUrl: string
  confidence: number
  faculties: Faculty[]
}

export interface ScanResults {
  institutionId: string
  websiteUrl: string
  scannedAt: string
  totalPagesScraped: number
  totalTimeMs: number
  campuses: Campus[]
}

// ============================================================================
// Scan Job State
// ============================================================================

export type ScanStatus =
  | 'idle'
  | 'connecting'
  | 'scraping'
  | 'analyzing'
  | 'preview'
  | 'saving'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface ScanJob {
  id: string
  institutionId: string
  websiteUrl: string
  status: ScanStatus
  progress: ScanProgress
  rawResults?: ScanResults
  editedResults?: ScanResults
  createdAt: string
  completedAt?: string
  error?: string
}

export interface ScanProgress {
  stage: string
  percent: number
  message: string
  pagesDiscovered: number
  pagesScraped: number
  itemsExtracted: number
  currentUrl?: string
  elapsedMs: number
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type ScanEventType =
  | 'connected'
  | 'progress'
  | 'page_discovered'
  | 'page_scraped'
  | 'page_error'
  | 'analysis_start'
  | 'item_extracted'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface ScanEventBase {
  type: ScanEventType
  timestamp: number
}

export interface ConnectedEvent extends ScanEventBase {
  type: 'connected'
  jobId: string
}

export interface ProgressEvent extends ScanEventBase {
  type: 'progress'
  stage: string
  percent: number
  message: string
}

export interface PageDiscoveredEvent extends ScanEventBase {
  type: 'page_discovered'
  url: string
  pageType: PageType
  depth: number
}

export interface PageScrapedEvent extends ScanEventBase {
  type: 'page_scraped'
  url: string
  pageType: PageType
  contentLength: number
}

export interface PageErrorEvent extends ScanEventBase {
  type: 'page_error'
  url: string
  error: string
}

export interface AnalysisStartEvent extends ScanEventBase {
  type: 'analysis_start'
  totalPages: number
}

export interface ItemExtractedEvent extends ScanEventBase {
  type: 'item_extracted'
  itemType: 'campus' | 'faculty' | 'course'
  item: Campus | Faculty | Course
}

export interface CompleteEvent extends ScanEventBase {
  type: 'complete'
  results: ScanResults
}

export interface ErrorEvent extends ScanEventBase {
  type: 'error'
  message: string
  recoverable: boolean
  code?: string
}

export interface CancelledEvent extends ScanEventBase {
  type: 'cancelled'
  reason: string
}

export type ScanEvent =
  | ConnectedEvent
  | ProgressEvent
  | PageDiscoveredEvent
  | PageScrapedEvent
  | PageErrorEvent
  | AnalysisStartEvent
  | ItemExtractedEvent
  | CompleteEvent
  | ErrorEvent
  | CancelledEvent

// ============================================================================
// Scraper Configuration
// ============================================================================

export type PageType =
  | 'home'
  | 'about'
  | 'campus'
  | 'faculty'
  | 'department'
  | 'course'
  | 'programme'
  | 'admission'
  | 'contact'
  | 'unknown'

export interface ScraperConfig {
  /** Maximum number of pages to scrape */
  maxPages: number
  /** Maximum depth to crawl from the starting URL */
  maxDepth: number
  /** Delay between requests in milliseconds */
  requestDelayMs: number
  /** Request timeout in milliseconds */
  timeoutMs: number
  /** Whether to respect robots.txt */
  respectRobotsTxt: boolean
  /** URL patterns to include (regex strings) */
  includePatterns: string[]
  /** URL patterns to exclude (regex strings) */
  excludePatterns: string[]
  /** User agent string */
  userAgent: string
  /** Whether to render JavaScript (uses Playwright) */
  renderJs: boolean
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  maxPages: 100,
  maxDepth: 4,
  requestDelayMs: 1000,
  timeoutMs: 30000,
  respectRobotsTxt: true,
  includePatterns: [
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
  excludePatterns: [
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
    'OneForAll-Scanner/1.0 (+https://oneforall.co.za/scanner; educational-data-collection)',
  renderJs: true,
}

// ============================================================================
// Scraped Page Data
// ============================================================================

export interface ScrapedPage {
  url: string
  title: string
  pageType: PageType
  html: string
  text: string
  links: ExtractedLink[]
  metadata: PageMetadata
  scrapedAt: string
}

export interface ExtractedLink {
  href: string
  text: string
  title?: string
  isInternal: boolean
  suggestedType: PageType
}

export interface PageMetadata {
  description?: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  breadcrumbs?: string[]
}

// ============================================================================
// Analysis Request/Response (for CrewAI)
// ============================================================================

export interface AnalysisRequest {
  institutionId: string
  websiteUrl: string
  pages: ScrapedPage[]
}

export interface AnalysisResponse {
  success: boolean
  results?: ScanResults
  error?: string
  processingTimeMs: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface StartScanRequest {
  institutionId: string
  websiteUrl: string
  config?: Partial<ScraperConfig>
}

export interface StartScanResponse {
  jobId: string
  status: 'started' | 'error'
  error?: string
}

export interface RefineRequest {
  jobId: string
  action: 'rescan_section' | 'add_missing' | 'merge_duplicates'
  targetType: 'campus' | 'faculty' | 'course'
  targetId?: string
  targetUrl?: string
  instructions?: string
}

export interface RefineResponse {
  success: boolean
  updatedResults?: ScanResults
  error?: string
}

export interface AcceptScanRequest {
  institutionId: string
  campuses: Campus[]
}

// ============================================================================
// Utility Types
// ============================================================================

export interface UrlInfo {
  full: string
  origin: string
  pathname: string
  hostname: string
  isInternal: boolean
}

export function createEmptyProgress(): ScanProgress {
  return {
    stage: 'Initializing',
    percent: 0,
    message: 'Preparing scanner...',
    pagesDiscovered: 0,
    pagesScraped: 0,
    itemsExtracted: 0,
    elapsedMs: 0,
  }
}

// Helper type to create events without timestamp
type ScanEventPayload<T extends ScanEvent['type']> = Extract<ScanEvent, { type: T }> extends infer E
  ? E extends ScanEventBase
    ? Omit<E, 'timestamp'>
    : never
  : never

// Overloaded function for proper type inference
export function createScanEvent(event: Omit<ConnectedEvent, 'timestamp'>): ConnectedEvent
export function createScanEvent(event: Omit<ProgressEvent, 'timestamp'>): ProgressEvent
export function createScanEvent(event: Omit<PageDiscoveredEvent, 'timestamp'>): PageDiscoveredEvent
export function createScanEvent(event: Omit<PageScrapedEvent, 'timestamp'>): PageScrapedEvent
export function createScanEvent(event: Omit<PageErrorEvent, 'timestamp'>): PageErrorEvent
export function createScanEvent(event: Omit<AnalysisStartEvent, 'timestamp'>): AnalysisStartEvent
export function createScanEvent(event: Omit<ItemExtractedEvent, 'timestamp'>): ItemExtractedEvent
export function createScanEvent(event: Omit<CompleteEvent, 'timestamp'>): CompleteEvent
export function createScanEvent(event: Omit<ErrorEvent, 'timestamp'>): ErrorEvent
export function createScanEvent(event: Omit<CancelledEvent, 'timestamp'>): CancelledEvent
export function createScanEvent(event: Omit<ScanEvent, 'timestamp'>): ScanEvent {
  return {
    ...event,
    timestamp: Date.now(),
  } as ScanEvent
}
