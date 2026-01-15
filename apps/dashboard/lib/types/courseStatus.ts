// Course status types for the dashboard
// These types map between database status and display status

export type CourseDbStatus = 'active' | 'inactive' | 'archived'
export type CourseComputedStatus = 'coming_soon' | 'open' | 'closed'
export type CourseDisplayStatus = 'coming_soon' | 'open' | 'closed'

/**
 * Gets the display status for a course based on its database status and computed status.
 *
 * Priority:
 * 1. If computed_status exists (dates are set), use it
 * 2. Otherwise, map the manual status to a display status
 *
 * @param status - The database status (active, inactive, archived)
 * @param computedStatus - The computed status based on dates (coming_soon, open, closed)
 * @returns The display status to show in the UI
 */
export function getCourseDisplayStatus(
  status: CourseDbStatus | null,
  computedStatus: CourseComputedStatus | null
): CourseDisplayStatus {
  // If computed_status exists (dates set), use it
  if (computedStatus) return computedStatus

  // Map manual status to display status
  switch (status) {
    case 'active':
      return 'open'
    case 'inactive':
    case 'archived':
      return 'closed'
    default:
      return 'open'
  }
}
