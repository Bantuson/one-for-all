'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Building2 } from 'lucide-react'

const campusInfoSchema = z.object({
  name: z.string().min(2, 'Campus name must be at least 2 characters'),
  code: z.string().min(2, 'Campus code must be at least 2 characters'),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(4, 'Postal code must be at least 4 characters'),
})

export type CampusInfoFormData = z.infer<typeof campusInfoSchema>

interface CampusInfoStepProps {
  initialData?: CampusInfoFormData
  onNext: (data: CampusInfoFormData) => void
  onCancel: () => void
}

export function CampusInfoStep({
  initialData,
  onNext,
  onCancel,
}: CampusInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampusInfoFormData>({
    resolver: zodResolver(campusInfoSchema),
    defaultValues: initialData,
  })

  const onSubmit = (data: CampusInfoFormData) => {
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Campus Information</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Provide basic information about your campus. This will help identify and
        organize your institution's structure.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campus Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Campus Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Main Campus, North Campus"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Campus Code */}
        <div className="space-y-2">
          <Label htmlFor="code">
            Campus Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="code"
            placeholder="e.g., MC, NC, APK"
            {...register('code')}
          />
          {errors.code && (
            <p className="text-sm text-red-500">{errors.code.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            A short unique identifier for this campus
          </p>
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Campus Address</h3>

        <div className="space-y-2">
          <Label htmlFor="street">
            Street Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="street"
            placeholder="123 University Avenue"
            {...register('street')}
          />
          {errors.street && (
            <p className="text-sm text-red-500">{errors.street.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-red-500">*</span>
            </Label>
            <Input id="city" placeholder="Pretoria" {...register('city')} />
            {errors.city && (
              <p className="text-sm text-red-500">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-red-500">*</span>
            </Label>
            <Input
              id="province"
              placeholder="Gauteng"
              {...register('province')}
            />
            {errors.province && (
              <p className="text-sm text-red-500">{errors.province.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">
              Postal Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="postalCode"
              placeholder="0002"
              {...register('postalCode')}
            />
            {errors.postalCode && (
              <p className="text-sm text-red-500">{errors.postalCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Next: Add Faculties</Button>
      </div>
    </form>
  )
}
