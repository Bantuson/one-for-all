'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/toast'
import { DottedModal, DottedModalContent, DottedModalFooter } from '@/components/ui/DottedModal'
import { NotesGrid } from '@/components/applications/NotesGrid'
import { AddNoteForm } from '@/components/applications/AddNoteForm'
import { DocumentRow } from '@/components/applications/DocumentRow'
import {
  type Application,
  type ChoiceStatus,
  type ApplicationChoice,
  type ApplicationNote,
  type ApplicationDocument,
  CHOICE_STATUS_COLORS,
  CHOICE_STATUS_LABELS,
  getApplicantFullName,
} from '@/lib/types/applications'

// Extended application type that may include choices and additional fields
interface ExtendedApplication extends Application {
  choices?: ApplicationChoice[]
  // Platform-wide student number
  platform_student_number?: string
  // Institution-specific student number (now always visible to admissions staff)
  institution_student_number?: string
  // Additional personal info fields from backend
  physical_address?: string
  province?: string
  home_language?: string
  citizenship?: string
  // NSFAS information (conditional)
  nsfas?: {
    eligible?: boolean
    household_income?: string
    guardian_employment?: string
    sassa_recipient?: boolean
  } | null
  // Documents array for document review
  documents?: ApplicationDocument[]
  // Primary choice status (for consistency with card view)
  choice_status?: ChoiceStatus
}

interface ApplicationDetailModalProps {
  application: ExtendedApplication | null
  isOpen: boolean
  onClose: () => void
}

// Section component for clean data display
interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="mb-6" aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3
        id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-sm font-mono font-bold text-syntax-key mb-3 uppercase tracking-wide"
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

// InfoRow component for displaying key-value pairs
interface InfoRowProps {
  label: string
  value: string | number | null | undefined
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-mono text-right truncate">
        {value !== null && value !== undefined && value !== '' ? String(value) : '\u2014'}
      </span>
    </div>
  )
}

// Status badge component for the header
interface StatusBadgeProps {
  status: ChoiceStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const label = CHOICE_STATUS_LABELS[status] || status
  const colorClass = CHOICE_STATUS_COLORS[status] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'

  return (
    <span
      role="status"
      aria-label={`Application status: ${label}`}
      className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', colorClass)}
    >
      {label}
    </span>
  )
}

// Programme choice card component
interface ProgrammeChoiceCardProps {
  choice: ApplicationChoice
  priority: 1 | 2
}

function ProgrammeChoiceCard({ choice, priority }: ProgrammeChoiceCardProps) {
  const priorityLabel = priority === 1 ? 'First Choice' : 'Second Choice'
  const statusLabel = CHOICE_STATUS_LABELS[choice.status] || choice.status
  const statusColor = CHOICE_STATUS_COLORS[choice.status]

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-muted/10 p-3',
        priority === 1 && 'ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{priorityLabel}</span>
        <span
          className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', statusColor)}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">
        {choice.course?.name || 'Unknown Course'}
      </p>
      {choice.course?.code && (
        <p className="text-xs text-muted-foreground mt-0.5">{choice.course.code}</p>
      )}
      {choice.faculty?.name && (
        <p className="text-xs text-muted-foreground mt-1">{choice.faculty.name}</p>
      )}
      {choice.status_reason && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 italic">
          {choice.status_reason}
        </p>
      )}
    </div>
  )
}

