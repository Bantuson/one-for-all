// Application status types
export type ApplicationStatus =
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'incomplete'

// Application status color mapping (matches course card badge styling)
export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  under_review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  waitlisted: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  incomplete: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

// Application status display labels
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  incomplete: 'Incomplete',
}

// Personal information stored in JSONB
export interface ApplicationPersonalInfo {
  full_name?: string
  first_name?: string
  last_name?: string
  student_number?: string
  id_number?: string
  email?: string
  phone?: string
  address?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
}

// Academic information stored in JSONB
export interface ApplicationAcademicInfo {
  aps_score?: number
  subjects?: Array<{
    name: string
    grade: number
    level?: string
  }>
  matric_year?: number
  school_name?: string
  highest_qualification?: string
}

// Status history entry
export interface StatusHistoryEntry {
  status: ApplicationStatus
  timestamp: string
  reason?: string
  changed_by?: string
}

// Main Application interface matching Supabase schema
export interface Application {
  id: string
  user_id: string
  institution_id: string | null
  course_id: string | null
  university_name: string | null
  faculty: string | null
  qualification_type: string | null
  program: string | null
  year: number | null
  personal_info: ApplicationPersonalInfo
  academic_info: ApplicationAcademicInfo
  rag_summary: Record<string, unknown> | null
  submission_payload: Record<string, unknown> | null
  status: ApplicationStatus
  status_history: StatusHistoryEntry[]
  created_at: string
  updated_at: string
}

// Selected course context for applications view
export interface SelectedCourseForApplications {
  courseCode: string
  courseName: string
  courseId: string
  campusId: string
  facultyCode: string
  facultyName: string
}

// Helper to get full name from personal info
export function getApplicantFullName(personalInfo: ApplicationPersonalInfo): string {
  if (personalInfo.full_name) {
    return personalInfo.full_name
  }
  const firstName = personalInfo.first_name || ''
  const lastName = personalInfo.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || 'Unknown Applicant'
}

// Helper to format application ID for display (first 8 chars)
export function formatApplicationId(id: string): string {
  return id.slice(0, 8).toLowerCase()
}
