import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  PreConfiguredInstitution,
  PreConfiguredCampus,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  ProgrammeTypeCategory,
} from '@/lib/institutions/types'
import { getInstitutionById } from '@/lib/institutions'
import type { Permission } from '@/lib/constants/permissions'

// ============================================================================
// Types
// ============================================================================

export type SetupStep = 'select' | 'preview' | 'edit' | 'confirm' | 'invite'

export type SetupMode = 'preconfigured' | 'manual'

interface EditableCampus extends PreConfiguredCampus {
  _id: string // Unique client-side ID for tracking
  _isNew?: boolean
  _isDeleted?: boolean
}

interface SetupState {
  // Core state
  isOpen: boolean
  currentStep: SetupStep
  mode: SetupMode

  // Current institution context (for tenant isolation)
  institutionId: string | null

  // Institution selection
  selectedInstitutionId: string | null
  institutionData: PreConfiguredInstitution | null

  // Edited data (user can modify before saving)
  editedCampuses: EditableCampus[]

  // UI state
  expandedCampuses: Set<string>
  expandedFaculties: Set<string>
  selectedItemId: string | null
  editingItemId: string | null

  // Form state for manual setup
  manualInstitutionName: string
  manualInstitutionType: PreConfiguredInstitution['type']

  // Team invite state
  pendingInvites: Array<{
    email: string
    roleId?: string
    roleName?: string
    permissions: Permission[]
  }>

  // Submission state
  isSubmitting: boolean
  error: string | null
}

interface SetupActions {
  // Modal control
  openWizard: () => void
  closeWizard: () => void

  // Navigation
  setStep: (step: SetupStep) => void
  nextStep: () => void
  prevStep: () => void

  // Institution selection
  selectInstitution: (institutionId: string | null) => Promise<void>
  setMode: (mode: SetupMode) => void

  // Manual setup
  setManualInstitutionName: (name: string) => void
  setManualInstitutionType: (type: PreConfiguredInstitution['type']) => void

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
  addInvite: (email: string, permissions: Permission[], roleId?: string, roleName?: string) => void
  removeInvite: (email: string) => void
  clearInvites: () => void

  // Submission
  submitSetup: (institutionId: string) => Promise<boolean>
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

// ============================================================================
// Initial State
// ============================================================================

const initialState: SetupState = {
  isOpen: false,
  currentStep: 'select',
  mode: 'preconfigured',
  institutionId: null,
  selectedInstitutionId: null,
  institutionData: null,
  editedCampuses: [],
  expandedCampuses: new Set(),
  expandedFaculties: new Set(),
  selectedItemId: null,
  editingItemId: null,
  manualInstitutionName: '',
  manualInstitutionType: 'university',
  pendingInvites: [],
  isSubmitting: false,
  error: null,
}

// ============================================================================
// Store
// ============================================================================

export const useSetupStore = create<SetupState & SetupActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // -----------------------------------------------------------------------
      // Modal Control
      // -----------------------------------------------------------------------

      openWizard: () => set({ isOpen: true }),

      closeWizard: () => {
        set({ isOpen: false })
        // Reset after animation completes
        setTimeout(() => get().reset(), 300)
      },

