'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'
import { SyntaxFormField } from '@/components/ui/FormField'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { useState, useEffect, useMemo } from 'react'
import { getInstitutionList } from '@/lib/institutions'
import { Sparkles } from 'lucide-react'

// ============================================================================
// Schema & Types
// ============================================================================

const institutionSchema = z.object({
  name: z.string().min(3, 'Institution name must be at least 3 characters'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
})

type InstitutionFormData = z.infer<typeof institutionSchema>

// ============================================================================
// Component
// ============================================================================

/**
 * Merged Institution Setup Step
 *
 * Combines institution details input with auto-detection of pre-configured institutions.
 * User enters name -> auto-detection attempts match -> fills contact details -> continues
 */
export function InstitutionSetupStep() {
  const {
    institutionData,
    updateInstitutionData,
    nextStep,
    prevStep,
    selectPreConfiguredInstitution,
    setSetupMode,
  } = useUnifiedRegistrationStore()

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedInstitutionId, setDetectedInstitutionId] = useState<string | null>(null)

  const methods = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institutionData.name,
      contactEmail: institutionData.contactEmail,
      contactPhone: institutionData.contactPhone,
      website: institutionData.website,
    },
  })

  const {
    handleSubmit,
    formState: { errors },
    watch,
  } = methods

  const name = watch('name')

  // Auto-generate slug from name
  const generatedSlug = useMemo(() => {
    if (!name || name.trim().length === 0) return ''

    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }, [name])

  // Auto-detection logic
  useEffect(() => {
    // Only attempt auto-detection if name is meaningful (>5 chars)
    if (!name || name.trim().length < 5) {
      setDetectedInstitutionId(null)
      return
    }

    setIsDetecting(true)

    // Debounce detection
    const timeout = setTimeout(() => {
      const allInstitutions = getInstitutionList()
      const lowerName = name.toLowerCase().trim()

      // Find best match using case-insensitive substring matching
      const match = allInstitutions.find((inst) => {
        const instNameLower = inst.name.toLowerCase()
        const shortNameLower = inst.shortName.toLowerCase()

        // Check if institution name or short name contains the input
        // OR if input contains the short name (e.g., "UP" matches "University of Pretoria")
        return (
          instNameLower.includes(lowerName) ||
          shortNameLower.includes(lowerName) ||
          lowerName.includes(shortNameLower)
        )
      })

      if (match) {
        setDetectedInstitutionId(match.id)
      } else {
        setDetectedInstitutionId(null)
      }

      setIsDetecting(false)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeout)
  }, [name])

  // When institution is detected, auto-select it
  useEffect(() => {
    if (detectedInstitutionId) {
      // Call the store action to load pre-configured data
      selectPreConfiguredInstitution(detectedInstitutionId)
      setSetupMode('preconfigured')
    } else if (name && name.trim().length >= 5) {
      // If no match but has meaningful input, switch to manual mode
      setSetupMode('manual')
    }
  }, [detectedInstitutionId, name, selectPreConfiguredInstitution, setSetupMode])

  // Sync form values to store in real-time for validation
  useEffect(() => {
    const subscription = watch((value) => {
      updateInstitutionData({
        name: value.name || '',
        contactEmail: value.contactEmail || '',
        contactPhone: value.contactPhone || '',
        website: value.website || '',
      })
    })
    return () => subscription.unsubscribe()
  }, [watch, updateInstitutionData])

  const onSubmit = async (data: InstitutionFormData) => {
    // TODO: Upload logo file to storage and get URL
    const logoUrl = logoFile ? 'placeholder-logo-url' : null

    updateInstitutionData({
      ...data,
      slug: generatedSlug,
      logoUrl,
    })

    nextStep()
  }

  // Get detected institution name for display
  const detectedInstitution = useMemo(() => {
    if (!detectedInstitutionId) return null
    const allInstitutions = getInstitutionList()
    return allInstitutions.find((inst) => inst.id === detectedInstitutionId)
  }, [detectedInstitutionId])

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-8">
        <div className="text-center mb-6 font-mono">
          <h3 className="text-lg font-semibold mb-2">
            <span className="text-syntax-export">const</span>
            <span className="text-syntax-key ml-2">institutionSetup</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="text-traffic-green">//</span> Enter your institution details
          </p>
        </div>

        <div className="space-y-4 p-6 border border-border rounded-lg bg-card">
          {/* Institution Name with Auto-Detection */}
          <div className="space-y-2">
            <SyntaxFormField
              name="name"
              label="name"
              placeholder="e.g., University of Pretoria"
              error={errors.name?.message}
              required
            />

            {/* Auto-Detection Indicator */}
            {detectedInstitution && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-syntax-key/10 border border-syntax-key/20">
                <Sparkles className="h-4 w-4 text-syntax-key" />
                <p className="font-mono text-xs text-syntax-key">
                  Pre-configured data available for <strong>{detectedInstitution.name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Slug Display (Read-Only) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-syntax-key">slug</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-syntax-string">
                {generatedSlug ? `"${generatedSlug}"` : '""'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-4 font-mono">
              <span className="text-traffic-green">//</span> Auto-generated from institution name (used in dashboard URL)
            </p>
          </div>

          <FileUploadField
            label="Institution Logo"
            name="logo"
            accept="image/*"
            maxSize={5}
            value={logoFile}
            onChange={setLogoFile}
            description="Upload your institution's logo (PNG, JPG, max 5MB)"
          />

          <SyntaxFormField
            name="contactEmail"
            label="contactEmail"
            type="email"
            placeholder="admin@institution.edu"
            error={errors.contactEmail?.message}
            required
          />

          <SyntaxFormField
            name="contactPhone"
            label="contactPhone"
            type="tel"
            placeholder="+27 12 345 6789"
            error={errors.contactPhone?.message}
            required
          />

          <SyntaxFormField
            name="website"
            label="website"
            type="url"
            placeholder="https://www.institution.edu"
            error={errors.website?.message}
          />
        </div>
      </form>
    </FormProvider>
  )
}
