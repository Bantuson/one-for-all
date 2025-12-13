/**
 * LLM-First Extraction with Validation
 *
 * Uses DeepSeek as the PRIMARY extractor for university content.
 * Integrates with university configs for validation and correction.
 */

import { deepseek, isDeepSeekAvailable } from '@/lib/openai'
import { extractStructuredContent } from './html-extractor'
import {
  validateFacultyName,
  validateCampusName,
  validateCourseName,
} from './validator'
import { getUniversityConfig } from './university-configs'
import type { ScrapedPage, ScanResults, Campus, Faculty, Course } from './types'
import { generateId, generateCode } from './utils'

interface LLMExtractionResult {
  faculties: Array<{
    name: string
    description?: string
  }>
  courses: Array<{
    name: string
    code?: string
    faculty?: string
    description?: string
    duration?: number
  }>
  campuses: Array<{
    name: string
    location?: string
  }>
}

/**
 * LLM-First extraction from scraped pages.
 *
 * This is the PRIMARY extraction method - not just refinement.
 * Uses structured HTML content and validates against known university data.
 *
 * @param pages - Scraped pages to analyze
 * @param websiteUrl - Original website URL for config lookup
 * @returns Extracted and validated results
 */
export async function extractWithLLM(
  pages: ScrapedPage[],
  websiteUrl: string
): Promise<ScanResults | null> {
  if (!isDeepSeekAvailable() || !deepseek) {
    console.log('[LLM] DeepSeek not available')
    return null
  }

  try {
    // Get university config if available
    const config = getUniversityConfig(websiteUrl)
    console.log(
      `[LLM] University config ${config ? `found: ${config.shortName}` : 'not found'}`
    )

    // Extract structured content from pages using Cheerio
    const structuredPages = pages.map((p) => {
      const extracted = extractStructuredContent(p.html, p.url)
      return {
        url: p.url,
        title: p.title,
        type: p.pageType,
        headings: extracted.headings.slice(0, 20),
        sections: extracted.sections.slice(0, 10),
        links: extracted.links
          .filter((l) => isAcademicLink(l.href, l.text))
          .slice(0, 30)
          .map((l) => ({ text: l.text, href: l.href })),
        content: extracted.mainContent.slice(0, 2000),
      }
    })

    // Take most relevant pages
    const relevantPages = structuredPages
      .filter(
        (p) =>
          p.type === 'faculty' ||
          p.type === 'course' ||
          p.type === 'programme' ||
          p.type === 'campus' ||
          p.type === 'home' ||
          p.links.length > 5
      )
      .slice(0, 12)

    if (relevantPages.length === 0) {
      console.log('[LLM] No relevant pages found')
      return null
    }

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(config)
    const userPrompt = JSON.stringify(relevantPages, null, 2)

    console.log(`[LLM] Analyzing ${relevantPages.length} pages with DeepSeek`)

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log('[LLM] No response content')
      return null
    }

    const llmData = JSON.parse(content) as LLMExtractionResult
    console.log(
      `[LLM] Raw extraction: ${llmData.faculties?.length || 0} faculties, ${llmData.courses?.length || 0} courses, ${llmData.campuses?.length || 0} campuses`
    )

    // Validate and convert to ScanResults
    return validateAndConvertResults(llmData, websiteUrl, config)
  } catch (error) {
    console.error('[LLM] Extraction failed:', error)
    return null
  }
}

/**
 * Build a context-aware system prompt.
 *
 * If we have a university config, include known faculties/campuses
 * to help the LLM validate its extractions.
 */
function buildSystemPrompt(
  config: ReturnType<typeof getUniversityConfig>
): string {
  let prompt = `You are an expert at extracting academic structure from South African university websites.

TASK: Extract faculties, courses/programmes, and campuses from the provided page data.

IMPORTANT RULES:
1. ONLY extract actual academic entities - NOT navigation items, NOT page titles
2. Faculty names MUST include "Faculty of", "School of", "College of", or "Department of"
3. Course names MUST be actual qualifications like "Bachelor of...", "BSc...", "Diploma in..."
4. Campus names MUST be actual physical locations, NOT generic terms
5. REJECT garbage like "Faculty of Safety Campus", "Home", "About Us", etc.
6. Quality over quantity - only include items you're confident about

`

  if (config) {
    prompt += `
UNIVERSITY CONTEXT: ${config.name} (${config.shortName})
Type: ${config.type}

KNOWN FACULTIES (use these exact names if found):
${config.faculties.map((f) => `- ${f.name}`).join('\n')}

KNOWN CAMPUSES (use these exact names if found):
${config.campuses.map((c) => `- ${c.name}${c.location ? ` (${c.location})` : ''}`).join('\n')}

If you find content that matches a known faculty/campus, use the EXACT name from above.
`
  } else {
    prompt += `
COMMON SA UNIVERSITY PATTERNS:
- Faculties: "Faculty of Engineering", "School of Business", "College of Health Sciences"
- Courses: "Bachelor of Science", "BCom Accounting", "Diploma in IT", "LLB", "MB ChB"
- Campuses: Named locations like "Hatfield Campus", "Howard College Campus"
`
  }

  prompt += `
RESPONSE FORMAT:
Return a JSON object with:
{
  "faculties": [{ "name": "Faculty of X", "description": "optional" }],
  "courses": [{ "name": "Bachelor of Y", "code": "ABC123", "faculty": "Faculty of X", "duration": 3 }],
  "campuses": [{ "name": "Campus Name", "location": "City, Province" }]
}

Only include entities you find evidence for in the page content. Empty arrays are fine.`

  return prompt
}