export function ApplicationDetailModal({
  application,
  isOpen,
  onClose,
}: ApplicationDetailModalProps) {
  // State management
  const [showNoteForm, setShowNoteForm] = React.useState(false)
  const [notes, setNotes] = React.useState<ApplicationNote[]>([])
  const [choices, setChoices] = React.useState<ApplicationChoice[]>([])
  const [documents, setDocuments] = React.useState<ApplicationDocument[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = React.useState(false)
  const [isLoadingChoices, setIsLoadingChoices] = React.useState(false)
  const [isSavingNote, setIsSavingNote] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [isUpdatingDocument, setIsUpdatingDocument] = React.useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = React.useState<ChoiceStatus>('pending')
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false)

  // Derive choiceStatus before useEffect (handles null application)
  const choiceStatus = (application?.choice_status || application?.choices?.[0]?.status || 'pending') as ChoiceStatus

  // Fetch notes and choices on mount - must be called before any early returns
  React.useEffect(() => {
    if (!isOpen || !application) return

    const fetchNotes = async () => {
      setIsLoadingNotes(true)
      try {
        const response = await fetch(`/api/applications/${application.id}/notes`)
        if (response.ok) {
          const data = await response.json()
          setNotes(data.notes || [])
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    const fetchChoices = async () => {
      setIsLoadingChoices(true)
      try {
        const response = await fetch(`/api/applications/${application.id}/status`)
        if (response.ok) {
          const data = await response.json()
          setChoices(data.choices || [])
        }
      } catch (error) {
        console.error('Failed to fetch choices:', error)
      } finally {
        setIsLoadingChoices(false)
      }
    }

    fetchNotes()
    fetchChoices()
    setCurrentStatus(choiceStatus)
    setDocuments(application.documents || [])
  }, [isOpen, application, choiceStatus])

  // Early return AFTER all hooks
  if (!application) return null

  const fullName = getApplicantFullName(application.personal_info)

  // Extract personal info fields
  const personalInfo = application.personal_info
  const academicInfo = application.academic_info

  // Format date of birth if available
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Handle note save
  const handleNoteSave = async (noteData: Partial<ApplicationNote>) => {
    setIsSavingNote(true)
    try {
      const response = await fetch(`/api/applications/${application.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      })

      if (response.ok) {
        const data = await response.json()
        setNotes((prev) => [data.note, ...prev])
        setShowNoteForm(false)
        notify.success('Note saved')
      } else {
        const error = await response.json()
        notify.error(error.error || 'Failed to save note')
      }
    } catch (error) {
      console.error('Failed to save note:', error)
      notify.error('Failed to save note')
    } finally {
      setIsSavingNote(false)
    }
  }

  // Handle status change
  const handleStatusChange = async (newStatus: ChoiceStatus) => {
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setCurrentStatus(newStatus)
        notify.success(`Status updated to ${CHOICE_STATUS_LABELS[newStatus]}`)
      } else {
        const error = await response.json()
        notify.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      notify.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle document actions
  const handleDocumentView = (document: ApplicationDocument) => {
    if (document.file_url) {
      window.open(document.file_url, '_blank')
    }
  }

  const handleDocumentApprove = async (documentId: string) => {
    setIsUpdatingDocument(documentId)
    try {
      const response = await fetch(
        `/api/applications/${application.id}/documents/${documentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_status: 'approved' }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Update local state with the updated document
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? data.document : doc))
        )
        notify.success('Document approved')
      } else {
        const error = await response.json()
        console.error('Document approve error:', error)
        notify.error(error.error || 'Failed to approve document')
      }
    } catch (error) {
      console.error('Failed to approve document:', error)
      notify.error('Failed to approve document')
    } finally {
      setIsUpdatingDocument(null)
    }
  }

  const handleDocumentFlag = async (documentId: string, reason: string) => {
    setIsUpdatingDocument(documentId)
    try {
      const response = await fetch(
        `/api/applications/${application.id}/documents/${documentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_status: 'flagged', flag_reason: reason }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Update local state with the updated document
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? data.document : doc))
        )
        notify.success('Document flagged')

        // Send WhatsApp notification to applicant (non-blocking)
        const applicantPhone = personalInfo?.phone
        if (applicantPhone) {
          const flaggedDoc = documents.find((d) => d.id === documentId)
          fetch('/api/notifications/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: applicantPhone,
              type: 'document_flagged',
              applicantName: fullName,
              documentType: flaggedDoc?.document_type || 'Application Document',
              flagReason: reason,
            }),
          })
            .then((res) => {
              if (res.ok) {
                notify.success('WhatsApp notification sent')
              } else {
                console.warn('WhatsApp notification failed (non-critical)')
              }
            })
            .catch((err) => {
              console.warn('WhatsApp notification error:', err)
            })
        }
      } else {
        const error = await response.json()
        console.error('Document flag error:', error)
        notify.error(error.error || 'Failed to flag document')
      }
    } catch (error) {
      console.error('Failed to flag document:', error)
      notify.error('Failed to flag document')
    } finally {
      setIsUpdatingDocument(null)
    }
  }

  return (
    <DottedModal
      isOpen={isOpen}
      onClose={onClose}
      title="applicationDetail"
      className="max-w-4xl max-h-[95vh]"
      headerExtra={<StatusBadge status={currentStatus} />}
    >
      <DottedModalContent className="overflow-y-auto max-h-[calc(95vh-160px)]">
          {/* Personal Information Section */}
          <Section title="Personal Information">
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="SA ID Number" value={personalInfo.id_number} />
            <InfoRow label="Date of Birth" value={formatDate(personalInfo.date_of_birth)} />
            <InfoRow label="Gender" value={personalInfo.gender} />
            <InfoRow
              label="Citizenship/Nationality"
              value={personalInfo.citizenship || personalInfo.nationality}
            />
            <InfoRow label="Email" value={personalInfo.email} />
            <InfoRow label="Cellphone/Mobile" value={personalInfo.phone} />
            <InfoRow
              label="Home Address"
              value={personalInfo.physical_address || personalInfo.address}
            />
            <InfoRow label="Province" value={personalInfo.province} />
            <InfoRow label="Home Language" value={personalInfo.home_language} />
          </Section>

          {/* Student Numbers Section */}
          <Section title="Student Numbers">
            <InfoRow
              label="Platform Student Number"
              value={application.platform_student_number || personalInfo.student_number}
            />
            <InfoRow
              label="Institution Student Number"
              value={application.institution_student_number}
            />
          </Section>

          {/* Academic Information Section */}
          <Section title="Academic Information">
            <InfoRow label="Total APS Score" value={academicInfo.aps_score} />
            <InfoRow label="Matric Year" value={academicInfo.matric_year} />
            <InfoRow label="School Name" value={academicInfo.school_name} />

            {/* All Subjects with Grades */}
            {academicInfo.subjects && academicInfo.subjects.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-sm text-muted-foreground mb-2">Subjects with Grades</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {academicInfo.subjects.map((subject, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">{subject.name}</span>
                      <span className="font-mono text-foreground shrink-0">
                        {subject.grade}
                        {subject.level && (
                          <span className="text-xs text-muted-foreground ml-1">({subject.level})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {academicInfo.highest_qualification && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <InfoRow label="Highest Qualification" value={academicInfo.highest_qualification} />
              </div>
            )}
          </Section>

          {/* Programme Choices Section */}
          <Section title="Programme Choices">
            {isLoadingChoices ? (
              <p className="text-sm text-muted-foreground italic">Loading choices...</p>
            ) : choices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {choices
                  .sort((a, b) => a.priority - b.priority)
                  .map((choice) => (
                    <ProgrammeChoiceCard
                      key={choice.id}
                      choice={choice}
                      priority={choice.priority}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No programme choices</p>
            )}
          </Section>

          {/* NSFAS Information Section (conditional) */}
          {application.nsfas && (
            <Section title="NSFAS Information">
              <InfoRow
                label="Eligibility Status"
                value={
                  application.nsfas.eligible === true
                    ? 'Eligible'
                    : application.nsfas.eligible === false
                      ? 'Not Eligible'
                      : 'Pending'
                }
              />
              <InfoRow label="Household Income" value={application.nsfas.household_income} />
              <InfoRow label="Guardian Employment" value={application.nsfas.guardian_employment} />
              <InfoRow
                label="SASSA Recipient"
                value={
                  application.nsfas.sassa_recipient === true
                    ? 'Yes'
                    : application.nsfas.sassa_recipient === false
                      ? 'No'
                      : null
                }
              />
            </Section>
          )}

          {/* Documents Section */}
          <Section title="Documents">
            {documents.length > 0 ? (
              <div className="space-y-0">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onView={() => handleDocumentView(doc)}
                    onApprove={() => handleDocumentApprove(doc.id)}
                    onFlag={(reason) => handleDocumentFlag(doc.id, reason)}
                    isLoading={isUpdatingDocument === doc.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No documents uploaded</p>
            )}
          </Section>

          {/* Notes Section */}
          <Section title="Notes">
            {showNoteForm && (
              <div className="mb-4 p-4 border border-border rounded-lg bg-muted/20">
                <AddNoteForm
                  applicationId={application.id}
                  onSave={handleNoteSave}
                  onCancel={() => setShowNoteForm(false)}
                  isLoading={isSavingNote}
                />
              </div>
            )}
            {isLoadingNotes ? (
              <p className="text-sm text-muted-foreground italic">Loading notes...</p>
            ) : notes.length > 0 ? (
              <NotesGrid notes={notes} />
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes added yet</p>
            )}
          </Section>

          {/* Application Metadata */}
          <Section title="Application Metadata">
            <InfoRow label="Application ID" value={application.id} />
            <InfoRow
              label="Created"
              value={new Date(application.created_at).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            <InfoRow
              label="Last Updated"
              value={new Date(application.updated_at).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          </Section>
      </DottedModalContent>

      {/* Footer with action buttons */}
      <DottedModalFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNoteForm(!showNoteForm)}
          className="font-mono text-xs"
        >
          {showNoteForm ? 'Cancel Note' : 'Add Note'}
        </Button>

        {/* Status updater dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            disabled={isUpdatingStatus}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md border border-input',
              'bg-card font-mono text-xs',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <span className={CHOICE_STATUS_COLORS[currentStatus]}>
              {CHOICE_STATUS_LABELS[currentStatus]}
            </span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', showStatusDropdown && 'rotate-180')} />
          </button>

          {showStatusDropdown && (
            <div className="absolute right-0 bottom-full mb-1 w-48 py-1 border border-border rounded-md bg-card shadow-lg z-10">
              {['pending', 'under_review', 'conditionally_accepted', 'accepted', 'rejected', 'waitlisted', 'withdrawn'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    handleStatusChange(status as ChoiceStatus)
                    setShowStatusDropdown(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 font-mono text-xs hover:bg-muted/50 transition-colors',
                    currentStatus === status && 'bg-muted text-traffic-green'
                  )}
                >
                  {CHOICE_STATUS_LABELS[status as ChoiceStatus]}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">
          Close
        </Button>
      </DottedModalFooter>
    </DottedModal>
  )
}
