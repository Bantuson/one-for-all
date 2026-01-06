'use client'

import { useEffect, useMemo, useCallback, useRef } from 'react'
import { SetupEditorMasterDetail } from '@/components/setup/SetupEditorMasterDetail'
import { useSetupStore } from '@/lib/stores/setupStore'
import { notify } from '@/lib/toast'
import type {
  PreConfiguredCampus,
  PreConfiguredProgrammeType,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  CourseLevel,
  ProgrammeTypeCategory,
} from '@/lib/institutions/types'

// ============================================================================
// Type Definitions for Database Format
// ============================================================================

interface DatabaseCourse {
  id: string
  name: string
  code: string
  status: string | null
  level: string | null
  description: string | null
  duration_years: number | null
  requirements: string | Record<string, unknown> | null
  campus_id: string | null
  programme_type: string | null
}

interface DatabaseFaculty {
  id: string
  name: string
  code: string
  description: string | null
  courses: DatabaseCourse[]
}

interface DatabaseCampus {
  id: string
  name: string
  code: string
  location: string | null
  is_main: boolean | null
  faculties: DatabaseFaculty[]
}

// ============================================================================
// Props
// ============================================================================

interface DashboardEditorProps {
  campuses: DatabaseCampus[]
  institutionName: string
  institutionSlug: string
  institutionId: string
}

// ============================================================================
// API Helper Types
// ============================================================================

interface CourseAPIData {
  name: string
  code: string
  level?: string
  description?: string
  duration_years?: number
  requirements?: Record<string, unknown>
  status?: string
  programme_type?: string
}

interface FacultyAPIData {
  name: string
  code: string
  description?: string
}

interface CampusAPIData {
  name: string
  code: string
  location?: string
  is_main?: boolean
}

// ============================================================================
// API Helper Functions
// ============================================================================

async function createCourse(
  institutionId: string,
  facultyId: string,
  campusId: string,
  course: CourseAPIData
): Promise<{ course?: DatabaseCourse; error?: string }> {
  try {
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: institutionId,
        faculty_id: facultyId,
        campus_id: campusId,
        ...course,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create course' }
    }
    return { course: data.course }
  } catch (error) {
    console.error('Create course error:', error)
    return { error: 'Network error creating course' }
  }
}

async function updateCourse(
  courseId: string,
  updates: Partial<CourseAPIData>
): Promise<{ course?: DatabaseCourse; error?: string }> {
  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update course' }
    }
    return { course: data.course }
  } catch (error) {
    console.error('Update course error:', error)
    return { error: 'Network error updating course' }
  }
}

async function deleteCourse(courseId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const data = await response.json()
      return { error: data.error || 'Failed to delete course' }
    }
    return { success: true }
  } catch (error) {
    console.error('Delete course error:', error)
    return { error: 'Network error deleting course' }
  }
}

async function createFaculty(
  institutionId: string,
  campusId: string,
  faculty: FacultyAPIData
): Promise<{ faculty?: DatabaseFaculty; error?: string }> {
  try {
    const response = await fetch('/api/faculties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: institutionId,
        campus_id: campusId,
        ...faculty,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create faculty' }
    }
    return { faculty: data.faculty }
  } catch (error) {
    console.error('Create faculty error:', error)
    return { error: 'Network error creating faculty' }
  }
}

