/**
 * Pre-Configured Institution Registry
 *
 * Central registry for all South African institution configurations.
 * Uses lazy-loading to avoid bundling all institution data upfront.
 */

import type {
  PreConfiguredInstitution,
  InstitutionListItem,
  InstitutionType,
} from './types'

/**
 * Lightweight institution list for dropdowns and search.
 * Contains only the minimal data needed for UI display.
 * Full institution data is loaded on-demand via getInstitutionById().
 */
export const INSTITUTION_LIST: InstitutionListItem[] = [
  // Priority institutions (fully configured)
  {
    id: 'up',
    name: 'University of Pretoria',
    shortName: 'UP',
    type: 'university',
    city: 'Pretoria',
    province: 'Gauteng',
    stats: { totalCampuses: 6, totalFaculties: 10, totalCourses: 200 },
  },
  {
    id: 'uct',
    name: 'University of Cape Town',
    shortName: 'UCT',
    type: 'university',
    city: 'Cape Town',
    province: 'Western Cape',
    stats: { totalCampuses: 6, totalFaculties: 6, totalCourses: 150 },
  },
  {
    id: 'wits',
    name: 'University of the Witwatersrand',
    shortName: 'Wits',
    type: 'university',
    city: 'Johannesburg',
    province: 'Gauteng',
    stats: { totalCampuses: 5, totalFaculties: 5, totalCourses: 140 },
  },
  {
    id: 'sun',
    name: 'Stellenbosch University',
    shortName: 'SUN',
    type: 'university',
    city: 'Stellenbosch',
    province: 'Western Cape',
    stats: { totalCampuses: 5, totalFaculties: 10, totalCourses: 180 },
  },
  {
    id: 'eduvos',
    name: 'Eduvos',
    shortName: 'Eduvos',
    type: 'college',
    city: 'Johannesburg',
    province: 'Gauteng',
    stats: { totalCampuses: 11, totalFaculties: 4, totalCourses: 50 },
  },
  // Additional popular universities
  {
    id: 'uj',
    name: 'University of Johannesburg',
    shortName: 'UJ',
    type: 'university',
    city: 'Johannesburg',
    province: 'Gauteng',
    stats: { totalCampuses: 4, totalFaculties: 9, totalCourses: 160 },
  },
  {
    id: 'ukzn',
    name: 'University of KwaZulu-Natal',
    shortName: 'UKZN',
    type: 'university',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    stats: { totalCampuses: 5, totalFaculties: 4, totalCourses: 120 },
  },
  {
    id: 'nwu',
    name: 'North-West University',
    shortName: 'NWU',
    type: 'university',
    city: 'Potchefstroom',
    province: 'North West',
    stats: { totalCampuses: 3, totalFaculties: 8, totalCourses: 140 },
  },
  {
    id: 'ufs',
    name: 'University of the Free State',
    shortName: 'UFS',
    type: 'university',
    city: 'Bloemfontein',
    province: 'Free State',
    stats: { totalCampuses: 3, totalFaculties: 7, totalCourses: 130 },
  },
  {
    id: 'nmu',
    name: 'Nelson Mandela University',
    shortName: 'NMU',
    type: 'university',
    city: 'Gqeberha',
    province: 'Eastern Cape',
    stats: { totalCampuses: 7, totalFaculties: 7, totalCourses: 110 },
  },
  // New priority institutions
  {
    id: 'tut',
    name: 'Tshwane University of Technology',
    shortName: 'TUT',
    type: 'university',
    city: 'Pretoria',
    province: 'Gauteng',
    stats: { totalCampuses: 6, totalFaculties: 7, totalCourses: 150 },
  },
  {
    id: 'vut',
    name: 'Vaal University of Technology',
    shortName: 'VUT',
    type: 'university',
    city: 'Vanderbijlpark',
    province: 'Gauteng',
    stats: { totalCampuses: 4, totalFaculties: 4, totalCourses: 80 },
  },
  {
    id: 'uwc',
    name: 'University of the Western Cape',
    shortName: 'UWC',
    type: 'university',
    city: 'Cape Town',
    province: 'Western Cape',
    stats: { totalCampuses: 1, totalFaculties: 7, totalCourses: 100 },
  },
  {
    id: 'wsu',
    name: 'Walter Sisulu University',
    shortName: 'WSU',
    type: 'university',
    city: 'Mthatha',
    province: 'Eastern Cape',
    stats: { totalCampuses: 4, totalFaculties: 4, totalCourses: 90 },
  },
  {
    id: 'cput',
    name: 'Cape Peninsula University of Technology',
    shortName: 'CPUT',
    type: 'university',
    city: 'Cape Town',
    province: 'Western Cape',
    stats: { totalCampuses: 6, totalFaculties: 6, totalCourses: 120 },
  },
]

