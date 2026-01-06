import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  PreConfiguredInstitution,
  PreConfiguredCampus,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  ProgrammeTypeCategory,
} from '@/lib/institutions/types'
import { getInstitutionById } from '@/lib/institutions'

// ============================================================================
// Types
// ============================================================================

export type UnifiedStep =
  | 'auth'
  | 'institution-type'
  | 'institution-setup'
  | 'customize'
  | 'team'
  | 'confirm'

export type UserType = 'institution' | 'applicant' | null

export type InstitutionType = 'university' | 'college' | 'nsfas' | 'bursary_provider' | null

export type SetupMode = 'preconfigured' | 'manual'

export type Permission =
  | 'view_dashboard'
  | 'view_applications'
  | 'edit_courses'
  | 'process_applications'
  | 'export_data'
  | 'manage_team'
  | 'admin_access'

export interface InstitutionData {
  name: string
  slug: string
  contactEmail: string
  contactPhone: string
  website: string
  logoUrl: string | null
  address?: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  settings?: {
    allowPublicApplications: boolean
    requireDocumentVerification: boolean
    enableAIProcessing: boolean
  }
}

export interface EditableCampus extends PreConfiguredCampus {
  _id: string // Unique client-side ID for tracking
  _isNew?: boolean
  _isDeleted?: boolean
}

interface UnifiedRegistrationState {
  // Navigation
  currentStep: UnifiedStep

  // From registrationStore - Auth & User Selection
  clerkUserId: string | null
  userType: UserType
  institutionType: InstitutionType
  institutionData: InstitutionData

  // From setupStore - Institution Selection & Setup
  setupMode: SetupMode
  selectedPreConfiguredId: string | null
  preConfiguredData: PreConfiguredInstitution | null
  editedCampuses: EditableCampus[]

  // UI state (from setupStore)
  expandedCampuses: Set<string>
  expandedFaculties: Set<string>
  selectedItemId: string | null
  editingItemId: string | null

  // Team invite state
  pendingInvites: Array<{
    email: string
    permissions: Permission[]
  }>

  // Submission state
  isSubmitting: boolean
  error: string | null
}

interface UnifiedRegistrationActions {
  // Navigation
  setStep: (step: UnifiedStep) => void
  nextStep: () => void
  prevStep: () => void

  // Auth
  setClerkUserId: (userId: string) => void

  // User & Institution Type Selection
  setUserType: (type: UserType) => void
  setInstitutionType: (type: InstitutionType) => void
  updateInstitutionData: (data: Partial<InstitutionData>) => void

  // Setup Mode & Institution Selection
  setSetupMode: (mode: SetupMode) => void
  selectPreConfiguredInstitution: (institutionId: string | null) => Promise<void>

  // Campus editing
  updateCampus: (campusId: string, updates: Partial<PreConfiguredCampus>) => void
  addCampus: (campus: Omit<EditableCampus, '_id'>) => void
  deleteCampus: (campusId: string) => void
  restoreCampus: (campusId: string) => void

  // Faculty editing
  updateFaculty: (
    campusId: string,
    facultyCode: string,
    updates: Partial<PreConfiguredFaculty>
  ) => void
  addFaculty: (campusId: string, faculty: PreConfiguredFaculty, programmeType: ProgrammeTypeCategory) => void
  deleteFaculty: (campusId: string, facultyCode: string) => void

  // Course editing
  updateCourse: (
    campusId: string,
    facultyCode: string,
    courseCode: string,
    updates: Partial<PreConfiguredCourse>
  ) => void
  addCourse: (campusId: string, facultyCode: string, course: PreConfiguredCourse) => void
  deleteCourse: (campusId: string, facultyCode: string, courseCode: string) => void

  // UI actions
  toggleCampusExpanded: (campusId: string) => void
  toggleFacultyExpanded: (facultyId: string) => void
  setSelectedItem: (itemId: string | null) => void
  setEditingItem: (itemId: string | null) => void

  // Team invite actions
  addInvite: (email: string, permissions: Permission[]) => void
  removeInvite: (email: string) => void
  clearInvites: () => void

  // Submission
  submitRegistration: (getToken: () => Promise<string | null>) => Promise<{ success: boolean; clerkOrgId?: string; slug?: string } | null>
  setError: (error: string | null) => void

