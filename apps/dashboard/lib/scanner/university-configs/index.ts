/**
 * University Configuration Registry
 *
 * Central registry for all South African university configurations.
 * Used by the validator to check extracted items against known data.
 */

import type { UniversityConfig } from './types'

// Import all university configs
import { EDUVOS_CONFIG } from './eduvos'
import { UP_CONFIG } from './up'
import { UCT_CONFIG } from './uct'
import { WITS_CONFIG } from './wits'
import { SUN_CONFIG } from './sun'
import { UKZN_CONFIG } from './ukzn'
import { UJ_CONFIG } from './uj'
import { UFS_CONFIG } from './ufs'
import { RHODES_CONFIG } from './rhodes'
import { NWU_CONFIG } from './nwu'
import { UWC_CONFIG } from './uwc'
import { UNISA_CONFIG } from './unisa'
import { UL_CONFIG } from './ul'
import { UNIVEN_CONFIG } from './univen'
import { UNIZULU_CONFIG } from './unizulu'
import { UFH_CONFIG } from './ufh'
import { WSU_CONFIG } from './wsu'
import { NMU_CONFIG } from './nmu'
import { SMU_CONFIG } from './smu'
import { SPU_CONFIG } from './spu'
import { UMP_CONFIG } from './ump'
import { CPUT_CONFIG } from './cput'
import { CUT_CONFIG } from './cut'
import { DUT_CONFIG } from './dut'
import { MUT_CONFIG } from './mut'
import { TUT_CONFIG } from './tut'
import { VUT_CONFIG } from './vut'

// All configs array
export const ALL_CONFIGS: UniversityConfig[] = [
  // Private colleges (priority)
  EDUVOS_CONFIG,
  // Traditional universities
  UP_CONFIG,
  UCT_CONFIG,
  WITS_CONFIG,
  SUN_CONFIG,
  UKZN_CONFIG,
  UJ_CONFIG,
  UFS_CONFIG,
  RHODES_CONFIG,
  NWU_CONFIG,
  UWC_CONFIG,
  UNISA_CONFIG,
  // Comprehensive universities
  UL_CONFIG,
  UNIVEN_CONFIG,
  UNIZULU_CONFIG,
  UFH_CONFIG,
  WSU_CONFIG,
  NMU_CONFIG,
  // New universities
  SMU_CONFIG,
  SPU_CONFIG,
  UMP_CONFIG,
  // Universities of Technology
  CPUT_CONFIG,
  CUT_CONFIG,
  DUT_CONFIG,
  MUT_CONFIG,
  TUT_CONFIG,
  VUT_CONFIG,
]

// Domain to config lookup map
const domainConfigMap: Map<string, UniversityConfig> = new Map()

// Build lookup map
for (const config of ALL_CONFIGS) {
  for (const domain of config.domains) {
    domainConfigMap.set(domain.toLowerCase(), config)
    // Also add without www prefix
    if (domain.startsWith('www.')) {
      domainConfigMap.set(domain.slice(4).toLowerCase(), config)
    } else {
      domainConfigMap.set(`www.${domain}`.toLowerCase(), config)
    }
  }
}

/**
 * Get university config by website URL or domain
 */
export function getUniversityConfig(
  urlOrDomain: string
): UniversityConfig | null {
  try {
    // Extract hostname from URL
    let hostname: string
    if (urlOrDomain.includes('://')) {
      hostname = new URL(urlOrDomain).hostname.toLowerCase()
    } else {
      hostname = urlOrDomain.toLowerCase()
    }

    // Remove www prefix for lookup
    const withoutWww = hostname.replace(/^www\./, '')

    // Try exact match
    if (domainConfigMap.has(hostname)) {
      return domainConfigMap.get(hostname) || null
    }

    // Try without www
    if (domainConfigMap.has(withoutWww)) {
      return domainConfigMap.get(withoutWww) || null
    }

    // Try subdomain matching (e.g., study.up.ac.za -> up.ac.za)
    const parts = hostname.split('.')
    while (parts.length > 2) {
      parts.shift()
      const domain = parts.join('.')
      if (domainConfigMap.has(domain)) {
        return domainConfigMap.get(domain) || null
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a URL belongs to a known university
 */
export function isKnownUniversity(urlOrDomain: string): boolean {
  return getUniversityConfig(urlOrDomain) !== null
}

/**
 * Get all configs by type
 */
export function getConfigsByType(
  type: UniversityConfig['type']
): UniversityConfig[] {
  return ALL_CONFIGS.filter((c) => c.type === type)
}

// Re-export types
export type { UniversityConfig, FacultyConfig, CampusConfig } from './types'

// Re-export individual configs for direct access
export {
  EDUVOS_CONFIG,
  UP_CONFIG,
  UCT_CONFIG,
  WITS_CONFIG,
  SUN_CONFIG,
  UKZN_CONFIG,
  UJ_CONFIG,
  UFS_CONFIG,
  RHODES_CONFIG,
  NWU_CONFIG,
  UWC_CONFIG,
  UNISA_CONFIG,
  UL_CONFIG,
  UNIVEN_CONFIG,
  UNIZULU_CONFIG,
  UFH_CONFIG,
  WSU_CONFIG,
  NMU_CONFIG,
  SMU_CONFIG,
  SPU_CONFIG,
  UMP_CONFIG,
  CPUT_CONFIG,
  CUT_CONFIG,
  DUT_CONFIG,
  MUT_CONFIG,
  TUT_CONFIG,
  VUT_CONFIG,
}
