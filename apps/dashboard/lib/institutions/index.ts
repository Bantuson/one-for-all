/**
 * Pre-Configured Institution Registry
 *
 * Central registry for all South African institution configurations.
 * Used by the setup wizard to provide pre-populated dashboard data.
 */

import type {
  PreConfiguredInstitution,
  InstitutionListItem,
  InstitutionType,
} from './types'

// Import institution data files
import { UP_DATA } from './data/up'
import { UCT_DATA } from './data/uct'
import { WITS_DATA } from './data/wits'
import { SUN_DATA } from './data/sun'
import { EDUVOS_DATA } from './data/eduvos'
import { UJ_DATA } from './data/uj'
import { UKZN_DATA } from './data/ukzn'
import { NWU_DATA } from './data/nwu'
import { UFS_DATA } from './data/ufs'
import { NMU_DATA } from './data/nmu'
// New institutions
import { TUT_DATA } from './data/tut'
import { VUT_DATA } from './data/vut'
import { UWC_DATA } from './data/uwc'
import { WSU_DATA } from './data/wsu'
import { CPUT_DATA } from './data/cput'

/**
 * All pre-configured institutions
 * Add new institutions here as they're researched
 */
export const ALL_INSTITUTIONS: PreConfiguredInstitution[] = [
  // Priority institutions (fully configured)
  UP_DATA,
  UCT_DATA,
  WITS_DATA,
  SUN_DATA,
  EDUVOS_DATA,
  // Additional popular universities
  UJ_DATA,
  UKZN_DATA,
  NWU_DATA,
  UFS_DATA,
  NMU_DATA,
  // New priority institutions
  TUT_DATA,
  VUT_DATA,
  UWC_DATA,
  WSU_DATA,
  CPUT_DATA,
]

/**
 * Quick lookup map by ID
 */
const institutionMap = new Map<string, PreConfiguredInstitution>()
for (const inst of ALL_INSTITUTIONS) {
  institutionMap.set(inst.id, inst)
}

/**
 * Get institution by ID
 */
export function getInstitutionById(
  id: string
): PreConfiguredInstitution | null {
  return institutionMap.get(id) || null
}

/**
 * Get all institutions as list items (for dropdown/search)
 */
export function getInstitutionList(): InstitutionListItem[] {
  return ALL_INSTITUTIONS.map((inst) => ({
    id: inst.id,
    name: inst.name,
    shortName: inst.shortName,
    type: inst.type,
    city: inst.city,
    province: inst.province,
    stats: inst.stats,
  }))
}

/**
 * Get institutions filtered by type
 */
export function getInstitutionsByType(
  type: InstitutionType
): InstitutionListItem[] {
  return getInstitutionList().filter((inst) => inst.type === type)
}

/**
 * Search institutions by name (case-insensitive)
 */
export function searchInstitutions(query: string): InstitutionListItem[] {
  const lowerQuery = query.toLowerCase()
  return getInstitutionList().filter(
    (inst) =>
      inst.name.toLowerCase().includes(lowerQuery) ||
      inst.shortName.toLowerCase().includes(lowerQuery) ||
      inst.city.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get institution grouped by type (for categorized dropdown)
 */
export function getInstitutionsGroupedByType(): Record<
  InstitutionType,
  InstitutionListItem[]
> {
  const grouped: Record<InstitutionType, InstitutionListItem[]> = {
    university: [],
    college: [],
    nsfas: [],
    bursary_provider: [],
  }

  for (const inst of getInstitutionList()) {
    grouped[inst.type].push(inst)
  }

  return grouped
}

/**
 * Check if an institution ID exists
 */
export function isKnownInstitution(id: string): boolean {
  return institutionMap.has(id)
}

// Re-export types
export type {
  PreConfiguredInstitution,
  PreConfiguredCampus,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  InstitutionListItem,
  InstitutionType,
  CourseLevel,
  CourseRequirements,
} from './types'
