/**
 * University Configuration Types
 *
 * Defines the structure for hardcoded university data used
 * to validate and improve scanner extraction accuracy.
 */

export interface FacultyConfig {
  name: string
  slug: string
  aliases?: string[]
  description?: string
}

export interface CampusConfig {
  name: string
  location?: string
  isMain?: boolean
  aliases?: string[]
  faculties?: string[]
}

export interface UniversityConfig {
  // Identity
  name: string
  shortName: string
  type: 'traditional' | 'comprehensive' | 'university-of-technology' | 'private'
  domains: string[]

  // Structure
  faculties: FacultyConfig[]
  campuses: CampusConfig[]

  // URL patterns for this specific institution
  urlPatterns?: {
    faculty?: RegExp
    programme?: RegExp
    campus?: RegExp
    course?: RegExp
  }

  // CSS selectors specific to this institution's website
  selectors?: {
    mainContent?: string
    facultyList?: string
    programmeList?: string
    courseCard?: string
  }

  // Additional metadata
  programmeCodePattern?: RegExp
  establishedYear?: number
  city?: string
  province?: string
}

/**
 * Validation result for extracted items
 */
export interface ValidationResult {
  isValid: boolean
  confidence: number
  reason?: string
  correctedValue?: string
  matchedConfig?: FacultyConfig | CampusConfig
}
