/**
 * Extraction Validator
 *
 * Validates extracted faculty, campus, and course names against
 * known university configurations and generic patterns.
 */

import { getUniversityConfig } from './university-configs'
import type { ValidationResult } from './university-configs/types'

// Invalid patterns that should NEVER be accepted as faculty names
const INVALID_FACULTY_PATTERNS = [
  /^home$/i,
  /^about$/i,
  /^about us$/i,
  /^contact$/i,
  /^contact us$/i,
  /^apply$/i,
  /^apply now$/i,
  /^login$/i,
  /^sign in$/i,
  /^register$/i,
  /^faculties$/i,
  /^schools$/i,
  /^departments$/i,
  /^undergraduate$/i,
  /^postgraduate$/i,
  /^programmes?$/i,
  /^courses?$/i,
  /^qualifications?$/i,
  /^news$/i,
  /^events$/i,
  /^research$/i,
  /^library$/i,
  /^student life$/i,
  /^campus.*campus/i, // "Faculty of Safety Campus" garbage
  /safety campus/i,
  /^\s*$/,
  /^menu$/i,
  /^search$/i,
  /^close$/i,
]

// Invalid patterns for campus names
const INVALID_CAMPUS_PATTERNS = [
  /^virtual campus$/i,
  /^online campus$/i,
  /^digital campus$/i,
  /^e-campus$/i,
  /faculty.*campus/i, // "Faculty of X Campus" is garbage
  /school.*campus/i,
  /^main$/i, // Just "Main" without "Campus"
  /^\s*$/,
]

// Invalid patterns for course names
const INVALID_COURSE_PATTERNS = [
  /^undergraduate$/i,
  /^postgraduate$/i,
  /^programmes?$/i,
  /^courses?$/i,
  /^qualifications?$/i,
  /^apply now$/i,
  /^apply$/i,
  /^read more$/i,
  /^learn more$/i,
  /^view all$/i,
  /^see all$/i,
  /^home$/i,
  /^back$/i,
  /^\d+$/,
  /^\s*$/,
]

// Required structural words for faculty names
const FACULTY_STRUCTURAL_WORDS = [
  'faculty',
  'school',
  'college',
  'department',
  'institute',
  'centre',
  'center',
]

// Academic disciplines commonly found in faculty names
const ACADEMIC_DISCIPLINES = [
  'engineering',
  'science',
  'sciences',
  'humanities',
  'commerce',
  'law',
  'medicine',
  'health',
  'education',
  'arts',
  'natural',
  'agriculture',
  'agricultural',
  'veterinary',
  'theology',
  'religion',
  'business',
  'management',
  'economic',
  'economics',
  'accounting',
  'information',
  'technology',
  'computing',
  'computer',
  'it',
  'social',
  'built environment',
  'architecture',
  'design',
  'media',
  'communication',
  'nursing',
  'pharmacy',
  'dentistry',
  'optometry',
  'hospitality',
  'tourism',
  'sport',
  'creative',
]

// Degree indicators for course validation
const DEGREE_INDICATORS = [
  /^bachelor/i,
  /^master/i,
  /^doctor/i,
  /^phd/i,
  /^diploma/i,
  /^certificate/i,
  /^honours/i,
  /^honor/i,
  /^b\.?sc\b/i,
  /^b\.?a\b/i,
  /^b\.?com/i,
  /^b\.?eng/i,
  /^b\.?tech/i,
  /^b\.?ed/i,
  /^b\.?bus/i,
  /^b\.?acc/i,
  /^m\.?sc\b/i,
  /^m\.?a\b/i,
  /^m\.?com/i,
  /^m\.?eng/i,
  /^m\.?tech/i,
  /^m\.?ed/i,
  /^m\.?bus/i,
  /^m\.?b\.?a/i,
  /^llb/i,
  /^llm/i,
  /^mb\.?ch\.?b/i,
  /^b\.?pharm/i,
  /^nd\b/i, // National Diploma
  /^hnd\b/i, // Higher National Diploma
  /^pgdip/i, // Postgraduate Diploma
  /^advanced certificate/i,
  /^higher certificate/i,
]

/**
 * Validate a faculty name
 */