async function updateFaculty(
  facultyId: string,
  updates: Partial<FacultyAPIData>
): Promise<{ faculty?: DatabaseFaculty; error?: string }> {
  try {
    const response = await fetch(`/api/faculties/${facultyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update faculty' }
    }
    return { faculty: data.faculty }
  } catch (error) {
    console.error('Update faculty error:', error)
    return { error: 'Network error updating faculty' }
  }
}

async function deleteFacultyAPI(facultyId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/faculties/${facultyId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const data = await response.json()
      return { error: data.error || 'Failed to delete faculty' }
    }
    return { success: true }
  } catch (error) {
    console.error('Delete faculty error:', error)
    return { error: 'Network error deleting faculty' }
  }
}

async function createCampus(
  institutionId: string,
  campus: CampusAPIData
): Promise<{ campus?: DatabaseCampus; error?: string }> {
  try {
    const response = await fetch('/api/campuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: institutionId,
        ...campus,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to create campus' }
    }
    return { campus: data.campus }
  } catch (error) {
    console.error('Create campus error:', error)
    return { error: 'Network error creating campus' }
  }
}

async function updateCampusAPI(
  campusId: string,
  updates: Partial<CampusAPIData>
): Promise<{ campus?: DatabaseCampus; error?: string }> {
  try {
    const response = await fetch(`/api/campuses/${campusId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || 'Failed to update campus' }
    }
    return { campus: data.campus }
  } catch (error) {
    console.error('Update campus error:', error)
    return { error: 'Network error updating campus' }
  }
}

async function deleteCampusAPI(campusId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/campuses/${campusId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const data = await response.json()
      return { error: data.error || 'Failed to delete campus' }
    }
    return { success: true }
  } catch (error) {
    console.error('Delete campus error:', error)
    return { error: 'Network error deleting campus' }
  }
}

// ============================================================================
// Transformation Helpers
// ============================================================================

/**
 * Maps database level strings to CourseLevel type
 */
function mapToCourseLevel(level: string | null): CourseLevel {
  if (!level) return 'undergraduate'

  const normalizedLevel = level.toLowerCase().replace(/[_\s-]+/g, '-')

  const levelMap: Record<string, CourseLevel> = {
    'undergraduate': 'undergraduate',
    'honours': 'honours',
    'honor': 'honours',
    'postgraduate': 'postgraduate',
    'masters': 'masters',
    'master': 'masters',
    'doctoral': 'doctoral',
    'phd': 'doctoral',
    'doctorate': 'doctoral',
    'diploma': 'diploma',
    'advanced-diploma': 'advanced-diploma',
    'btech': 'btech',
    'mtech': 'mtech',
    'dtech': 'dtech',
    'certificate': 'certificate',
    'short-course': 'short-course',
  }

  return levelMap[normalizedLevel] || 'undergraduate'
}

/**
 * Maps programme_type strings to ProgrammeTypeCategory
 */
function mapToProgrammeTypeCategory(type: string | null): ProgrammeTypeCategory {
  if (!type) return 'undergraduate'

  const normalizedType = type.toLowerCase().replace(/[_\s-]+/g, '-')

  const typeMap: Record<string, ProgrammeTypeCategory> = {
    'undergraduate': 'undergraduate',
    'honours': 'honours',
    'postgraduate': 'postgraduate',
    'masters': 'masters',
    'doctoral': 'doctoral',
    'diploma': 'diploma',
    'certificate': 'certificate',
    'online': 'online',
    'short-course': 'short-course',
  }

  return typeMap[normalizedType] || 'undergraduate'
}

/**
 * Gets the display name for a programme type category
 */
function getProgrammeTypeDisplayName(type: ProgrammeTypeCategory): string {
  const displayNames: Record<ProgrammeTypeCategory, string> = {
    undergraduate: 'Undergraduate Programmes',
    honours: 'Honours Programmes',
    postgraduate: 'Postgraduate Programmes',
    masters: 'Masters Programmes',
    doctoral: 'Doctoral Programmes',
    diploma: 'Diploma Programmes',
    certificate: 'Certificate Programmes',
    online: 'Online Programmes',
    'short-course': 'Short Courses',
  }
  return displayNames[type]
}

/**
 * Parses requirements from database format to CourseRequirements
 * Handles both snake_case (from DB) and camelCase (legacy) key formats
 */
