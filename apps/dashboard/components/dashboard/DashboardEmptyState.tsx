import { EmptyStatePrompt } from './EmptyStatePrompt'

interface DashboardEmptyStateProps {
  institutionId: string
  institutionSlug: string
}

export function DashboardEmptyState({
  institutionId: _institutionId,
  institutionSlug,
}: DashboardEmptyStateProps) {
  return (
    <EmptyStatePrompt
      title="Welcome to your dashboard!"
      description="Set up your institution's campuses, faculties, and courses to get started. Choose from pre-configured South African institutions or set up manually."
      actions={[
        {
          command: 'setup --dashboard',
          href: `/dashboard/${institutionSlug}/setup`,
          variant: 'primary',
        },
      ]}
      helpCommand="man institutions --list"
      helpText="View available institutions"
    />
  )
}

export default DashboardEmptyState
