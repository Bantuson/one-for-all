import { Button } from '@/components/ui/Button'
import { Building2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface EmptyStatePromptProps {
  title: string
  description: string
  actions: Array<{
    label: string
    href: string
    variant?: 'default' | 'outline'
    icon?: React.ReactNode
  }>
}

export function EmptyStatePrompt({
  title,
  description,
  actions,
}: EmptyStatePromptProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-900 p-6">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {actions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant={action.variant || 'default'}
                className="w-full sm:w-auto"
              >
                {action.icon}
                {action.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Need help getting started?{' '}
          <a
            href="/docs/setup-guide"
            className="text-blue-600 hover:underline"
          >
            View setup guide
          </a>
        </p>
      </div>
    </div>
  )
}