/**
 * Validate LLM extractions and convert to ScanResults
 */
function validateAndConvertResults(
  llmData: LLMExtractionResult,
  websiteUrl: string,
  config: ReturnType<typeof getUniversityConfig>
): ScanResults {
  const validatedFaculties: Faculty[] = []
  const validatedCourses: Course[] = []
  const validatedCampuses: Campus[] = []

  // Validate faculties
  for (const faculty of llmData.faculties || []) {
    if (!faculty.name) continue

    const validation = validateFacultyName(faculty.name, websiteUrl)

    if (validation.isValid && validation.confidence >= 0.5) {
      validatedFaculties.push({
        id: generateId('faculty'),
        name: validation.correctedValue || faculty.name,
        code: generateCode(faculty.name, 6),
        description: faculty.description,
        sourceUrl: websiteUrl,
        confidence: validation.confidence,
        courses: [],
      })
      console.log(
        `[LLM] ✓ Faculty validated: "${faculty.name}" (${validation.confidence.toFixed(2)})`
      )
    } else {
      console.log(
        `[LLM] ✗ Faculty rejected: "${faculty.name}" - ${validation.reason || 'low confidence'}`
      )
    }
  }

  // Validate courses
  for (const course of llmData.courses || []) {
    if (!course.name) continue

    const validation = validateCourseName(course.name)

    if (validation.isValid && validation.confidence >= 0.5) {
      validatedCourses.push({
        id: generateId('course'),
        name: course.name,
        code: course.code || generateCode(course.name, 10),
        description: course.description,
        durationYears: course.duration,
        sourceUrl: websiteUrl,
        confidence: validation.confidence,
      })
    } else {
      console.log(
        `[LLM] ✗ Course rejected: "${course.name}" - ${validation.reason || 'low confidence'}`
      )
    }
  }

  // Validate campuses
  for (const campus of llmData.campuses || []) {
    if (!campus.name) continue

    const validation = validateCampusName(campus.name, websiteUrl)

    if (validation.isValid && validation.confidence >= 0.5) {
      validatedCampuses.push({
        id: generateId('campus'),
        name: validation.correctedValue || campus.name,
        code: generateCode(campus.name, 6),
        location: campus.location,
        sourceUrl: websiteUrl,
        confidence: validation.confidence,
        faculties: [],
      })
      console.log(
        `[LLM] ✓ Campus validated: "${campus.name}" (${validation.confidence.toFixed(2)})`
      )
    } else {
      console.log(
        `[LLM] ✗ Campus rejected: "${campus.name}" - ${validation.reason || 'low confidence'}`
      )
    }
  }

  console.log(
    `[LLM] After validation: ${validatedFaculties.length} faculties, ${validatedCourses.length} courses, ${validatedCampuses.length} campuses`
  )

  // Build result structure
  // Create at least one campus to hold faculties
  if (validatedCampuses.length === 0) {
    // Use config's main campus or create default
    const mainCampusName = config
      ? config.campuses.find((c) => c.isMain)?.name || `${config.shortName} Main Campus`
      : 'Main Campus'

    validatedCampuses.push({
      id: generateId('campus'),
      name: mainCampusName,
      code: generateCode(mainCampusName, 6),
      sourceUrl: websiteUrl,
      confidence: 0.6,
      faculties: [],
    })
  }

  // Assign faculties to main campus
  const mainCampus = validatedCampuses[0]
  if (mainCampus) {
    mainCampus.faculties = validatedFaculties

    // Assign courses to matching faculties or create general faculty
    const unassignedCourses: Course[] = []

    for (const course of validatedCourses) {
      // Try to find matching faculty from LLM data
      const llmCourse = llmData.courses?.find(
        (c) => c.name.toLowerCase() === course.name.toLowerCase()
      )
      const suggestedFaculty = llmCourse?.faculty?.toLowerCase()

      let assigned = false
      if (suggestedFaculty) {
        for (const faculty of mainCampus.faculties) {
          if (
            faculty.name.toLowerCase().includes(suggestedFaculty) ||
            suggestedFaculty.includes(
              faculty.name.toLowerCase().replace(/^faculty of /i, '')
            )
          ) {
            faculty.courses.push(course)
            assigned = true
            break
          }
        }
      }

      if (!assigned) {
        unassignedCourses.push(course)
      }
    }

    // Handle unassigned courses
    if (unassignedCourses.length > 0) {
      // Try to assign to first faculty if only one exists
      if (mainCampus.faculties.length === 1 && mainCampus.faculties[0]) {
        mainCampus.faculties[0].courses.push(...unassignedCourses)
      } else if (mainCampus.faculties.length > 0) {
        // Create a general programmes faculty
        mainCampus.faculties.push({
          id: generateId('faculty'),
          name: 'Other Programmes',
          code: 'OTHER',
          description: 'Programmes not assigned to a specific faculty',
          sourceUrl: websiteUrl,
          confidence: 0.6,
          courses: unassignedCourses,
        })
      } else {
        // No faculties at all - create one with the courses
        mainCampus.faculties.push({
          id: generateId('faculty'),
          name: 'Academic Programmes',
          code: 'ACAD',
          sourceUrl: websiteUrl,
          confidence: 0.6,
          courses: unassignedCourses,
        })
      }
    }
  }

  return {
    institutionName: config?.name || 'Unknown Institution',
    websiteUrl,
    campuses: validatedCampuses,
    scannedAt: new Date().toISOString(),
    pageCount: 0, // Will be updated by caller
  }
}

