'use client'

import { useState } from 'react'
import { Eye, Check, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  type ApplicationDocument,
  DOCUMENT_STATUS_COLORS,
} from '@/lib/types/applications'

interface DocumentRowProps {
  document: ApplicationDocument
  onView: () => void
  onApprove: () => void
  onFlag: (reason: string) => Promise<void>
  isLoading?: boolean
}

/**
 * DocumentRow - Displays a single application document with review actions.
 *
 * Features:
 * - Document type label and file name (truncated)
 * - Review status badge with color coding
 * - Action buttons: View (Eye), Approve (Check), Flag (Flag)
 * - Inline flag reason input when Flag button is clicked
 * - Display of existing flag reason and timestamp if document is flagged
 *
 * Actions:
 * - View: Opens/previews the document
 * - Approve: Marks document as approved
 * - Flag: Shows inline input for flag reason, then sends to onFlag callback
 *
 * Accessibility:
 * - Proper button labels and aria attributes
 * - Keyboard navigation support
 * - Clear visual feedback for actions
 * - Loading states disable interactions
 */
export function DocumentRow({
  document,
  onView,
  onApprove,
  onFlag,
  isLoading = false,
}: DocumentRowProps) {
  const [showFlagInput, setShowFlagInput] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [isFlagging, setIsFlagging] = useState(false)

  const statusColor = DOCUMENT_STATUS_COLORS[document.review_status]

  const handleFlagClick = () => {
    setShowFlagInput(true)
  }

  const handleFlagSubmit = async () => {
    if (!flagReason.trim()) {
      return
    }

    setIsFlagging(true)
    try {
      await onFlag(flagReason.trim())
      setShowFlagInput(false)
      setFlagReason('')
    } finally {
      setIsFlagging(false)
    }
  }

  const handleFlagCancel = () => {
    setShowFlagInput(false)
    setFlagReason('')
  }

  // Format timestamp for display
  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Document type and name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{document.document_type}</div>
          <div className="text-xs text-muted-foreground truncate">
            {document.file_name || 'Unnamed file'}
          </div>
        </div>

        {/* Review status badge */}
        <span
          className={cn(
            'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
            statusColor
          )}
        >
          {document.review_status.charAt(0).toUpperCase() + document.review_status.slice(1)}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            disabled={isLoading}
            aria-label="View document"
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onApprove}
            disabled={isLoading || document.review_status === 'approved'}
            aria-label="Approve document"
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlagClick}
            disabled={isLoading || showFlagInput}
            aria-label="Flag document"
            className="h-8 w-8 p-0"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Flag input (shown when Flag button is clicked) */}
      {showFlagInput && (
        <div className="flex items-center gap-2 pl-4 pr-2">
          <Input
            type="text"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Enter flag reason..."
            disabled={isFlagging}
            className="flex-1 h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFlagSubmit()
              } else if (e.key === 'Escape') {
                handleFlagCancel()
              }
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleFlagSubmit}
            disabled={!flagReason.trim() || isFlagging}
            className="h-8"
          >
            {isFlagging ? 'Sending...' : 'Send'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlagCancel}
            disabled={isFlagging}
            className="h-8"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Existing flag info (if document is flagged) */}
      {document.review_status === 'flagged' && document.flag_reason && (
        <div className="pl-4 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Flag className="h-3 w-3 mt-0.5 text-red-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <div className="font-medium text-red-600 dark:text-red-400">
                {document.flag_reason}
              </div>
              {document.flagged_at && (
                <div className="text-[10px] mt-0.5">
                  Flagged on {formatTimestamp(document.flagged_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentRow
