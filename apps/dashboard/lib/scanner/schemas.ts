/**
 * Zod Schemas for AI Scanner Validation
 *
 * These schemas validate data at API boundaries and ensure consistency
 * between frontend and backend (Pydantic) schemas.
 */

import { z } from 'zod'

// ============================================================================
// Core Data Schemas
// ============================================================================

export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('South Africa'),
})

export const RequirementsSchema = z.object({
  minimumAps: z.number().int().min(0).max(50).optional(),
  requiredSubjects: z.array(z.string()).optional(),
  minimumSubjectLevels: z.record(z.string(), z.number()).optional(),
  additionalRequirements: z.array(z.string()).optional(),
  text: z.string().max(2000).optional(),
})

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(200),
  code: z.string().min(2).max(20).transform((v) => v.toUpperCase().replace(/ /g, '-')),
  description: z.string().max(1000).optional(),
  requirements: RequirementsSchema.optional(),
  durationYears: z.number().int().min(1).max(8).optional(),
  nqfLevel: z.number().int().min(1).max(10).optional(),
  sourceUrl: z.string().url(),
  confidence: z.number().min(0).max(1),
})

export const FacultySchema = z.object({
  id: z.string(),
  name: z.string().min(5).max(150),
  code: z.string().min(2).max(15).transform((v) => v.toUpperCase()),
  description: z.string().max(500).optional(),
  sourceUrl: z.string().url(),
  confidence: z.number().min(0).max(1),
  courses: z.array(CourseSchema).default([]),
})

export const CampusSchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
  code: z.string().min(2).max(10).transform((v) => v.toUpperCase()),
  location: z.string().max(200).optional(),
  address: AddressSchema.optional(),
  sourceUrl: z.string().url(),
  confidence: z.number().min(0).max(1),
  faculties: z.array(FacultySchema).default([]),
})

export const ScanResultsSchema = z.object({
  institutionId: z.string().uuid(),
  websiteUrl: z.string().url(),
  scannedAt: z.string().datetime(),
  totalPagesScraped: z.number().int().min(0),
  totalTimeMs: z.number().int().min(0),
  campuses: z.array(CampusSchema).default([]),
  theme: z.enum(['light', 'dark']).default('light'),
})

// ============================================================================
// SSE Event Schemas
// ============================================================================

export const PageTypeSchema = z.enum([
  'home',
  'about',
  'campus',
  'faculty',
  'department',
  'course',
  'programme',
  'admission',
  'contact',
  'unknown',
])

const ScanEventBaseSchema = z.object({
  timestamp: z.number(),
})

export const ConnectedEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('connected'),
  jobId: z.string(),
})

export const ProgressEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('progress'),
  stage: z.string(),
  percent: z.number().min(0).max(100),
  message: z.string(),
})

export const PageDiscoveredEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('page_discovered'),
  url: z.string().url(),
  pageType: PageTypeSchema,
  depth: z.number().int().min(0),
})

export const PageScrapedEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('page_scraped'),
  url: z.string().url(),
  pageType: PageTypeSchema,
  contentLength: z.number().int().min(0),
})

export const PageErrorEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('page_error'),
  url: z.string().url(),
  error: z.string(),
})

export const AnalysisStartEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('analysis_start'),
  totalPages: z.number().int().min(0),
})

export const ItemExtractedEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('item_extracted'),
  itemType: z.enum(['campus', 'faculty', 'course']),
  item: z.union([CampusSchema, FacultySchema, CourseSchema]),
})

export const CompleteEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('complete'),
  results: ScanResultsSchema,
})

export const ErrorEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('error'),
  message: z.string(),
  recoverable: z.boolean(),
  code: z.string().optional(),
})

export const CancelledEventSchema = ScanEventBaseSchema.extend({
  type: z.literal('cancelled'),
  reason: z.string(),
})

export const ScanEventSchema = z.discriminatedUnion('type', [
  ConnectedEventSchema,
  ProgressEventSchema,
  PageDiscoveredEventSchema,
  PageScrapedEventSchema,
  PageErrorEventSchema,
  AnalysisStartEventSchema,
  ItemExtractedEventSchema,
  CompleteEventSchema,
  ErrorEventSchema,
  CancelledEventSchema,
])

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const StartScanRequestSchema = z.object({
  institution_id: z.string().uuid(),
  website_url: z.string().url(),
  config: z
    .object({
      maxPages: z.number().int().min(1).max(500).optional(),
      maxDepth: z.number().int().min(1).max(10).optional(),
      requestDelayMs: z.number().int().min(100).max(10000).optional(),
      timeoutMs: z.number().int().min(5000).max(120000).optional(),
      respectRobotsTxt: z.boolean().optional(),
      renderJs: z.boolean().optional(),
    })
    .optional(),
})

export const AcceptScanRequestSchema = z.object({
  institution_id: z.string().uuid(),
  campuses: z.array(CampusSchema),
})

