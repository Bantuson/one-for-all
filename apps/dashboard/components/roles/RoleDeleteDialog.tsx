'use client'

import * as React from 'react'
import { AlertTriangle, Users, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/AlertDialog'
import { RoleBadge } from './RoleBadge'
import type { Role } from './RoleSelector'

// ============================================================================
// Types
// ============================================================================

interface RoleDeleteDialogProps {
  /** The role to delete */
  role: Role
  /** Number of members with this role */
  memberCount: number
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when delete is confirmed */
  onConfirm: () => void
  /** Callback when dialog is cancelled */
  onCancel: () => void
  /** Whether a delete operation is in progress */
  isDeleting?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * RoleDeleteDialog - Confirmation dialog with affected member count
 *
 * Shows a warning about deletion and disables confirm if memberCount > 0.
 */
export function RoleDeleteDialog({
  role,
  memberCount,
  isOpen,
  onConfirm,
  onCancel,
  isDeleting = false,
}: RoleDeleteDialogProps) {
  const hasMembers = memberCount > 0
  const canDelete = !hasMembers && !isDeleting

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Role
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Role info */}
              <div className="flex items-center gap-2 font-mono">
                <span className="text-syntax-key">role:</span>
                <RoleBadge name={role.name} color={role.color} size="md" />
              </div>

              {/* Warning message */}
              {hasMembers ? (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold">
                    <Users className="h-4 w-4" />
                    <span>Cannot delete role with active members</span>
                  </div>
                  <p className="text-sm">
                    This role is currently assigned to{' '}
                    <span className="font-mono font-semibold text-destructive">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                    . You must reassign or remove these members before deleting
                    this role.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-muted/50 border border-border space-y-2">
                  <p className="text-sm">
                    Are you sure you want to delete the{' '}
                    <span className="font-mono font-semibold">"{role.name}"</span>{' '}
                    role? This action cannot be undone.
                  </p>
                  <div className="text-xs text-syntax-comment font-mono">
                    // This will permanently remove the role and its permissions
                    configuration
                  </div>
                </div>
              )}

              {/* Member count summary */}
              <div className="flex items-center gap-2 text-sm font-mono">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">affected members:</span>
                <span
                  className={cn(
                    'font-semibold',
                    hasMembers ? 'text-destructive' : 'text-traffic-green'
                  )}
                >
                  {memberCount}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="font-mono">
            $ cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              if (!canDelete) {
                e.preventDefault()
                return
              }
              onConfirm()
            }}
            disabled={!canDelete}
            className={cn(
              'font-mono gap-2',
              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              !canDelete && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            $ delete --force
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default RoleDeleteDialog
