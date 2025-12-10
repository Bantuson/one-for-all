import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ScanStatus,
  ScanProgress,
  ScanResults,
  Campus,
  Faculty,
  Course,
  ScanEvent,
} from '@/lib/scanner/types'
import { createEmptyProgress } from '@/lib/scanner/types'

// ============================================================================
// Types
// ============================================================================

interface ScanState {
  // Core state
  jobId: string | null
  status: ScanStatus
  progress: ScanProgress
  error: string | null

  // Results
  rawResults: ScanResults | null
  editedResults: ScanResults | null

  // Streaming
  eventSource: EventSource | null
  isConnected: boolean

  // UI state
  expandedCampuses: Set<string>
  expandedFaculties: Set<string>
  selectedItemId: string | null
  editingItemId: string | null
}

interface ScanActions {
  // Lifecycle
  startScan: (institutionId: string, websiteUrl: string) => Promise<void>
  cancelScan: () => void
  reset: () => void

  // Event handling
  handleEvent: (event: ScanEvent) => void
  setConnected: (connected: boolean) => void
  setEventSource: (source: EventSource | null) => void

  // Result editing
  updateCampus: (campusId: string, updates: Partial<Campus>) => void
  updateFaculty: (
    campusId: string,
    facultyId: string,
    updates: Partial<Faculty>
  ) => void
  updateCourse: (
    campusId: string,
    facultyId: string,
    courseId: string,
    updates: Partial<Course>
  ) => void
  deleteCampus: (campusId: string) => void
  deleteFaculty: (campusId: string, facultyId: string) => void
  deleteCourse: (campusId: string, facultyId: string, courseId: string) => void

  // UI actions
  toggleCampusExpanded: (campusId: string) => void
  toggleFacultyExpanded: (facultyId: string) => void
  setSelectedItem: (itemId: string | null) => void
  setEditingItem: (itemId: string | null) => void

  // Approval
  acceptResults: () => Promise<boolean>
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ScanState = {
  jobId: null,
  status: 'idle',
  progress: createEmptyProgress(),
  error: null,
  rawResults: null,
  editedResults: null,
  eventSource: null,
  isConnected: false,
  expandedCampuses: new Set(),
  expandedFaculties: new Set(),
  selectedItemId: null,
  editingItemId: null,
}

// ============================================================================
// Store
// ============================================================================

export const useScanStore = create<ScanState & ScanActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // -----------------------------------------------------------------------
      // Lifecycle
      // -----------------------------------------------------------------------

      startScan: async (institutionId: string, websiteUrl: string) => {
        const state = get()

        // Clean up existing connection
        if (state.eventSource) {
          state.eventSource.close()
        }

        set({
          status: 'connecting',
          progress: {
            ...createEmptyProgress(),
            stage: 'Connecting',
            message: 'Starting scan...',
          },
          error: null,
          rawResults: null,
          editedResults: null,
        })

        try {
          // Start the scan via POST, get job ID
          const response = await fetch('/api/ai-scan/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ institution_id: institutionId, website_url: websiteUrl }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to start scan')
          }

          // The response is an SSE stream
          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response stream')
          }

          set({ status: 'scraping', isConnected: true })

          // Read the stream
          const decoder = new TextDecoder()
          let buffer = ''

          const processStream = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const event = JSON.parse(line.slice(6)) as ScanEvent
                    get().handleEvent(event)
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }

            // Process any remaining buffer
            if (buffer.startsWith('data: ')) {
              try {
                const event = JSON.parse(buffer.slice(6)) as ScanEvent
                get().handleEvent(event)
              } catch {
                // Skip invalid JSON
              }
            }
          }

          processStream().catch((error) => {
            set({
              status: 'error',
              error: error.message,
              isConnected: false,
            })
          })
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            isConnected: false,
          })
        }
      },

      cancelScan: () => {
        const state = get()
        if (state.eventSource) {
          state.eventSource.close()
        }

        // Send cancel request
        if (state.jobId) {
          fetch('/api/ai-scan/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: state.jobId }),
          }).catch(() => {
            // Ignore errors
          })
        }

        set({
          status: 'cancelled',
          eventSource: null,
          isConnected: false,
          progress: {
            ...get().progress,
            stage: 'Cancelled',
            message: 'Scan cancelled by user',
          },
        })
      },

      reset: () => {
        const state = get()
        if (state.eventSource) {
          state.eventSource.close()
        }
        set(initialState)
      },

      // -----------------------------------------------------------------------
      // Event Handling
      // -----------------------------------------------------------------------

      handleEvent: (event: ScanEvent) => {
        switch (event.type) {
          case 'connected':
            set({
              jobId: event.jobId,
              isConnected: true,
            })
            break

          case 'progress':
            set((state) => ({
              progress: {
                ...state.progress,
                stage: event.stage,
                percent: event.percent,
                message: event.message,
                elapsedMs: Date.now() - (state.rawResults?.scannedAt ? new Date(state.rawResults.scannedAt).getTime() : Date.now()),
              },
            }))
            break

          case 'page_discovered':
            set((state) => ({
              progress: {
                ...state.progress,
                pagesDiscovered: state.progress.pagesDiscovered + 1,
              },
            }))
            break

          case 'page_scraped':
            set((state) => ({
              status: 'scraping',
              progress: {
                ...state.progress,
                pagesScraped: state.progress.pagesScraped + 1,
                currentUrl: event.url,
              },
            }))
            break

          case 'analysis_start':
            set({
              status: 'analyzing',
              progress: {
                ...get().progress,
                stage: 'Analyzing',
                message: `Analyzing ${event.totalPages} pages...`,
              },
            })
            break

          case 'item_extracted':
            set((state) => ({
              progress: {
                ...state.progress,
                itemsExtracted: state.progress.itemsExtracted + 1,
              },
            }))
            break

          case 'complete':
            set({
              status: 'preview',
              rawResults: event.results,
              editedResults: JSON.parse(JSON.stringify(event.results)), // Deep clone
              isConnected: false,
              progress: {
                ...get().progress,
                stage: 'Complete',
                percent: 100,
                message: `Found ${event.results.campuses.length} campuses`,
              },
            })
            break

          case 'error':
            set({
              status: event.recoverable ? get().status : 'error',
              error: event.message,
              isConnected: !event.recoverable,
            })
            break

          case 'cancelled':
            set({
              status: 'cancelled',
              isConnected: false,
            })
            break
        }
      },

      setConnected: (connected) => set({ isConnected: connected }),

      setEventSource: (source) => set({ eventSource: source }),

      // -----------------------------------------------------------------------
      // Result Editing
      // -----------------------------------------------------------------------

      updateCampus: (campusId, updates) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.map((campus) =>
            campus.id === campusId ? { ...campus, ...updates } : campus
          )

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
      },

      updateFaculty: (campusId, facultyId, updates) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.map((campus) => {
            if (campus.id !== campusId) return campus

            const faculties = campus.faculties.map((faculty) =>
              faculty.id === facultyId ? { ...faculty, ...updates } : faculty
            )

            return { ...campus, faculties }
          })

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
      },

      updateCourse: (campusId, facultyId, courseId, updates) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.map((campus) => {
            if (campus.id !== campusId) return campus

            const faculties = campus.faculties.map((faculty) => {
              if (faculty.id !== facultyId) return faculty

              const courses = faculty.courses.map((course) =>
                course.id === courseId ? { ...course, ...updates } : course
              )

              return { ...faculty, courses }
            })

            return { ...campus, faculties }
          })

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
      },

      deleteCampus: (campusId) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.filter(
            (campus) => campus.id !== campusId
          )

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
      },

      deleteFaculty: (campusId, facultyId) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.map((campus) => {
            if (campus.id !== campusId) return campus

            const faculties = campus.faculties.filter(
              (faculty) => faculty.id !== facultyId
            )

            return { ...campus, faculties }
          })

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
      },

      deleteCourse: (campusId, facultyId, courseId) => {
        set((state) => {
          if (!state.editedResults) return state

          const campuses = state.editedResults.campuses.map((campus) => {
            if (campus.id !== campusId) return campus

            const faculties = campus.faculties.map((faculty) => {
              if (faculty.id !== facultyId) return faculty

              const courses = faculty.courses.filter(
                (course) => course.id !== courseId
              )

              return { ...faculty, courses }
            })

            return { ...campus, faculties }
          })

          return {
            editedResults: { ...state.editedResults, campuses },
          }
        })
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
      // Approval
      // -----------------------------------------------------------------------

      acceptResults: async () => {
        const state = get()
        if (!state.editedResults) return false

        set({ status: 'saving' })

        try {
          const response = await fetch('/api/ai-scan/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              institution_id: state.editedResults.institutionId,
              campuses: state.editedResults.campuses,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to save results')
          }

          set({ status: 'complete' })
          return true
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to save',
          })
          return false
        }
      },
    }),
    { name: 'scan-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectCampusCount = (state: ScanState) =>
  state.editedResults?.campuses.length ?? 0

export const selectFacultyCount = (state: ScanState) =>
  state.editedResults?.campuses.reduce(
    (total, campus) => total + campus.faculties.length,
    0
  ) ?? 0

export const selectCourseCount = (state: ScanState) =>
  state.editedResults?.campuses.reduce(
    (total, campus) =>
      total +
      campus.faculties.reduce((ft, faculty) => ft + faculty.courses.length, 0),
    0
  ) ?? 0

export const selectIsScanning = (state: ScanState) =>
  state.status === 'connecting' ||
  state.status === 'scraping' ||
  state.status === 'analyzing'

export const selectCanEdit = (state: ScanState) =>
  state.status === 'preview' || state.status === 'error'
