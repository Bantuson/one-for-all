/**
 * Pre-Configured Institution Types
 *
 * Types for pre-populated South African institution data.
 * Used by the setup wizard to populate dashboards without scanning.
 */

export type InstitutionType = 'university' | 'college' | 'nsfas' | 'bursary_provider'

export type ProgrammeTypeCategory =
  | 'undergraduate'
  | 'honours'
  | 'postgraduate'
  | 'masters'
  | 'doctoral'
  | 'diploma'
  | 'certificate'
  | 'online'
  | 'short-course'

export type CourseLevel =
  | 'undergraduate'
  | 'honours'
  | 'postgraduate'
  | 'masters'
  | 'doctoral'
  | 'diploma'
  | 'advanced-diploma'
  | 'btech'
  | 'mtech'
  | 'dtech'
  | 'certificate'
  | 'short-course'

export interface CourseRequirements {
  minimumAps?: number
  requiredSubjects?: string[]
  additionalRequirements?: string[]
}

export interface PreConfiguredCourse {
  name: string
  code: string
  level: CourseLevel
  durationYears: number
  description?: string
  requirements?: CourseRequirements
  deadline?: string           // Application deadline date string
  status?: 'open' | 'closed'  // Course availability status
}

export interface PreConfiguredFaculty {
  name: string
  code: string
  description?: string
  courses: PreConfiguredCourse[]
}

export interface PreConfiguredProgrammeType {
  type: ProgrammeTypeCategory
  displayName: string  // e.g., "Undergraduate Programmes", "Postgraduate Programmes"
  faculties: PreConfiguredFaculty[]
}

export interface PreConfiguredCampus {
  name: string
  code: string
  location: string
  address?: {
    city: string
    province: string
  }
  isMain?: boolean
  programmeTypes: PreConfiguredProgrammeType[]
}

export interface PreConfiguredInstitution {
  // Identity
  id: string // Unique slug identifier: 'up', 'uct', 'wits', etc.
  name: string // Full name
  shortName: string // Abbreviation
  type: InstitutionType

  // Contact & Location
  website: string
  contactEmail?: string
  city: string
  province: string
  logoUrl?: string

  // Full hierarchical structure
  campuses: PreConfiguredCampus[]

  // Computed stats for display
  stats: {
    totalCampuses: number
    totalFaculties: number
    totalCourses: number
  }
}

/**
 * Registry entry with minimal info for dropdown/search
 */
export interface InstitutionListItem {
  id: string
  name: string
  shortName: string
  type: InstitutionType
  city: string
  province: string
  stats: {
    totalCampuses: number
    totalFaculties: number
    totalCourses: number
  }
}