function parseRequirements(
  requirements: string | Record<string, unknown> | null
): PreConfiguredCourse['requirements'] {
  if (!requirements) return undefined

  // If it's a string, try to parse as JSON
  if (typeof requirements === 'string') {
    try {
      const parsed = JSON.parse(requirements)
      return {
        // Check snake_case (DB format) first, then camelCase (legacy)
        minimumAps: typeof parsed.minimum_aps === 'number' ? parsed.minimum_aps :
                    typeof parsed.minimumAps === 'number' ? parsed.minimumAps :
                    typeof parsed.minimumAPS === 'number' ? parsed.minimumAPS : undefined,
        requiredSubjects: Array.isArray(parsed.required_subjects) ? parsed.required_subjects :
                          Array.isArray(parsed.requiredSubjects) ? parsed.requiredSubjects : undefined,
        additionalRequirements: Array.isArray(parsed.additional_requirements) ? parsed.additional_requirements :
                                Array.isArray(parsed.additionalRequirements) ? parsed.additionalRequirements : undefined,
      } as PreConfiguredCourse['requirements']
    } catch {
      return undefined
    }
  }

  // If it's already an object
  if (typeof requirements === 'object') {
    return {
      // Check snake_case (DB format) first, then camelCase (legacy)
      minimumAps: typeof requirements.minimum_aps === 'number' ? requirements.minimum_aps as number :
                  typeof requirements.minimumAps === 'number' ? requirements.minimumAps as number :
                  typeof requirements.minimumAPS === 'number' ? requirements.minimumAPS as number : undefined,
      requiredSubjects: Array.isArray(requirements.required_subjects) ? requirements.required_subjects as string[] :
                        Array.isArray(requirements.requiredSubjects) ? requirements.requiredSubjects as string[] : undefined,
      additionalRequirements: Array.isArray(requirements.additional_requirements) ? requirements.additional_requirements as string[] :
                              Array.isArray(requirements.additionalRequirements) ? requirements.additionalRequirements as string[] : undefined,
    }
  }

  return undefined
}

/**
 * Transforms a database course to PreConfiguredCourse format
 */
function transformCourse(dbCourse: DatabaseCourse): PreConfiguredCourse {
  return {
    name: dbCourse.name,
    code: dbCourse.code,
    level: mapToCourseLevel(dbCourse.level),
    durationYears: dbCourse.duration_years || 3,
    description: dbCourse.description || undefined,
    requirements: parseRequirements(dbCourse.requirements),
    status: (dbCourse.status === 'open' || dbCourse.status === 'closed')
      ? dbCourse.status
      : 'open',
  }
}

/**
 * Transforms database campuses to the EditableCampus format expected by SetupEditorMasterDetail.
 *
 * The key transformation is grouping courses by their programme_type field to reconstruct
 * the programmeTypes hierarchy that the UI component expects.
 */