/**
 * Dynamic import map for institution data files.
 * This enables code-splitting - data is only loaded when requested.
 */
const institutionImportMap: Record<
  string,
  () => Promise<{ default?: PreConfiguredInstitution } & Record<string, PreConfiguredInstitution>>
> = {
  up: () => import('./data/up').then((m) => ({ UP_DATA: m.UP_DATA })),
  uct: () => import('./data/uct').then((m) => ({ UCT_DATA: m.UCT_DATA })),
  wits: () => import('./data/wits').then((m) => ({ WITS_DATA: m.WITS_DATA })),
  sun: () => import('./data/sun').then((m) => ({ SUN_DATA: m.SUN_DATA })),
  eduvos: () => import('./data/eduvos').then((m) => ({ EDUVOS_DATA: m.EDUVOS_DATA })),
  uj: () => import('./data/uj').then((m) => ({ UJ_DATA: m.UJ_DATA })),
  ukzn: () => import('./data/ukzn').then((m) => ({ UKZN_DATA: m.UKZN_DATA })),
  nwu: () => import('./data/nwu').then((m) => ({ NWU_DATA: m.NWU_DATA })),
  ufs: () => import('./data/ufs').then((m) => ({ UFS_DATA: m.UFS_DATA })),
  nmu: () => import('./data/nmu').then((m) => ({ NMU_DATA: m.NMU_DATA })),
  tut: () => import('./data/tut').then((m) => ({ TUT_DATA: m.TUT_DATA })),
  vut: () => import('./data/vut').then((m) => ({ VUT_DATA: m.VUT_DATA })),
  uwc: () => import('./data/uwc').then((m) => ({ UWC_DATA: m.UWC_DATA })),
  wsu: () => import('./data/wsu').then((m) => ({ WSU_DATA: m.WSU_DATA })),
  cput: () => import('./data/cput').then((m) => ({ CPUT_DATA: m.CPUT_DATA })),
}

/**
 * Cache for loaded institution data to avoid re-importing
 */
const institutionCache = new Map<string, PreConfiguredInstitution>()

/**
 * Get full institution data by ID (async, lazy-loaded)
 * This is the primary method for fetching complete institution configuration.
 */
export async function getInstitutionById(
  id: string
): Promise<PreConfiguredInstitution | null> {
  // Check cache first
  if (institutionCache.has(id)) {
    return institutionCache.get(id)!
  }

  // Check if institution exists
  const importFn = institutionImportMap[id]
  if (!importFn) {
    return null
  }

  try {
    // Dynamically import the data
    const module = await importFn()
    // Extract the data (named export pattern: UP_DATA, UCT_DATA, etc.)
    const exportName = `${id.toUpperCase()}_DATA`
    const data = module[exportName] as PreConfiguredInstitution | undefined

    if (data) {
      institutionCache.set(id, data)
      return data
    }

    return null
  } catch (error) {
    console.error(`Failed to load institution data for ${id}:`, error)
    return null
  }
}

/**
 * Get all institutions as list items (for dropdown/search)
 * Uses the lightweight static list - no dynamic imports.
 */
export function getInstitutionList(): InstitutionListItem[] {
  return INSTITUTION_LIST
}

/**
 * Get institutions filtered by type
 */
export function getInstitutionsByType(
  type: InstitutionType
): InstitutionListItem[] {
  return INSTITUTION_LIST.filter((inst) => inst.type === type)
}

/**
 * Search institutions by name (case-insensitive)
 */
export function searchInstitutions(query: string): InstitutionListItem[] {
  const lowerQuery = query.toLowerCase()
  return INSTITUTION_LIST.filter(
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

  for (const inst of INSTITUTION_LIST) {
    grouped[inst.type].push(inst)
  }

  return grouped
}

/**
 * Check if an institution ID exists
 */
export function isKnownInstitution(id: string): boolean {
  return id in institutionImportMap
}

/**
 * Preload institution data (useful for anticipated navigation)
 */
export function preloadInstitution(id: string): void {
  if (!institutionCache.has(id) && id in institutionImportMap) {
    // Fire and forget - just triggers the import
    getInstitutionById(id)
  }
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
