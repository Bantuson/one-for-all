// Application status types
export type ApplicationStatus =
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'incomplete'

// Choice-level status types (for individual course choices within an application)
export type ChoiceStatus =
  | 'pending'
  | 'under_review'
  | 'conditionally_accepted'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn'

// Choice status color mapping
export const CHOICE_STATUS_COLORS: Record<ChoiceStatus, string> = {
  pending: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  under_review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  conditionally_accepted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  accepted: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  waitlisted: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  withdrawn: 'bg-gray-500/10 text-gray-400 dark:text-gray-500',
}

// Choice status display labels
export const CHOICE_STATUS_LABELS: Record<ChoiceStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  conditionally_accepted: 'Conditional',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  withdrawn: 'Withdrawn',
}

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
  physical_address?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  citizenship?: string
  province?: string
  home_language?: string
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

// Document review status
export type DocumentReviewStatus = 'pending' | 'approved' | 'flagged' | 'rejected'

// Application document interface (with review fields)
export interface ApplicationDocument {
  id: string
  application_id: string
  document_type: string
  file_url: string
  file_name: string | null
  storage_path: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  // Review fields
  review_status: DocumentReviewStatus
  flag_reason: string | null
  flagged_by: string | null
  flagged_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

// Note type options
export type NoteType = 'general' | 'flag' | 'review' | 'followup'

// Note color options
export type NoteColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'

// Application note interface
export interface ApplicationNote {
  id: string
  application_id: string
  institution_id: string
  title: string
  body: string
  note_type: NoteType
  color: NoteColor
  created_by: string
  created_at: string
  updated_at: string
}

// Note color mapping for UI
export const NOTE_COLORS: Record<NoteColor, string> = {
  gray: 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400',
  green: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
}

// Note type labels
export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  general: 'GENERAL',
  flag: 'FLAG',
  review: 'REVIEW',
  followup: 'FOLLOWUP',
}

// Document review status colors
export const DOCUMENT_STATUS_COLORS: Record<DocumentReviewStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  flagged: 'bg-red-500/10 text-red-600 dark:text-red-400',
  rejected: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
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

// Application choice interface (for multi-choice applications)
export interface ApplicationChoice {
  id: string
  application_id: string
  priority: 1 | 2
  course_id: string
  institution_id: string
  faculty_id: string | null
  campus_id: string | null
  status: ChoiceStatus
  status_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  course?: {
    id: string
    name: string
    code: string
    computed_status: string | null
  }
  faculty?: {
    id: string
    name: string
    code: string
  }
  campus?: {
    id: string
    name: string
    code: string
  }
}

// Application with choices for detailed view
export interface ApplicationWithChoices extends Application {
  choices: ApplicationChoice[]
}

// Row format for the applications table (transformed from API response)
export interface ApplicationRow {
  id: string
  user_id: string | null
  institution_id: string | null
  course_id: string | null
  personal_info: ApplicationPersonalInfo
  academic_info: ApplicationAcademicInfo
  status: ApplicationStatus
  status_history: StatusHistoryEntry[]
  created_at: string
  updated_at: string
  course?: { id: string; name: string; code: string }
  faculty?: { id: string; name: string; code: string }
  campus?: { id: string; name: string }
  choice_priority?: 1 | 2
  choice_status?: ChoiceStatus
  choice_status_reason?: string | null
  applicant?: {
    id: string
    email: string
    cellphone: string
    platform_student_number: string | null
  }
  // Optional fields for notes and documents
  notes?: ApplicationNote[]
  documents?: ApplicationDocument[]
}

// API response format for application choices (camelCase nested)
export interface ApplicationChoiceApiResponse {
  choiceId: string
  priority: 1 | 2
  choiceStatus: ChoiceStatus
  statusReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  choiceCreatedAt: string
  course: { id: string; name: string; code: string } | null
  faculty: { id: string; name: string; code: string } | null
  campus: { id: string; name: string } | null
  institutionId?: string
  application: {
    id: string
    applicantId: string
    personalInfo: Record<string, unknown>
    academicInfo: Record<string, unknown>
    applicationStatus: ApplicationStatus
    createdAt: string
    updatedAt: string
    statusHistory?: StatusHistoryEntry[]
    applicant: {
      id: string
      email: string
      cellphone: string
      platform_student_number: string | null
    } | null
    documents?: ApplicationDocument[]
  } | null
}

// Transform API response to ApplicationRow format
export function transformApiResponseToApplicationRow(
  item: ApplicationChoiceApiResponse
): ApplicationRow {
  return {
    id: item.application?.id || item.choiceId,
    user_id: item.application?.applicant?.id || null,
    institution_id: item.institutionId || null,
    course_id: item.course?.id || null,
    personal_info: (item.application?.personalInfo as ApplicationPersonalInfo) || {},
    academic_info: (item.application?.academicInfo as ApplicationAcademicInfo) || {},
    status: item.application?.applicationStatus || 'pending',
    status_history: item.application?.statusHistory || [],
    created_at: item.application?.createdAt || new Date().toISOString(),
    updated_at: item.application?.updatedAt || new Date().toISOString(),
    course: item.course || undefined,
    faculty: item.faculty || undefined,
    campus: item.campus || undefined,
    choice_priority: item.priority,
    choice_status: item.choiceStatus,
    choice_status_reason: item.statusReason,
    applicant: item.application?.applicant || undefined,
    documents: item.application?.documents || [],
  }
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