export const RefineRequestSchema = z.object({
  jobId: z.string(),
  action: z.enum(['rescan_section', 'add_missing', 'merge_duplicates']),
  targetType: z.enum(['campus', 'faculty', 'course']),
  targetId: z.string().optional(),
  targetUrl: z.string().url().optional(),
  instructions: z.string().max(500).optional(),
})

// ============================================================================
// Backend Response Schemas (from Python/Pydantic)
// ============================================================================

export const ScanResultOutputSchema = z.object({
  institution_id: z.string().uuid(),
  website_url: z.string().url(),
  campuses: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      location: z.string().optional(),
      source_url: z.string().url(),
      confidence: z.number(),
      faculties: z.array(
        z.object({
          name: z.string(),
          code: z.string(),
          description: z.string().optional(),
          source_url: z.string().url(),
          confidence: z.number(),
          courses: z.array(
            z.object({
              name: z.string(),
              code: z.string(),
              description: z.string().optional(),
              requirements: z
                .object({
                  minimum_aps: z.number().optional(),
                  required_subjects: z.array(z.string()).optional(),
                  minimum_subject_levels: z.record(z.number()).optional(),
                  additional_requirements: z.array(z.string()).optional(),
                  text: z.string().optional(),
                })
                .optional(),
              duration_years: z.number().optional(),
              nqf_level: z.number().optional(),
              source_url: z.string().url(),
              confidence: z.number(),
            })
          ),
        })
      ),
    })
  ),
  total_pages_scraped: z.number().int(),
  total_time_ms: z.number().int(),
  theme: z.enum(['light', 'dark']).default('light'),
  scanned_at: z.string().datetime(),
})

// ============================================================================
// Type Exports
// ============================================================================

export type Address = z.infer<typeof AddressSchema>
export type Requirements = z.infer<typeof RequirementsSchema>
export type Course = z.infer<typeof CourseSchema>
export type Faculty = z.infer<typeof FacultySchema>
export type Campus = z.infer<typeof CampusSchema>
export type ScanResults = z.infer<typeof ScanResultsSchema>
export type PageType = z.infer<typeof PageTypeSchema>
export type ScanEvent = z.infer<typeof ScanEventSchema>
export type StartScanRequest = z.infer<typeof StartScanRequestSchema>
export type AcceptScanRequest = z.infer<typeof AcceptScanRequestSchema>
export type RefineRequest = z.infer<typeof RefineRequestSchema>
export type ScanResultOutput = z.infer<typeof ScanResultOutputSchema>

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Transform backend (snake_case) scan results to frontend (camelCase) format
 */
export function transformBackendResults(backendData: ScanResultOutput): ScanResults {
  return {
    institutionId: backendData.institution_id,
    websiteUrl: backendData.website_url,
    scannedAt: backendData.scanned_at,
    totalPagesScraped: backendData.total_pages_scraped,
    totalTimeMs: backendData.total_time_ms,
    theme: backendData.theme,
    campuses: backendData.campuses.map((campus, i) => ({
      id: `campus_${i}`,
      name: campus.name,
      code: campus.code,
      location: campus.location,
      sourceUrl: campus.source_url,
      confidence: campus.confidence,
      faculties: campus.faculties.map((faculty, j) => ({
        id: `faculty_${i}_${j}`,
        name: faculty.name,
        code: faculty.code,
        description: faculty.description,
        sourceUrl: faculty.source_url,
        confidence: faculty.confidence,
        courses: faculty.courses.map((course, k) => ({
          id: `course_${i}_${j}_${k}`,
          name: course.name,
          code: course.code,
          description: course.description,
          requirements: course.requirements
            ? {
                minimumAps: course.requirements.minimum_aps,
                requiredSubjects: course.requirements.required_subjects,
                minimumSubjectLevels: course.requirements.minimum_subject_levels,
                additionalRequirements: course.requirements.additional_requirements,
                text: course.requirements.text,
              }
            : undefined,
          durationYears: course.duration_years,
          nqfLevel: course.nqf_level,
          sourceUrl: course.source_url,
          confidence: course.confidence,
        })),
      })),
    })),
  }
}

/**
 * Validate and parse an SSE event from the stream
 */
export function parseScanEvent(data: unknown): ScanEvent | null {
  const result = ScanEventSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  console.warn('Invalid scan event:', result.error.issues)
  return null
}

/**
 * Validate scan results from API response
 */
export function validateScanResults(data: unknown): ScanResults | null {
  const result = ScanResultsSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  console.error('Invalid scan results:', result.error.issues)
  return null
}

/**
 * Get summary statistics from scan results
 */
export function getScanSummary(results: ScanResults) {
  const facultyCount = results.campuses.reduce(
    (total, campus) => total + campus.faculties.length,
    0
  )
  const courseCount = results.campuses.reduce(
    (total, campus) =>
      total + campus.faculties.reduce((ft, faculty) => ft + faculty.courses.length, 0),
    0
  )

  return {
    campuses: results.campuses.length,
    faculties: facultyCount,
    courses: courseCount,
    pagesScraped: results.totalPagesScraped,
    timeSeconds: results.totalTimeMs / 1000,
  }
}