/**
 * Check if a link appears to be academically relevant
 */
function isAcademicLink(href: string, text: string): boolean {
  const keywords = [
    'faculty',
    'school',
    'college',
    'department',
    'programme',
    'program',
    'course',
    'qualification',
    'degree',
    'undergraduate',
    'postgraduate',
    'campus',
    'bachelor',
    'master',
    'diploma',
    'certificate',
  ]

  const hrefLower = href.toLowerCase()
  const textLower = text.toLowerCase()

  return keywords.some((kw) => hrefLower.includes(kw) || textLower.includes(kw))
}

/**
 * Legacy refinement function - kept for backwards compatibility.
 *
 * Use extractWithLLM() as the primary method instead.
 */
export async function refineWithLLM(
  pages: ScrapedPage[],
  regexResults: ScanResults
): Promise<ScanResults> {
  // Try LLM extraction first
  const llmResults = await extractWithLLM(pages, regexResults.websiteUrl)

  if (llmResults) {
    // Merge LLM results with regex results, preferring LLM
    return mergeResults(regexResults, llmResults)
  }

  // Fall back to regex results
  return regexResults
}

/**
 * Merge regex results with LLM results
 */
function mergeResults(
  regexResults: ScanResults,
  llmResults: ScanResults
): ScanResults {
  // Prefer LLM results but include any unique regex items
  const result = { ...llmResults }

  // Get existing names from LLM results
  const llmFacultyNames = new Set(
    llmResults.campuses.flatMap((c) => c.faculties.map((f) => f.name.toLowerCase()))
  )
  const llmCourseNames = new Set(
    llmResults.campuses.flatMap((c) =>
      c.faculties.flatMap((f) => f.courses.map((course) => course.name.toLowerCase()))
    )
  )
  const llmCampusNames = new Set(
    llmResults.campuses.map((c) => c.name.toLowerCase())
  )

  // Add unique regex items to LLM results
  for (const regexCampus of regexResults.campuses) {
    if (!llmCampusNames.has(regexCampus.name.toLowerCase())) {
      // Add unique campus
      result.campuses.push(regexCampus)
    }
  }

  // Add unique faculties/courses to main campus
  const mainCampus = result.campuses[0]
  if (mainCampus) {
    for (const regexCampus of regexResults.campuses) {
      for (const faculty of regexCampus.faculties) {
        if (!llmFacultyNames.has(faculty.name.toLowerCase())) {
          // Validate before adding
          const validation = validateFacultyName(
            faculty.name,
            regexResults.websiteUrl
          )
          if (validation.isValid && validation.confidence >= 0.7) {
            mainCampus.faculties.push(faculty)
            llmFacultyNames.add(faculty.name.toLowerCase())
          }
        }

        // Add unique courses
        for (const course of faculty.courses) {
          if (!llmCourseNames.has(course.name.toLowerCase())) {
            const validation = validateCourseName(course.name)
            if (validation.isValid && validation.confidence >= 0.7) {
              // Add to first faculty
              const targetFaculty = mainCampus.faculties[0]
              if (targetFaculty) {
                targetFaculty.courses.push(course)
                llmCourseNames.add(course.name.toLowerCase())
              }
            }
          }
        }
      }
    }
  }

  return result
}
