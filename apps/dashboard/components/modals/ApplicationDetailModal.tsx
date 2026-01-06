'use client'

import {
  Dialog,
  CodeDialogContent,
  CodeDialogHeader,
  CodeDialogBody,
  CodeDialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  type Application,
  type ApplicationStatus,
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  getApplicantFullName,
  formatApplicationId,
} from '@/lib/types/applications'

interface ApplicationDetailModalProps {
  application: Application | null
  isOpen: boolean
  onClose: () => void
}

export function ApplicationDetailModal({
  application,
  isOpen,
  onClose,
}: ApplicationDetailModalProps) {
  if (!application) return null

  const fullName = getApplicantFullName(application.personal_info)
  const status = application.status as ApplicationStatus
  const applicationDate = new Date(application.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Map status to traffic light status
  const getTrafficLightStatus = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':
        return 'active'
      case 'rejected':
        return 'error'
      case 'under_review':
      case 'pending':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CodeDialogContent
        filename={`${formatApplicationId(application.id)}.applicant.tsx`}
        status={getTrafficLightStatus(status)}
        className="max-w-2xl"
      >
        <CodeDialogHeader
          path={`applications/${formatApplicationId(application.id)}`}
          subtitle={`Application submitted on ${applicationDate}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-lg">
              <span className="text-syntax-export">export default</span>
              <span className="text-syntax-string ml-2">"{fullName}"</span>
            </h2>
            <span
              className={cn(
                'text-xs px-2 py-1 rounded font-medium uppercase',
                APPLICATION_STATUS_COLORS[status] || APPLICATION_STATUS_COLORS.submitted
              )}
            >
              {APPLICATION_STATUS_LABELS[status] || status}
            </span>
          </div>
        </CodeDialogHeader>

        <CodeDialogBody className="max-h-[60vh] overflow-y-auto space-y-6">
          {/* Personal Information Section */}
          <section>
            <h3 className="font-mono text-sm text-syntax-key mb-3">
              <span className="text-traffic-green">//</span> Personal Information
            </h3>
            <div className="font-mono text-sm space-y-2 pl-4 border-l-2 border-border">
              <InfoRow label="full_name" value={fullName} type="string" />
              <InfoRow
                label="student_number"
                value={application.personal_info.student_number}
                type="string"
              />
              <InfoRow label="email" value={application.personal_info.email} type="string" />
              <InfoRow label="phone" value={application.personal_info.phone} type="string" />
              <InfoRow label="id_number" value={application.personal_info.id_number} type="string" />
              <InfoRow
                label="date_of_birth"
                value={application.personal_info.date_of_birth}
                type="string"
              />
              <InfoRow label="gender" value={application.personal_info.gender} type="string" />
              <InfoRow
                label="nationality"
                value={application.personal_info.nationality}
                type="string"
              />
            </div>
          </section>

          {/* Academic Information Section */}
          <section>
            <h3 className="font-mono text-sm text-syntax-key mb-3">
              <span className="text-traffic-green">//</span> Academic Information
            </h3>
            <div className="font-mono text-sm space-y-2 pl-4 border-l-2 border-border">
              <InfoRow
                label="aps_score"
                value={application.academic_info.aps_score}
                type="number"
              />
              <InfoRow
                label="matric_year"
                value={application.academic_info.matric_year}
                type="number"
              />
              <InfoRow
                label="school_name"
                value={application.academic_info.school_name}
                type="string"
              />
              <InfoRow
                label="highest_qualification"
                value={application.academic_info.highest_qualification}
                type="string"
              />

              {/* Subjects Array */}
              {application.academic_info.subjects &&
                application.academic_info.subjects.length > 0 && (
                  <div className="mt-3">
                    <span className="text-syntax-key">"subjects"</span>
                    <span className="text-muted-foreground">: [</span>
                    <div className="pl-4 mt-1 space-y-1">
                      {application.academic_info.subjects.map((subject, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{'{'}</span>
                          <span className="text-syntax-string">"{subject.name}"</span>
                          <span className="text-muted-foreground">:</span>
                          <span className="text-syntax-number">{subject.grade}</span>
                          <span className="text-muted-foreground">
                            {'}'}
                            {index < application.academic_info.subjects!.length - 1 ? ',' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-muted-foreground">]</span>
                  </div>
                )}
            </div>
          </section>

          {/* Status History Timeline */}
          {application.status_history && application.status_history.length > 0 && (
            <section>
              <h3 className="font-mono text-sm text-syntax-key mb-3">
                <span className="text-traffic-green">//</span> Status History
              </h3>
              <div className="font-mono text-sm space-y-2 pl-4 border-l-2 border-border">
                {application.status_history.map((entry, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground">[{index}]</span>
                    <div>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          APPLICATION_STATUS_COLORS[entry.status as ApplicationStatus] ||
                            APPLICATION_STATUS_COLORS.submitted
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[entry.status as ApplicationStatus] ||
                          entry.status}
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {new Date(entry.timestamp).toLocaleString('en-ZA')}
                      </span>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-traffic-green">//</span> {entry.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Application Metadata */}
          <section>
            <h3 className="font-mono text-sm text-syntax-key mb-3">
              <span className="text-traffic-green">//</span> Metadata
            </h3>
            <div className="font-mono text-sm space-y-2 pl-4 border-l-2 border-border">
              <InfoRow label="application_id" value={application.id} type="string" />
              <InfoRow label="course_id" value={application.course_id} type="string" />
              <InfoRow label="created_at" value={application.created_at} type="date" />
              <InfoRow label="updated_at" value={application.updated_at} type="date" />
            </div>
          </section>
        </CodeDialogBody>

        <CodeDialogFooter>
          <Button variant="ghost" onClick={onClose} className="font-mono">
            <span className="text-traffic-green">$</span>
            <span className="ml-1">close</span>
          </Button>
        </CodeDialogFooter>
      </CodeDialogContent>
    </Dialog>
  )
}

// Helper component for displaying key-value pairs
interface InfoRowProps {
  label: string
  value: string | number | null | undefined
  type: 'string' | 'number' | 'date'
}

function InfoRow({ label, value, type }: InfoRowProps) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-syntax-key">"{label}"</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-muted-foreground italic">null</span>
      </div>
    )
  }

  let displayValue: React.ReactNode
  if (type === 'string') {
    displayValue = <span className="text-syntax-string">"{value}"</span>
  } else if (type === 'number') {
    displayValue = <span className="text-syntax-number">{value}</span>
  } else if (type === 'date') {
    displayValue = (
      <span className="text-syntax-string">
        "{new Date(value as string).toLocaleString('en-ZA')}"
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-syntax-key">"{label}"</span>
      <span className="text-muted-foreground">:</span>
      {displayValue}
    </div>
  )
}