export function validateFacultyName(
  name: string,
  websiteUrl: string
): ValidationResult {
  const normalized = name.toLowerCase().trim()

  // Rule 1: Reject known invalid patterns
  for (const pattern of INVALID_FACULTY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Matches invalid pattern: ${pattern}`,
      }
    }
  }

  // Rule 2: Check length
  if (name.length < 10 || name.length > 150) {
    return {
      isValid: false,
      confidence: 0.1,
      reason: `Name length out of range (${name.length} chars)`,
    }
  }

  // Rule 3: Must have structural word
  const hasStructuralWord = FACULTY_STRUCTURAL_WORDS.some((word) =>
    normalized.includes(word)
  )

  // Rule 4: Should have academic discipline
  const hasDiscipline = ACADEMIC_DISCIPLINES.some((disc) =>
    normalized.includes(disc)
  )

  // Rule 5: Check against known config
  const config = getUniversityConfig(websiteUrl)
  if (config) {
    // Exact match
    const exactMatch = config.faculties.find(
      (f) => f.name.toLowerCase() === normalized
    )
    if (exactMatch) {
      return {
        isValid: true,
        confidence: 1.0,
        correctedValue: exactMatch.name,
        matchedConfig: exactMatch,
      }
    }

    // Alias match
    const aliasMatch = config.faculties.find((f) =>
      f.aliases?.some((a) => a.toLowerCase() === normalized)
    )
    if (aliasMatch) {
      return {
        isValid: true,
        confidence: 0.95,
        correctedValue: aliasMatch.name,
        matchedConfig: aliasMatch,
      }
    }

    // Partial match (discipline part)
    const partialMatch = config.faculties.find((f) => {
      const configNorm = f.name.toLowerCase()
      // Extract discipline from "Faculty of X" pattern
      const disciplinePart = configNorm.replace(
        /^(faculty|school|college|department|institute)\s+(of\s+)?/i,
        ''
      )
      return (
        normalized.includes(disciplinePart) ||
        disciplinePart.includes(normalized.replace(/^faculty of /i, ''))
      )
    })
    if (partialMatch) {
      return {
        isValid: true,
        confidence: 0.85,
        correctedValue: partialMatch.name,
        matchedConfig: partialMatch,
      }
    }
  }

  // No config match - use generic rules
  if (!hasStructuralWord) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: 'Missing structural word (Faculty/School/College/etc)',
    }
  }

  if (!hasDiscipline) {
    return {
      isValid: false,
      confidence: 0.3,
      reason: 'No recognized academic discipline',
    }
  }

  // Passes generic validation
  return {
    isValid: true,
    confidence: 0.7,
  }
}

/**
 * Validate a campus name
 */
export function validateCampusName(
  name: string,
  websiteUrl: string
): ValidationResult {
  const normalized = name.toLowerCase().trim()

  // Rule 1: Reject known invalid patterns
  for (const pattern of INVALID_CAMPUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Matches invalid pattern: ${pattern}`,
      }
    }
  }

  // Rule 2: Check length
  if (name.length < 5 || name.length > 100) {
    return {
      isValid: false,
      confidence: 0.1,
      reason: `Name length out of range (${name.length} chars)`,
    }
  }

  // Rule 3: Check against known config
  const config = getUniversityConfig(websiteUrl)
  if (config) {
    // Exact match
    const exactMatch = config.campuses.find(
      (c) => c.name.toLowerCase() === normalized
    )
    if (exactMatch) {
      return {
        isValid: true,
        confidence: 1.0,
        correctedValue: exactMatch.name,
        matchedConfig: exactMatch,
      }
    }

    // Alias match
    const aliasMatch = config.campuses.find((c) =>
      c.aliases?.some((a) => a.toLowerCase() === normalized)
    )
    if (aliasMatch) {
      return {
        isValid: true,
        confidence: 0.95,
        correctedValue: aliasMatch.name,
        matchedConfig: aliasMatch,
      }
    }

    // Match without "Campus" suffix
    const withoutSuffix = normalized.replace(/\s*campus$/i, '')
    const suffixMatch = config.campuses.find((c) => {
      const configWithoutSuffix = c.name.toLowerCase().replace(/\s*campus$/i, '')
      return configWithoutSuffix === withoutSuffix
    })
    if (suffixMatch) {
      return {
        isValid: true,
        confidence: 0.9,
        correctedValue: suffixMatch.name,
        matchedConfig: suffixMatch,
      }
    }
  }

  // Rule 4: Must contain "Campus" or be a city/location name
  const hasCampus = normalized.includes('campus')
  if (!hasCampus) {
    // Could be just a location name like "Hatfield" or "Mamelodi"
    // Lower confidence without "Campus" suffix
    return {
      isValid: true,
      confidence: 0.5,
      reason: 'No "Campus" suffix - might be location name only',
    }
  }

  // Passes generic validation
  return {
    isValid: true,
    confidence: 0.7,
  }
}

/**
 * Validate a course/programme name
 */
export function validateCourseName(name: string): ValidationResult {
  const normalized = name.toLowerCase().trim()

  // Rule 1: Reject known invalid patterns
  for (const pattern of INVALID_COURSE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isValid: false,
        confidence: 0,
        reason: `Matches invalid pattern: ${pattern}`,
      }
    }
  }

  // Rule 2: Check length
  if (name.length < 5 || name.length > 250) {
    return {
      isValid: false,
      confidence: 0.1,
      reason: `Name length out of range (${name.length} chars)`,
    }
  }

  // Rule 3: Must have degree indicator
  const hasDegreeIndicator = DEGREE_INDICATORS.some((pattern) =>
    pattern.test(normalized)
  )

  if (!hasDegreeIndicator) {
    // Could still be valid if it contains discipline words
    const hasDiscipline = ACADEMIC_DISCIPLINES.some((disc) =>
      normalized.includes(disc)
    )

    if (hasDiscipline) {
      return {
        isValid: true,
        confidence: 0.5,
        reason: 'Has discipline but no degree indicator',
      }
    }

    return {
      isValid: false,
      confidence: 0.2,
      reason: 'No degree indicator (Bachelor/Master/Diploma/etc)',
    }
  }

  // High confidence if has degree indicator
  return {
    isValid: true,
    confidence: 0.85,
  }
}

/**
 * Validate and clean an extracted item
 */
export function validateAndClean(
  type: 'faculty' | 'campus' | 'course',
  name: string,
  websiteUrl: string
): ValidationResult {
  switch (type) {
    case 'faculty':
      return validateFacultyName(name, websiteUrl)
    case 'campus':
      return validateCampusName(name, websiteUrl)
    case 'course':
      return validateCourseName(name)
    default:
      return { isValid: false, confidence: 0, reason: 'Unknown type' }
  }
}
