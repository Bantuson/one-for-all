'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { FormField } from '@/components/ui/FormField'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'

const institutionSchema = z.object({
  name: z.string().min(3, 'Institution name must be at least 3 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
})

type InstitutionFormData = z.infer<typeof institutionSchema>

export function InstitutionDetails() {
  const { institutionData, updateInstitutionData, nextStep, prevStep } = useRegistrationStore()
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const methods = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institutionData.name,
      slug: institutionData.slug,
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

  // Auto-generate slug from name
  const name = watch('name')
  const slug = watch('slug')

  useEffect(() => {
    // Only auto-generate slug if name exists and slug is empty
    if (name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      methods.setValue('slug', generatedSlug)
    }
  }, [name, slug, methods])

  const onSubmit = async (data: InstitutionFormData) => {
    // TODO: Upload logo file to storage and get URL
    const logoUrl = logoFile ? 'placeholder-logo-url' : null

    updateInstitutionData({
      ...data,
      logoUrl,
    })

    nextStep()
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Institution Details</h3>
          <p className="text-sm text-foreground/60">
            Provide information about your institution
          </p>
        </div>

        <div className="space-y-4">
          <FormField
            name="name"
            label="Institution Name"
            placeholder="e.g., University of Cape Town"
            error={errors.name?.message}
          />

          <FormField
            name="slug"
            label="URL Slug"
            placeholder="e.g., university-of-cape-town"
            description="This will be used in your institution's dashboard URL"
            error={errors.slug?.message}
          />

          <FileUploadField
            label="Institution Logo"
            name="logo"
            accept="image/*"
            maxSize={5}
            value={logoFile}
            onChange={setLogoFile}
            description="Upload your institution's logo (PNG, JPG, max 5MB)"
          />

          <FormField
            name="contactEmail"
            label="Contact Email"
            type="email"
            placeholder="admin@institution.edu"
            error={errors.contactEmail?.message}
          />

          <FormField
            name="contactPhone"
            label="Contact Phone"
            type="tel"
            placeholder="+27 12 345 6789"
            error={errors.contactPhone?.message}
          />

          <FormField
            name="website"
            label="Website (Optional)"
            type="url"
            placeholder="https://www.institution.edu"
            error={errors.website?.message}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={prevStep}>
            ← Back
          </Button>
          <Button type="submit">Continue →</Button>
        </div>
      </form>
    </FormProvider>
  )
}
