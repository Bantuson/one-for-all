'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { CommandButton } from '@/components/ui/CommandButton'
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

// JSON-style label component
function SyntaxLabel({ name, required }: { name: string; required?: boolean }) {
  return (
    <label className="block font-mono text-sm mb-1.5">
      <span className="text-syntax-key">"{name}"</span>
      <span className="text-foreground"> :</span>
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  )
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
      {/* Header - Code Style */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-5 w-5 text-syntax-key" />
        <h2 className="font-mono text-lg">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">Campus Information</span>
        </h2>
      </div>

      <p className="font-mono text-xs text-traffic-green mb-6">
        // Provide basic information about your campus
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campus Name */}
        <div className="space-y-1">
          <SyntaxLabel name="Campus Name" required />
          <Input
            id="name"
            placeholder="Main Campus"
            className="font-mono"
            {...register('name')}
          />
          {errors.name && (
            <p className="font-mono text-xs text-destructive">// Error: {errors.name.message}</p>
          )}
        </div>

        {/* Campus Code */}
        <div className="space-y-1">
          <SyntaxLabel name="Campus Code" required />
          <Input
            id="code"
            placeholder="MC"
            className="font-mono uppercase"
            {...register('code')}
          />
          {errors.code ? (
            <p className="font-mono text-xs text-destructive">// Error: {errors.code.message}</p>
          ) : (
            <p className="font-mono text-xs text-traffic-green">// A short unique identifier</p>
          )}
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="font-mono text-sm text-traffic-green">// Campus Address</h3>

        <div className="space-y-1">
          <SyntaxLabel name="Street Address" required />
          <Input
            id="street"
            placeholder="123 University Avenue"
            className="font-mono"
            {...register('street')}
          />
          {errors.street && (
            <p className="font-mono text-xs text-destructive">// Error: {errors.street.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <SyntaxLabel name="City" required />
            <Input
              id="city"
              placeholder="Pretoria"
              className="font-mono"
              {...register('city')}
            />
            {errors.city && (
              <p className="font-mono text-xs text-destructive">// Error: {errors.city.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <SyntaxLabel name="Province" required />
            <Input
              id="province"
              placeholder="Gauteng"
              className="font-mono"
              {...register('province')}
            />
            {errors.province && (
              <p className="font-mono text-xs text-destructive">// Error: {errors.province.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <SyntaxLabel name="Postal Code" required />
            <Input
              id="postalCode"
              placeholder="0002"
              className="font-mono"
              {...register('postalCode')}
            />
            {errors.postalCode && (
              <p className="font-mono text-xs text-destructive">// Error: {errors.postalCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons - Command Style */}
      <div className="flex justify-between pt-6 border-t border-border">
        <CommandButton
          type="button"
          command="cancel"
          variant="ghost"
          onClick={onCancel}
        />
        <CommandButton
          type="submit"
          command="next --faculties"
          variant="primary"
          arrow
        />
      </div>
    </form>
  )
}