  // Reset
  reset: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function convertToEditableCampuses(
  campuses: PreConfiguredCampus[]
): EditableCampus[] {
  return campuses.map((campus) => ({
    ...campus,
    _id: generateId(),
    _isNew: false,
    _isDeleted: false,
  }))
}

const fetchWithAuthRetry = async (
  url: string,
  options: RequestInit,
  getToken: () => Promise<string | null>,
  maxRetries = 5,
  baseDelayMs = 1000
): Promise<Response> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get fresh token for each attempt
      const token = await getToken()

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) return response

      if (response.status === 401 && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 200
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter
        console.log(`[fetchWithAuthRetry] Got 401, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

// Step order for navigation
const STEP_ORDER: UnifiedStep[] = [
  'auth',
  'institution-type',
  'institution-setup',
  'customize',
  'team',
  'confirm',
]

// ============================================================================
// Initial State
// ============================================================================

const initialState: UnifiedRegistrationState = {
  // Navigation
  currentStep: 'auth',

  // Auth & User Selection
  clerkUserId: null,
  userType: null,
  institutionType: null,
  institutionData: {
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    logoUrl: null,
  },

  // Setup Mode & Institution Selection
  setupMode: 'preconfigured',
  selectedPreConfiguredId: null,
  preConfiguredData: null,
  editedCampuses: [],

  // UI state
  expandedCampuses: new Set(),
  expandedFaculties: new Set(),
  selectedItemId: null,
  editingItemId: null,

  // Team invites
  pendingInvites: [],

  // Submission
  isSubmitting: false,
  error: null,
}

// ============================================================================
// Store
// ============================================================================

export const useUnifiedRegistrationStore = create<
  UnifiedRegistrationState & UnifiedRegistrationActions
>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // -----------------------------------------------------------------------
        // Navigation
        // -----------------------------------------------------------------------

        setStep: (step) => set({ currentStep: step }),

        nextStep: () => {
          const { currentStep } = get()
          const currentIndex = STEP_ORDER.indexOf(currentStep)

          // Normal progression
          if (currentIndex < STEP_ORDER.length - 1) {
            set({ currentStep: STEP_ORDER[currentIndex + 1] })
          }
        },

        prevStep: () => {
          const { currentStep } = get()
          const currentIndex = STEP_ORDER.indexOf(currentStep)

          // Normal regression
          if (currentIndex > 0) {
            set({ currentStep: STEP_ORDER[currentIndex - 1] })
          }
        },

        // -----------------------------------------------------------------------
        // Auth
        // -----------------------------------------------------------------------

        setClerkUserId: (userId) => set({ clerkUserId: userId }),

        // -----------------------------------------------------------------------
        // User & Institution Type Selection
        // -----------------------------------------------------------------------

        setUserType: (type) => set({ userType: type }),

        setInstitutionType: (type) => set({ institutionType: type }),

        updateInstitutionData: (data) =>
          set((state) => ({
            institutionData: { ...state.institutionData, ...data },
          })),

        // -----------------------------------------------------------------------
        // Setup Mode & Institution Selection
        // -----------------------------------------------------------------------

        setSetupMode: (mode) => {
          set({ setupMode: mode })
          if (mode === 'manual') {
            set({
              selectedPreConfiguredId: null,
              preConfiguredData: null,
              editedCampuses: [],
            })
          }
        },

        selectPreConfiguredInstitution: async (institutionId) => {
          if (!institutionId) {
            set({
              selectedPreConfiguredId: null,
              preConfiguredData: null,
              editedCampuses: [],
              setupMode: 'manual',
            })
            return
          }

          // Set loading state
          set({
            selectedPreConfiguredId: institutionId,
            preConfiguredData: null,
            editedCampuses: [],
            setupMode: 'preconfigured',
            error: null,
          })

          try {
            const institution = await getInstitutionById(institutionId)
            if (institution) {
              set({
                preConfiguredData: institution,
                editedCampuses: convertToEditableCampuses(institution.campuses),
                // Populate basic institution data from pre-configured data
                institutionData: {
                  name: institution.name,
                  slug: institution.id,
                  contactEmail: institution.contactEmail || '',
                  contactPhone: '',
                  website: institution.website,
                  logoUrl: institution.logoUrl || null,
                  address: {
                    street: '',
                    city: institution.city,
                    province: institution.province,
                    postalCode: '',
                    country: 'South Africa',
                  },
                },
              })
            } else {
              set({
                error: `Institution "${institutionId}" not found`,
                selectedPreConfiguredId: null,
              })
            }
          } catch (error) {
            console.error('Failed to load institution:', error)
            set({
              error: 'Failed to load institution data',
              selectedPreConfiguredId: null,
            })
          }
        },

        // -----------------------------------------------------------------------
        // Campus Editing
        // -----------------------------------------------------------------------

        updateCampus: (campusId, updates) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) =>
              campus._id === campusId ? { ...campus, ...updates } : campus
            ),
          }))
        },

        addCampus: (campus) => {
          set((state) => ({
            editedCampuses: [
              ...state.editedCampuses,
              { ...campus, _id: generateId(), _isNew: true },
            ],
          }))
        },

        deleteCampus: (campusId) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) =>
              campus._id === campusId ? { ...campus, _isDeleted: true } : campus
            ),
          }))
        },

        restoreCampus: (campusId) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) =>
              campus._id === campusId ? { ...campus, _isDeleted: false } : campus
            ),
          }))
        },

        // -----------------------------------------------------------------------
        // Faculty Editing
        // -----------------------------------------------------------------------

        updateFaculty: (campusId, facultyCode, updates) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              const programmeTypes = campus.programmeTypes.map((pt) => ({
                ...pt,
                faculties: pt.faculties.map((faculty) =>
                  faculty.code === facultyCode
                    ? { ...faculty, ...updates }
                    : faculty
                ),
              }))

              return { ...campus, programmeTypes }
            }),
          }))
        },

        addFaculty: (campusId, faculty, programmeType) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              // Find existing programme type or create new one
              const existingPtIndex = campus.programmeTypes.findIndex(
                (pt) => pt.type === programmeType
              )

              if (existingPtIndex >= 0) {
                // Add to existing programme type
                const programmeTypes = campus.programmeTypes.map((pt, index) =>
                  index === existingPtIndex
                    ? { ...pt, faculties: [...pt.faculties, faculty] }
                    : pt
                )
                return { ...campus, programmeTypes }
              } else {
                // Create new programme type with this faculty
                const displayNameMap: Record<ProgrammeTypeCategory, string> = {
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
                const newPt = {
                  type: programmeType,
                  displayName: displayNameMap[programmeType] || `${programmeType} Programmes`,
                  faculties: [faculty],
                }
                return {
                  ...campus,
                  programmeTypes: [...campus.programmeTypes, newPt],
                }
              }
            }),
          }))
        },

        deleteFaculty: (campusId, facultyCode) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              return {
                ...campus,
                programmeTypes: campus.programmeTypes.map((pt) => ({
                  ...pt,
                  faculties: pt.faculties.filter((f) => f.code !== facultyCode),
                })),
              }
            }),
          }))
        },

        // -----------------------------------------------------------------------
        // Course Editing
        // -----------------------------------------------------------------------

        updateCourse: (campusId, facultyCode, courseCode, updates) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              const programmeTypes = campus.programmeTypes.map((pt) => ({
                ...pt,
                faculties: pt.faculties.map((faculty) => {
                  if (faculty.code !== facultyCode) return faculty

                  const courses = faculty.courses.map((course) =>
                    course.code === courseCode ? { ...course, ...updates } : course
                  )

                  return { ...faculty, courses }
                }),
              }))

              return { ...campus, programmeTypes }
            }),
          }))
        },

        addCourse: (campusId, facultyCode, course) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              const programmeTypes = campus.programmeTypes.map((pt) => ({
                ...pt,
                faculties: pt.faculties.map((faculty) => {
                  if (faculty.code !== facultyCode) return faculty

                  return {
                    ...faculty,
                    courses: [...faculty.courses, course],
                  }
                }),
              }))

              return { ...campus, programmeTypes }
            }),
          }))
        },

        deleteCourse: (campusId, facultyCode, courseCode) => {
          set((state) => ({
            editedCampuses: state.editedCampuses.map((campus) => {
              if (campus._id !== campusId) return campus

              const programmeTypes = campus.programmeTypes.map((pt) => ({
                ...pt,
                faculties: pt.faculties.map((faculty) => {
                  if (faculty.code !== facultyCode) return faculty

                  return {
                    ...faculty,
                    courses: faculty.courses.filter((c) => c.code !== courseCode),
                  }
                }),
              }))

              return { ...campus, programmeTypes }
            }),
          }))
        },

        // -----------------------------------------------------------------------
        // UI Actions
        // -----------------------------------------------------------------------

        toggleCampusExpanded: (campusId) => {
          set((state) => {
            const expanded = new Set(state.expandedCampuses)
            if (expanded.has(campusId)) {
              expanded.delete(campusId)
            } else {
              expanded.add(campusId)
            }
            return { expandedCampuses: expanded }
          })
        },

        toggleFacultyExpanded: (facultyId) => {
          set((state) => {
            const expanded = new Set(state.expandedFaculties)
            if (expanded.has(facultyId)) {
              expanded.delete(facultyId)
            } else {
              expanded.add(facultyId)
            }
            return { expandedFaculties: expanded }
          })
        },

        setSelectedItem: (itemId) => set({ selectedItemId: itemId }),

        setEditingItem: (itemId) => set({ editingItemId: itemId }),

        // -----------------------------------------------------------------------
        // Team Invite Actions
        // -----------------------------------------------------------------------

        addInvite: (email, permissions) =>
          set((state) => ({
            pendingInvites: [...state.pendingInvites, { email, permissions }],
          })),

        removeInvite: (email) =>
          set((state) => ({
            pendingInvites: state.pendingInvites.filter((i) => i.email !== email),
          })),

        clearInvites: () => set({ pendingInvites: [] }),

        // -----------------------------------------------------------------------
        // Submission
        // -----------------------------------------------------------------------

        submitRegistration: async (getToken: () => Promise<string | null>) => {
          const state = get()

          console.log('[submitRegistration] Starting validation...', {
            clerkUserId: state.clerkUserId,
            userType: state.userType,
            institutionType: state.institutionType,
            institutionName: state.institutionData?.name,
            setupMode: state.setupMode,
            campusCount: state.editedCampuses?.filter((c) => !c._isDeleted)?.length,
          })

          // Validate based on user type
          if (!state.clerkUserId) {
            console.log('[submitRegistration] FAILED: No clerkUserId')
            set({ error: 'User authentication required' })
            return null
          }

          if (!state.userType) {
            console.log('[submitRegistration] FAILED: No userType')
            set({ error: 'User type must be selected' })
            return null
          }

          // For institution users, validate institution data
          if (state.userType === 'institution') {
            if (!state.institutionType) {
              console.log('[submitRegistration] FAILED: No institutionType')
              set({ error: 'Institution type must be selected' })
              return null
            }

            if (!state.institutionData.name.trim()) {
              console.log('[submitRegistration] FAILED: No institution name')
              set({ error: 'Institution name is required' })
              return null
            }

            const activeCampuses = state.editedCampuses.filter((c) => !c._isDeleted)
            if (activeCampuses.length === 0 && state.setupMode === 'preconfigured') {
              console.log('[submitRegistration] FAILED: No active campuses')
              set({ error: 'At least one campus is required' })
              return null
            }
          }

          console.log('[submitRegistration] Validation passed, setting isSubmitting...')
          set({ isSubmitting: true, error: null })

          try {
            // For applicants, we only need to complete onboarding (no institution setup)
            if (state.userType === 'applicant') {
              console.log('[submitRegistration] Applicant flow - calling onboarding API')
              const response = await fetchWithAuthRetry(
                '/api/users/complete-onboarding',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                },
                getToken
              )

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to complete onboarding')
              }

              set({ isSubmitting: false })
              return { success: true }
            }

            // For institution users, call the unified registration endpoint
            const activeCampuses = state.editedCampuses
              .filter((c) => !c._isDeleted)
              .map(({ _id, _isNew, _isDeleted, ...campus }) => campus)

            const requestBody = {
              institution: {
                name: state.institutionData.name,
                slug: state.institutionData.slug,
                type: state.institutionType!,
                contact_email: state.institutionData.contactEmail,
                contact_phone: state.institutionData.contactPhone,
                website: state.institutionData.website,
              },
              setup: {
                mode: state.setupMode,
                campuses: activeCampuses,
              },
              invites: state.pendingInvites,
            }

            console.log('[submitRegistration] Calling API with body:', JSON.stringify(requestBody, null, 2))

            const response = await fetchWithAuthRetry(
              '/api/register/complete',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                credentials: 'include',
              },
              getToken
            )

            console.log('[submitRegistration] API response status:', response.status)

            if (!response.ok) {
              const errorData = await response.json()
              console.log('[submitRegistration] API error response:', errorData)
              throw new Error(errorData.error || 'Registration failed')
            }

            const result = await response.json()
            console.log('[submitRegistration] Registration successful:', result)

            set({ isSubmitting: false })
            return {
              success: true,
              clerkOrgId: result.clerkOrgId,
              slug: result.institution?.slug,
            }
          } catch (error) {
            console.error('[submitRegistration] Error caught:', error)
            set({
              isSubmitting: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Registration failed. Please try again.',
            })
            return null
          }
        },

        setError: (error) => set({ error }),

        // -----------------------------------------------------------------------
        // Reset
        // -----------------------------------------------------------------------

        reset: () => set(initialState),
      }),
      {
        name: 'unified-registration-storage',
        partialize: (state) => ({
          // Only persist user choices and entered data
          // DO NOT persist: currentStep (should always start at auth)
          // DO NOT persist: clerkUserId (should always get fresh from Clerk)
          // DO NOT persist: isSubmitting, error (transient UI state)
          userType: state.userType,
          institutionType: state.institutionType,
          institutionData: state.institutionData,
          setupMode: state.setupMode,
          selectedPreConfiguredId: state.selectedPreConfiguredId,
          preConfiguredData: state.preConfiguredData,
          editedCampuses: state.editedCampuses,
          // Exclude Sets (expandedCampuses, expandedFaculties)
          selectedItemId: state.selectedItemId,
          editingItemId: state.editingItemId,
          pendingInvites: state.pendingInvites,
        }),
      }
    ),
    { name: 'unified-registration-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveCampuses = (state: UnifiedRegistrationState) =>
  state.editedCampuses.filter((c) => !c._isDeleted)

export const selectCampusCount = (state: UnifiedRegistrationState) =>
  state.editedCampuses.filter((c) => !c._isDeleted).length

export const selectFacultyCount = (state: UnifiedRegistrationState) =>
  state.editedCampuses
    .filter((c) => !c._isDeleted)
    .reduce(
      (total, campus) =>
        total +
        campus.programmeTypes.reduce(
          (pt, programmeType) => pt + programmeType.faculties.length,
          0
        ),
      0
    )

export const selectCourseCount = (state: UnifiedRegistrationState) =>
  state.editedCampuses
    .filter((c) => !c._isDeleted)
    .reduce(
      (total, campus) =>
        total +
        campus.programmeTypes.reduce(
          (pt, programmeType) =>
            pt +
            programmeType.faculties.reduce(
              (ft, faculty) => ft + faculty.courses.length,
              0
            ),
          0
        ),
      0
    )

export const selectCanProceed = (state: UnifiedRegistrationState): boolean => {
  switch (state.currentStep) {
    case 'auth':
      return state.clerkUserId !== null
    case 'institution-type':
      return state.institutionType !== null
    case 'institution-setup':
      return (
        state.institutionData.name.trim().length > 0 &&
        state.institutionData.contactEmail.trim().length > 0 &&
        state.institutionData.contactPhone.trim().length > 0
      )
    case 'customize':
      return (
        state.setupMode === 'manual' || selectCampusCount(state) > 0
      )
    case 'team':
      return true // Can skip team invite step
    case 'confirm':
      return !state.isSubmitting
    default:
      return false
  }
}

export const selectStepTitle = (state: UnifiedRegistrationState): string => {
  switch (state.currentStep) {
    case 'auth':
      return 'Authentication'
    case 'institution-type':
      return 'Select Institution Type'
    case 'institution-setup':
      return 'Institution Setup'
    case 'customize':
      return 'Customize Your Dashboard'
    case 'team':
      return 'Invite Team Members'
    case 'confirm':
      return 'Confirm & Complete Setup'
    default:
      return 'Setup'
  }
}

export const selectIsInstitutionUser = (state: UnifiedRegistrationState): boolean =>
  state.userType === 'institution'

export const selectIsApplicantUser = (state: UnifiedRegistrationState): boolean =>
  state.userType === 'applicant'

export const selectCurrentStepIndex = (state: UnifiedRegistrationState): number =>
  STEP_ORDER.indexOf(state.currentStep)

export const selectTotalSteps = (): number => STEP_ORDER.length
