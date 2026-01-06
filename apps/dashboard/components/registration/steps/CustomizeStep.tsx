'use client'

import * as React from 'react'
import { useEffect, useRef } from 'react'
import { SetupEditorMasterDetail } from '@/components/setup/SetupEditorMasterDetail'
import { cn } from '@/lib/utils'
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'
import { useSetupStore } from '@/lib/stores/setupStore'

// ============================================================================
// Types
// ============================================================================

interface CustomizeStepProps {
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Step 6: Customize Institution Data
 *
 * Wraps the SetupEditorMasterDetail component to allow users to:
 * - View and edit campuses
 * - Manage faculties within programme types
 * - Add/edit/delete courses
 *
 * This component bridges unifiedRegistrationStore and setupStore:
 * 1. On mount: Sync data from unifiedRegistrationStore → setupStore (one-time)
 * 2. On unmount: Sync edited data from setupStore → unifiedRegistrationStore
 *
 * This ensures SetupEditorMasterDetail (which reads from setupStore) has the right data,
 * and any edits made are reflected back in the unified registration flow.
 */
export function CustomizeStep({ className }: CustomizeStepProps) {
  // Track if initial sync has happened to prevent infinite loops
  const hasSynced = useRef(false)

  // Read from unified registration store (only used for initial sync)
  const editedCampuses = useUnifiedRegistrationStore((state) => state.editedCampuses)
  const preConfiguredData = useUnifiedRegistrationStore((state) => state.preConfiguredData)
  const setupMode = useUnifiedRegistrationStore((state) => state.setupMode)
  const institutionData = useUnifiedRegistrationStore((state) => state.institutionData)

  // One-time sync on mount: unified → setupStore
  useEffect(() => {
    if (hasSynced.current) return
    hasSynced.current = true

    useSetupStore.setState({
      editedCampuses,
      institutionData: preConfiguredData,
      mode: setupMode,
      manualInstitutionName: setupMode === 'manual' ? institutionData.name : '',
      manualInstitutionType: 'university', // Default to university
    })
  }, [editedCampuses, preConfiguredData, setupMode, institutionData])

  // Sync back on unmount: setupStore → unified
  useEffect(() => {
    return () => {
      // Get latest setupStore state and sync to unified
      const { editedCampuses: latestCampuses } = useSetupStore.getState()
      useUnifiedRegistrationStore.setState({ editedCampuses: latestCampuses })
    }
  }, [])

  return (
    <div className={cn(className)}>
      <p className="font-mono text-sm mb-4 pt-6 text-center">
        <span className="text-traffic-green">//</span>
        <span className="text-muted-foreground"> Customize your institution&apos;s structure</span>
      </p>

      <SetupEditorMasterDetail />
    </div>
  )
}

export default CustomizeStep
