/**
 * LocalStorage helper utilities for form state persistence
 * Used primarily for multi-step forms to prevent data loss during navigation
 */

export interface CampusWizardData {
  currentStep: number
  campusInfo?: {
    name: string
    code: string
    street: string
    city: string
    province: string
    postalCode: string
  }
  faculties?: Array<{
    id: string
    name: string
    code: string
    description: string
  }>
  courses?: Record<
    string,
    Array<{
      id: string
      name: string
      code: string
      requirements: string
      status: 'draft' | 'active' | 'inactive'
    }>
  >
  teamMembers?: Array<{
    id: string
    email: string
    role: string
    permissions: string[]
  }>
}

/**
 * Save campus wizard data to localStorage
 */
export function saveCampusWizardData(
  institutionSlug: string,
  data: CampusWizardData
): void {
  try {
    const key = `campus-wizard-${institutionSlug}`
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save campus wizard data:', error)
  }
}

/**
 * Load campus wizard data from localStorage
 */
export function loadCampusWizardData(
  institutionSlug: string
): CampusWizardData | null {
  try {
    const key = `campus-wizard-${institutionSlug}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Failed to load campus wizard data:', error)
    return null
  }
}

/**
 * Clear campus wizard data from localStorage
 */
export function clearCampusWizardData(institutionSlug: string): void {
  try {
    const key = `campus-wizard-${institutionSlug}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear campus wizard data:', error)
  }
}

/**
 * Check if there's saved wizard data for the institution
 */
export function hasSavedWizardData(institutionSlug: string): boolean {
  try {
    const key = `campus-wizard-${institutionSlug}`
    return localStorage.getItem(key) !== null
  } catch (error) {
    console.error('Failed to check saved wizard data:', error)
    return false
  }
}

/**
 * Generic localStorage helpers
 */

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Failed to save data to localStorage (key: ${key}):`, error)
  }
}

export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error(`Failed to load data from localStorage (key: ${key}):`, error)
    return null
  }
}

export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(
      `Failed to remove data from localStorage (key: ${key}):`,
      error
    )
  }
}