function transformDatabaseCampuses(dbCampuses: DatabaseCampus[]): PreConfiguredCampus[] {
  return dbCampuses.map((dbCampus) => {
    // Collect all courses across all faculties with their programme types
    const programmeTypeMap = new Map<ProgrammeTypeCategory, Map<string, PreConfiguredFaculty>>()

    dbCampus.faculties.forEach((dbFaculty) => {
      // Group courses by programme_type
      const coursesByProgrammeType = new Map<ProgrammeTypeCategory, PreConfiguredCourse[]>()

      dbFaculty.courses.forEach((dbCourse) => {
        const programmeType = mapToProgrammeTypeCategory(dbCourse.programme_type)
        const existingCourses = coursesByProgrammeType.get(programmeType) || []
        existingCourses.push(transformCourse(dbCourse))
        coursesByProgrammeType.set(programmeType, existingCourses)
      })

      // For each programme type that has courses from this faculty, add the faculty
      coursesByProgrammeType.forEach((courses, programmeType) => {
        if (!programmeTypeMap.has(programmeType)) {
          programmeTypeMap.set(programmeType, new Map())
        }

        const facultiesInProgrammeType = programmeTypeMap.get(programmeType)!

        // Check if this faculty already exists in this programme type
        const existingFaculty = facultiesInProgrammeType.get(dbFaculty.code)
        if (existingFaculty) {
          // Merge courses
          existingFaculty.courses.push(...courses)
        } else {
          // Add new faculty entry for this programme type
          facultiesInProgrammeType.set(dbFaculty.code, {
            name: dbFaculty.name,
            code: dbFaculty.code,
            description: dbFaculty.description || undefined,
            courses: courses,
          })
        }
      })

      // If a faculty has no courses, still add it to the default undergraduate programme type
      if (dbFaculty.courses.length === 0) {
        const defaultProgrammeType: ProgrammeTypeCategory = 'undergraduate'
        if (!programmeTypeMap.has(defaultProgrammeType)) {
          programmeTypeMap.set(defaultProgrammeType, new Map())
        }
        const facultiesInProgrammeType = programmeTypeMap.get(defaultProgrammeType)!
        if (!facultiesInProgrammeType.has(dbFaculty.code)) {
          facultiesInProgrammeType.set(dbFaculty.code, {
            name: dbFaculty.name,
            code: dbFaculty.code,
            description: dbFaculty.description || undefined,
            courses: [],
          })
        }
      }
    })

    // Convert the map to the programmeTypes array format
    const programmeTypes: PreConfiguredProgrammeType[] = []

    // Define the order of programme types
    const programmeTypeOrder: ProgrammeTypeCategory[] = [
      'undergraduate',
      'honours',
      'postgraduate',
      'masters',
      'doctoral',
      'diploma',
      'certificate',
      'online',
      'short-course',
    ]

    programmeTypeOrder.forEach((type) => {
      const faculties = programmeTypeMap.get(type)
      if (faculties && faculties.size > 0) {
        programmeTypes.push({
          type,
          displayName: getProgrammeTypeDisplayName(type),
          faculties: Array.from(faculties.values()),
        })
      }
    })

    return {
      name: dbCampus.name,
      code: dbCampus.code,
      location: dbCampus.location || '',
      isMain: dbCampus.is_main || false,
      programmeTypes,
    }
  })
}

// ============================================================================
// Database ID Mapping
// ============================================================================

/**
 * Maintains a mapping between client-side IDs and database IDs.
 * This allows us to track which items have been persisted to the database.
 */
interface DatabaseIdMap {
  campuses: Map<string, string> // clientId -> dbId
  faculties: Map<string, string> // clientId (campusCode-facultyCode) -> dbId
  courses: Map<string, string> // clientId (campusCode-facultyCode-courseCode) -> dbId
}

function buildDatabaseIdMap(campuses: DatabaseCampus[]): DatabaseIdMap {
  const map: DatabaseIdMap = {
    campuses: new Map(),
    faculties: new Map(),
    courses: new Map(),
  }

  campuses.forEach((campus, campusIndex) => {
    const campusClientId = `db-${campus.code}-${campusIndex}`
    map.campuses.set(campusClientId, campus.id)

    campus.faculties.forEach((faculty) => {
      const facultyKey = `${campus.code}-${faculty.code}`
      map.faculties.set(facultyKey, faculty.id)

      faculty.courses.forEach((course) => {
        const courseKey = `${campus.code}-${faculty.code}-${course.code}`
        map.courses.set(courseKey, course.id)
      })
    })
  })

  return map
}

// ============================================================================
// Component
// ============================================================================

/**
 * DashboardEditor is a client-side wrapper that:
 * 1. Receives database-formatted campus data from the server component
 * 2. Transforms it to the EditableCampus format expected by SetupEditorMasterDetail
 * 3. Initializes the Zustand store with the transformed data
 * 4. Subscribes to store changes and persists them to the database via API calls
 * 5. Renders the full-featured SetupEditorMasterDetail component
 */
