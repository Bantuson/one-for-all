import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type UserType = 'institution' | 'applicant' | null
export type InstitutionType = 'university' | 'college' | 'nsfas' | 'bursary_provider' | null

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

export interface CampusData {
  name: string
  slug: string
  code?: string
  address?: {
    street: string
    city: string
    province: string
    postalCode: string
  }
}

export interface FacultyData {
  name: string
  slug: string
  campusSlug: string
  code?: string
  description?: string
}

interface RegistrationState {
  currentStep: number
  clerkUserId: string | null
  userType: UserType
  institutionType: InstitutionType
  institutionData: InstitutionData
  campusesData: CampusData[]
  facultiesData: FacultyData[]
}

interface RegistrationActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setClerkUserId: (userId: string) => void
  setUserType: (type: UserType) => void
  setInstitutionType: (type: InstitutionType) => void
  updateInstitutionData: (data: Partial<InstitutionData>) => void
  addCampus: (campus: CampusData) => void
  removeCampus: (slug: string) => void
  updateCampus: (slug: string, data: Partial<CampusData>) => void
  addFaculty: (faculty: FacultyData) => void
  removeFaculty: (slug: string) => void
  updateFaculty: (slug: string, data: Partial<FacultyData>) => void
  reset: () => void
}

const initialState: RegistrationState = {
  currentStep: 1,
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
  campusesData: [],
  facultiesData: [],
}

export const useRegistrationStore = create<RegistrationState & RegistrationActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setStep: (step) => set({ currentStep: step }),

        nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

        prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),

        setClerkUserId: (userId) => set({ clerkUserId: userId }),

        setUserType: (type) => set({ userType: type }),

        setInstitutionType: (type) => set({ institutionType: type }),

        updateInstitutionData: (data) =>
          set((state) => ({
            institutionData: { ...state.institutionData, ...data },
          })),

        addCampus: (campus) =>
          set((state) => ({
            campusesData: [...state.campusesData, campus],
          })),

        removeCampus: (slug) =>
          set((state) => ({
            campusesData: state.campusesData.filter((c) => c.slug !== slug),
          })),

        updateCampus: (slug, data) =>
          set((state) => ({
            campusesData: state.campusesData.map((c) =>
              c.slug === slug ? { ...c, ...data } : c
            ),
          })),

        addFaculty: (faculty) =>
          set((state) => ({
            facultiesData: [...state.facultiesData, faculty],
          })),

        removeFaculty: (slug) =>
          set((state) => ({
            facultiesData: state.facultiesData.filter((f) => f.slug !== slug),
          })),

        updateFaculty: (slug, data) =>
          set((state) => ({
            facultiesData: state.facultiesData.map((f) =>
              f.slug === slug ? { ...f, ...data } : f
            ),
          })),

        reset: () => set(initialState),
      }),
      {
        name: 'registration-storage',
        partialize: (state) => ({
          currentStep: state.currentStep,
          clerkUserId: state.clerkUserId,
          userType: state.userType,
          institutionType: state.institutionType,
          institutionData: state.institutionData,
          campusesData: state.campusesData,
          facultiesData: state.facultiesData,
        }),
      }
    )
  )
)