      // -----------------------------------------------------------------------
      // Navigation
      // -----------------------------------------------------------------------

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, mode } = get()
        const steps: SetupStep[] = ['select', 'preview', 'edit', 'invite', 'confirm']
        const currentIndex = steps.indexOf(currentStep)

        // Skip preview for manual mode (go straight to edit)
        if (mode === 'manual' && currentStep === 'select') {
          set({ currentStep: 'edit' })
          return
        }

        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] })
        }
      },

      prevStep: () => {
        const { currentStep, mode } = get()
        const steps: SetupStep[] = ['select', 'preview', 'edit', 'invite', 'confirm']
        const currentIndex = steps.indexOf(currentStep)

        // Skip preview when going back in manual mode
        if (mode === 'manual' && currentStep === 'edit') {
          set({ currentStep: 'select' })
          return
        }

        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] })
        }
      },

      // -----------------------------------------------------------------------
      // Institution Selection
      // -----------------------------------------------------------------------

      selectInstitution: async (institutionId) => {
        if (!institutionId) {
          set({
            selectedInstitutionId: null,
            institutionData: null,
            editedCampuses: [],
            mode: 'manual',
          })
          return
        }

        // Set loading state
        set({
          selectedInstitutionId: institutionId,
          institutionData: null,
          editedCampuses: [],
          mode: 'preconfigured',
          error: null,
        })

        try {
          const institution = await getInstitutionById(institutionId)
          if (institution) {
            set({
              institutionData: institution,
              editedCampuses: convertToEditableCampuses(institution.campuses),
            })
          } else {
            set({
              error: `Institution "${institutionId}" not found`,
              selectedInstitutionId: null,
            })
          }
        } catch (error) {
          console.error('Failed to load institution:', error)
          set({
            error: 'Failed to load institution data',
            selectedInstitutionId: null,
          })
        }
      },

      setMode: (mode) => {
        set({ mode })
        if (mode === 'manual') {
          set({
            selectedInstitutionId: null,
            institutionData: null,
            editedCampuses: [],
          })
        }
      },

      // -----------------------------------------------------------------------
      // Manual Setup
      // -----------------------------------------------------------------------

      setManualInstitutionName: (name) => set({ manualInstitutionName: name }),

      setManualInstitutionType: (type) => set({ manualInstitutionType: type }),

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
            campus._id === campusId
              ? { ...campus, _isDeleted: true }
              : campus
          ),
        }))
      },

      restoreCampus: (campusId) => {
        set((state) => ({
          editedCampuses: state.editedCampuses.map((campus) =>
            campus._id === campusId
              ? { ...campus, _isDeleted: false }
              : campus
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
                  course.code === courseCode
                    ? { ...course, ...updates }
                    : course
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

      addInvite: (email, permissions, roleId, roleName) =>
        set((state) => ({
          pendingInvites: [...state.pendingInvites, { email, roleId, roleName, permissions }],
        })),

      removeInvite: (email) =>
        set((state) => ({
          pendingInvites: state.pendingInvites.filter((i) => i.email !== email),
        })),

      clearInvites: () => set({ pendingInvites: [] }),

      // -----------------------------------------------------------------------
      // Submission
      // -----------------------------------------------------------------------

      submitSetup: async (institutionId: string) => {
        const state = get()
        const activeCampuses = state.editedCampuses.filter((c) => !c._isDeleted)

        if (activeCampuses.length === 0) {
          set({ error: 'At least one campus is required' })
          return false
        }

        set({ isSubmitting: true, error: null })

        try {
          const response = await fetch('/api/setup/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              institution_id: institutionId,
              mode: state.mode,
              institution_name:
                state.mode === 'manual'
                  ? state.manualInstitutionName
                  : state.institutionData?.name,
              institution_type:
                state.mode === 'manual'
                  ? state.manualInstitutionType
                  : state.institutionData?.type,
              campuses: activeCampuses.map(({ _id, _isNew, _isDeleted, ...campus }) => campus),
              invites: state.pendingInvites,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            // Build a detailed error message
            let errorMessage = errorData.error || 'Failed to complete setup'
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`
            }
            if (errorData.campus) {
              errorMessage += ` (Campus: ${errorData.campus})`
            }
            if (errorData.faculty) {
              errorMessage += ` (Faculty: ${errorData.faculty})`
            }
            if (errorData.course) {
              errorMessage += ` (Course: ${errorData.course})`
            }
            throw new Error(errorMessage)
          }

          set({ isSubmitting: false })
          return true
        } catch (error) {
          console.error('Setup submission error:', error)
          set({
            isSubmitting: false,
            error: error instanceof Error ? error.message : 'Setup failed. Please try again.',
          })
          return false
        }
      },

      setError: (error) => set({ error }),

      // -----------------------------------------------------------------------
      // Reset
      // -----------------------------------------------------------------------

      reset: () => set(initialState),
    }),
    { name: 'setup-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveCampuses = (state: SetupState) =>
  state.editedCampuses.filter((c) => !c._isDeleted)

export const selectCampusCount = (state: SetupState) =>
  state.editedCampuses.filter((c) => !c._isDeleted).length

export const selectFacultyCount = (state: SetupState) =>
  state.editedCampuses
    .filter((c) => !c._isDeleted)
    .reduce((total, campus) =>
      total + campus.programmeTypes.reduce((pt, programmeType) => pt + programmeType.faculties.length, 0),
      0
    )

export const selectCourseCount = (state: SetupState) =>
  state.editedCampuses
    .filter((c) => !c._isDeleted)
    .reduce(
      (total, campus) =>
        total +
        campus.programmeTypes.reduce(
          (pt, programmeType) =>
            pt + programmeType.faculties.reduce((ft, faculty) => ft + faculty.courses.length, 0),
          0
        ),
      0
    )

export const selectCanProceed = (state: SetupState): boolean => {
  switch (state.currentStep) {
    case 'select':
      return state.mode === 'manual'
        ? state.manualInstitutionName.trim().length > 0
        : state.selectedInstitutionId !== null
    case 'preview':
      return true
    case 'edit':
      return selectCampusCount(state) > 0
    case 'confirm':
      return !state.isSubmitting
    case 'invite':
      return true // Can skip invite step
    default:
      return false
  }
}

export const selectStepTitle = (state: SetupState): string => {
  switch (state.currentStep) {
    case 'select':
      return 'Select Your Institution'
    case 'preview':
      return 'Review Pre-Configured Data'
    case 'edit':
      return 'Customize Your Dashboard'
    case 'confirm':
      return 'Confirm & Complete Setup'
    case 'invite':
      return 'Invite Team Members'
    default:
      return 'Setup'
  }
}
