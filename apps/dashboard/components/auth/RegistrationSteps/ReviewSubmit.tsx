'use client'

import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { Button } from '@/components/ui/Button'
import { Building2, Mail, Phone, Globe, Hash, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export function ReviewSubmit() {
  const { institutionData, institutionType, prevStep, reset } = useRegistrationStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()

  const handleSubmit = async () => {
    // Guard: Ensure user is authenticated
    if (!isSignedIn) {
      setError('You must be signed in to create an institution. Please refresh and try again.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call Supabase API to create institution
      const response = await fetch('/api/institutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: institutionData.name,
          type: institutionType,
          contact_email: institutionData.contactEmail,
          contact_phone: institutionData.contactPhone,
          website: institutionData.website,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create institution')
      }

      // Mark onboarding as complete in database
      await fetch('/api/users/complete-onboarding', {
        method: 'POST',
      })

      // Reset registration state
      reset()

      // Force clear localStorage to prevent state resurrection
      if (typeof window !== 'undefined') {
        localStorage.removeItem('registration-storage')
      }

      // Navigate to dashboard
      router.push(`/dashboard/${data.institution.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create institution')
    } finally {
      setIsSubmitting(false)
    }
  }

  const institutionTypeLabels = {
    university: 'University',
    college: 'College',
    nsfas: 'NSFAS',
    bursary_provider: 'Bursary Provider',
  }

  // Show warning if not authenticated
  if (isLoaded && !isSignedIn) {
    return (
      <div className="space-y-6 py-8">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-500 mb-1">Authentication Required</h3>
              <p className="text-sm text-foreground/70 mb-4">
                You must be signed in to complete registration. Please go back to Step 1 and sign in.
              </p>
              <Button onClick={prevStep} variant="outline">
                ← Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
        <p className="text-sm text-foreground/60">
          Please review your details before submitting
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-background p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="h-16 w-16 rounded-lg bg-foreground/5 flex items-center justify-center">
            {institutionData.logoUrl ? (
              <img
                src={institutionData.logoUrl}
                alt="Logo"
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <Building2 className="h-8 w-8 text-foreground/40" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{institutionData.name}</h4>
            <p className="text-sm text-foreground/60">
              {institutionTypeLabels[institutionType!]}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Hash className="h-5 w-5 text-foreground/40 mt-0.5" />
            <div>
              <p className="text-sm font-medium">URL Slug</p>
              <p className="text-sm text-foreground/60">{institutionData.slug}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-foreground/40 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Contact Email</p>
              <p className="text-sm text-foreground/60">{institutionData.contactEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-foreground/40 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Contact Phone</p>
              <p className="text-sm text-foreground/60">{institutionData.contactPhone}</p>
            </div>
          </div>

          {institutionData.website && (
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-foreground/40 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Website</p>
                <p className="text-sm text-foreground/60">{institutionData.website}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
          ← Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating Institution...' : 'Create Institution'}
        </Button>
      </div>
    </div>
  )
}