export function DashboardEditor({
  campuses,
  institutionName,
  institutionSlug: _institutionSlug,
  institutionId,
}: DashboardEditorProps) {
  // Database ID mapping - persisted across renders
  const dbIdMapRef = useRef<DatabaseIdMap>(buildDatabaseIdMap(campuses))

  // Transform the database data to the format expected by the editor
  const transformedCampuses = useMemo(() => {
    return transformDatabaseCampuses(campuses)
  }, [campuses])

  // Initialize the store with the transformed campuses
  const { editedCampuses } = useSetupStore()

  // Store reference for finding campus/faculty IDs
  const findDatabaseCampusId = useCallback((campusCode: string): string | null => {
    // Check the ID map for any key containing this campus code
    for (const [clientId, dbId] of dbIdMapRef.current.campuses.entries()) {
      if (clientId.includes(campusCode)) {
        return dbId
      }
    }
    // Fallback: search original campuses
    const campus = campuses.find((c) => c.code === campusCode)
    return campus?.id || null
  }, [campuses])

  const findDatabaseFacultyId = useCallback((campusCode: string, facultyCode: string): string | null => {
    const key = `${campusCode}-${facultyCode}`
    if (dbIdMapRef.current.faculties.has(key)) {
      return dbIdMapRef.current.faculties.get(key)!
    }
    // Fallback: search original campuses
    const campus = campuses.find((c) => c.code === campusCode)
    const faculty = campus?.faculties.find((f) => f.code === facultyCode)
    return faculty?.id || null
  }, [campuses])

  const findDatabaseCourseId = useCallback((campusCode: string, facultyCode: string, courseCode: string): string | null => {
    const key = `${campusCode}-${facultyCode}-${courseCode}`
    if (dbIdMapRef.current.courses.has(key)) {
      return dbIdMapRef.current.courses.get(key)!
    }
    // Fallback: search original campuses
    const campus = campuses.find((c) => c.code === campusCode)
    const faculty = campus?.faculties.find((f) => f.code === facultyCode)
    const course = faculty?.courses.find((c) => c.code === courseCode)
    return course?.id || null
  }, [campuses])

  // ============================================================================
  // API Save Handlers - Connected to Store Actions
  // ============================================================================

  // Handle course save (create or update)
  const handleSaveCourse = useCallback(async (
    campusCode: string,
    facultyCode: string,
    course: PreConfiguredCourse,
    programmeType: ProgrammeTypeCategory,
    isNew: boolean
  ) => {
    const toastId = notify.loading(isNew ? 'Creating course...' : 'Saving course...')

    try {
      const campusId = findDatabaseCampusId(campusCode)
      const facultyId = findDatabaseFacultyId(campusCode, facultyCode)

      if (!campusId || !facultyId) {
        throw new Error(`Cannot find database IDs for campus: ${campusCode}, faculty: ${facultyCode}`)
      }

      const courseData: CourseAPIData = {
        name: course.name,
        code: course.code,
        level: course.level,
        description: course.description,
        duration_years: course.durationYears,
        requirements: course.requirements as Record<string, unknown>,
        status: course.status || 'open',
        programme_type: programmeType, // Use the actual programme type category
      }

      if (isNew) {
        const result = await createCourse(institutionId, facultyId, campusId, courseData)
        if (result.error) {
          throw new Error(result.error)
        }
        // Update ID mapping with new course
        if (result.course) {
          const key = `${campusCode}-${facultyCode}-${course.code}`
          dbIdMapRef.current.courses.set(key, result.course.id)
        }
      } else {
        const courseId = findDatabaseCourseId(campusCode, facultyCode, course.code)
        if (!courseId) {
          // Course doesn't exist in DB yet - create it
          const result = await createCourse(institutionId, facultyId, campusId, courseData)
          if (result.error) {
            throw new Error(result.error)
          }
          if (result.course) {
            const key = `${campusCode}-${facultyCode}-${course.code}`
            dbIdMapRef.current.courses.set(key, result.course.id)
          }
        } else {
          const result = await updateCourse(courseId, courseData)
          if (result.error) {
            throw new Error(result.error)
          }
        }
      }
      notify.dismiss(toastId)
      notify.success(isNew ? 'Course created' : 'Course saved')
    } catch (error) {
      console.error('Failed to save course:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to save course')
    }
  }, [institutionId, findDatabaseCampusId, findDatabaseFacultyId, findDatabaseCourseId])

  // Handle course delete
  const handleDeleteCourse = useCallback(async (
    campusCode: string,
    facultyCode: string,
    courseCode: string
  ) => {
    const toastId = notify.loading('Deleting course...')

    try {
      const courseId = findDatabaseCourseId(campusCode, facultyCode, courseCode)
      if (courseId) {
        const result = await deleteCourse(courseId)
        if (result.error) {
          throw new Error(result.error)
        }
        // Remove from ID mapping
        const key = `${campusCode}-${facultyCode}-${courseCode}`
        dbIdMapRef.current.courses.delete(key)
      }
      notify.dismiss(toastId)
      notify.success('Course deleted')
    } catch (error) {
      console.error('Failed to delete course:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to delete course')
    }
  }, [findDatabaseCourseId])

  // Handle faculty save
  const handleSaveFaculty = useCallback(async (
    campusCode: string,
    faculty: PreConfiguredFaculty,
    isNew: boolean
  ) => {
    const toastId = notify.loading(isNew ? 'Creating faculty...' : 'Saving faculty...')

    try {
      const campusId = findDatabaseCampusId(campusCode)
      if (!campusId) {
        throw new Error(`Cannot find database ID for campus: ${campusCode}`)
      }

      const facultyData: FacultyAPIData = {
        name: faculty.name,
        code: faculty.code,
        description: faculty.description,
      }

      if (isNew) {
        const result = await createFaculty(institutionId, campusId, facultyData)
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.faculty) {
          const key = `${campusCode}-${faculty.code}`
          dbIdMapRef.current.faculties.set(key, result.faculty.id)
        }
      } else {
        const facultyId = findDatabaseFacultyId(campusCode, faculty.code)
        if (!facultyId) {
          // Faculty doesn't exist in DB yet - create it
          const result = await createFaculty(institutionId, campusId, facultyData)
          if (result.error) {
            throw new Error(result.error)
          }
          if (result.faculty) {
            const key = `${campusCode}-${faculty.code}`
            dbIdMapRef.current.faculties.set(key, result.faculty.id)
          }
        } else {
          const result = await updateFaculty(facultyId, facultyData)
          if (result.error) {
            throw new Error(result.error)
          }
        }
      }
      notify.dismiss(toastId)
      notify.success(isNew ? 'Faculty created' : 'Faculty saved')
    } catch (error) {
      console.error('Failed to save faculty:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to save faculty')
    }
  }, [institutionId, findDatabaseCampusId, findDatabaseFacultyId])

  // Handle faculty delete
  const handleDeleteFaculty = useCallback(async (
    campusCode: string,
    facultyCode: string
  ) => {
    const toastId = notify.loading('Deleting faculty...')

    try {
      const facultyId = findDatabaseFacultyId(campusCode, facultyCode)
      if (facultyId) {
        const result = await deleteFacultyAPI(facultyId)
        if (result.error) {
          throw new Error(result.error)
        }
        // Remove from ID mapping
        const key = `${campusCode}-${facultyCode}`
        dbIdMapRef.current.faculties.delete(key)
      }
      notify.dismiss(toastId)
      notify.success('Faculty deleted')
    } catch (error) {
      console.error('Failed to delete faculty:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to delete faculty')
    }
  }, [findDatabaseFacultyId])

  // Handle campus save
  const handleSaveCampus = useCallback(async (
    campus: PreConfiguredCampus & { _id: string; _isNew?: boolean },
    isNew: boolean
  ) => {
    const toastId = notify.loading(isNew ? 'Creating campus...' : 'Saving campus...')

    try {
      const campusData: CampusAPIData = {
        name: campus.name,
        code: campus.code,
        location: campus.location,
        is_main: campus.isMain,
      }

      if (isNew) {
        const result = await createCampus(institutionId, campusData)
        if (result.error) {
          throw new Error(result.error)
        }
        if (result.campus) {
          dbIdMapRef.current.campuses.set(campus._id, result.campus.id)
        }
      } else {
        const campusId = findDatabaseCampusId(campus.code)
        if (!campusId) {
          // Campus doesn't exist in DB yet - create it
          const result = await createCampus(institutionId, campusData)
          if (result.error) {
            throw new Error(result.error)
          }
          if (result.campus) {
            dbIdMapRef.current.campuses.set(campus._id, result.campus.id)
          }
        } else {
          const result = await updateCampusAPI(campusId, campusData)
          if (result.error) {
            throw new Error(result.error)
          }
        }
      }
      notify.dismiss(toastId)
      notify.success(isNew ? 'Campus created' : 'Campus saved')
    } catch (error) {
      console.error('Failed to save campus:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to save campus')
    }
  }, [institutionId, findDatabaseCampusId])

  // Handle campus delete
  const handleDeleteCampus = useCallback(async (campusCode: string, clientId: string) => {
    const toastId = notify.loading('Deleting campus...')

    try {
      const campusId = findDatabaseCampusId(campusCode)
      if (campusId) {
        const result = await deleteCampusAPI(campusId)
        if (result.error) {
          throw new Error(result.error)
        }
        // Remove from ID mapping
        dbIdMapRef.current.campuses.delete(clientId)
      }
      notify.dismiss(toastId)
      notify.success('Campus deleted')
    } catch (error) {
      console.error('Failed to delete campus:', error)
      notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to delete campus')
    }
  }, [findDatabaseCampusId])

  // ============================================================================
  // Store Subscription - Listen for changes and persist
  // ============================================================================

  useEffect(() => {
    const currentStoreInstitutionId = useSetupStore.getState().institutionId

    // Reinitialize if:
    // 1. Institution has changed (tenant isolation fix)
    // 2. Store is empty and we have data to initialize
    const institutionChanged = institutionId !== currentStoreInstitutionId
    const storeEmpty = editedCampuses.length === 0 && transformedCampuses.length > 0

    if (institutionChanged || storeEmpty) {
      // We need to manually set the campuses in the store
      // The store's selectInstitution method expects an institution ID
      // Instead, we'll directly set the editedCampuses and mode
      useSetupStore.setState({
        institutionId, // Track which institution this data belongs to
        mode: 'manual',
        manualInstitutionName: institutionName,
        editedCampuses: transformedCampuses.map((campus, index) => ({
          ...campus,
          _id: `db-${campus.code}-${index}`,
          _isNew: false,
          _isDeleted: false,
        })),
      })
    }
  }, [transformedCampuses, editedCampuses.length, institutionName, institutionId])

  // Subscribe to specific store actions to trigger API calls
  useEffect(() => {
    // Create wrapper functions that intercept store actions
    const originalUpdateCourse = useSetupStore.getState().updateCourse
    const originalDeleteCourse = useSetupStore.getState().deleteCourse
    const originalAddCourse = useSetupStore.getState().addCourse
    const originalUpdateFaculty = useSetupStore.getState().updateFaculty
    const originalDeleteFaculty = useSetupStore.getState().deleteFaculty
    const originalAddFaculty = useSetupStore.getState().addFaculty
    const originalUpdateCampus = useSetupStore.getState().updateCampus
    const originalDeleteCampus = useSetupStore.getState().deleteCampus
    const originalAddCampus = useSetupStore.getState().addCampus

    // Override store actions with API-connected versions
    useSetupStore.setState({
      updateCourse: (campusId, facultyCode, courseCode, updates) => {
        // Call original store action
        originalUpdateCourse(campusId, facultyCode, courseCode, updates)
        // Find the campus code from the campusId
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        if (campus) {
          // Find the updated course
          for (const pt of campus.programmeTypes) {
            const faculty = pt.faculties.find((f) => f.code === facultyCode)
            if (faculty) {
              const course = faculty.courses.find((c) => c.code === courseCode)
              if (course) {
                handleSaveCourse(campus.code, facultyCode, { ...course, ...updates }, pt.type, false)
                break
              }
            }
          }
        }
      },
      deleteCourse: (campusId, facultyCode, courseCode) => {
        // Find campus code before deletion
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        // Call original store action
        originalDeleteCourse(campusId, facultyCode, courseCode)
        // Persist to database
        if (campus) {
          handleDeleteCourse(campus.code, facultyCode, courseCode)
        }
      },
      addCourse: (campusId, facultyCode, course) => {
        // Call original store action
        originalAddCourse(campusId, facultyCode, course)
        // Find the campus code and programme type
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        if (campus) {
          // Find which programme type this faculty belongs to
          for (const pt of campus.programmeTypes) {
            const faculty = pt.faculties.find((f) => f.code === facultyCode)
            if (faculty) {
              handleSaveCourse(campus.code, facultyCode, course, pt.type, true)
              break
            }
          }
        }
      },
      updateFaculty: (campusId, facultyCode, updates) => {
        // Call original store action
        originalUpdateFaculty(campusId, facultyCode, updates)
        // Find campus and persist
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        if (campus) {
          for (const pt of campus.programmeTypes) {
            const faculty = pt.faculties.find((f) => f.code === facultyCode)
            if (faculty) {
              handleSaveFaculty(campus.code, { ...faculty, ...updates }, false)
              break
            }
          }
        }
      },
      deleteFaculty: (campusId, facultyCode) => {
        // Find campus code before deletion
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        // Call original store action
        originalDeleteFaculty(campusId, facultyCode)
        // Persist to database
        if (campus) {
          handleDeleteFaculty(campus.code, facultyCode)
        }
      },
      addFaculty: (campusId, faculty, programmeType) => {
        // Call original store action
        originalAddFaculty(campusId, faculty, programmeType)
        // Find campus and persist
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        if (campus) {
          handleSaveFaculty(campus.code, faculty, true)
        }
      },
      updateCampus: (campusId, updates) => {
        // Call original store action
        originalUpdateCampus(campusId, updates)
        // Persist to database
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        if (campus) {
          handleSaveCampus({ ...campus, ...updates }, campus._isNew || false)
        }
      },
      deleteCampus: (campusId) => {
        // Find campus before deletion
        const state = useSetupStore.getState()
        const campus = state.editedCampuses.find((c) => c._id === campusId)
        // Call original store action
        originalDeleteCampus(campusId)
        // Persist to database (if it exists in DB)
        if (campus && !campus._isNew) {
          handleDeleteCampus(campus.code, campusId)
        }
      },
      addCampus: (campusData) => {
        // Call original store action
        originalAddCampus(campusData)
        // Get the newly added campus
        const state = useSetupStore.getState()
        const newCampus = state.editedCampuses[state.editedCampuses.length - 1]
        if (newCampus) {
          handleSaveCampus(newCampus, true)
        }
      },
    })

    // Cleanup: restore original actions on unmount
    return () => {
      useSetupStore.setState({
        updateCourse: originalUpdateCourse,
        deleteCourse: originalDeleteCourse,
        addCourse: originalAddCourse,
        updateFaculty: originalUpdateFaculty,
        deleteFaculty: originalDeleteFaculty,
        addFaculty: originalAddFaculty,
        updateCampus: originalUpdateCampus,
        deleteCampus: originalDeleteCampus,
        addCampus: originalAddCampus,
      })
    }
  }, [
    handleSaveCourse,
    handleDeleteCourse,
    handleSaveFaculty,
    handleDeleteFaculty,
    handleSaveCampus,
    handleDeleteCampus,
  ])

  return (
    <div className="flex flex-col flex-1 relative">
      <SetupEditorMasterDetail />
    </div>
  )
}

export default DashboardEditor
