import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Accept AI Scan Results API Route
 *
 * Saves the scanned and validated data to the database
 */

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { institution_id, campuses } = body

    if (!institution_id || !campuses || !Array.isArray(campuses)) {
      return NextResponse.json(
        { error: 'Missing required fields: institution_id, campuses' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Process each campus
    for (const campusData of campuses) {
      // Create campus
      const { data: campus, error: campusError } = await supabase
        .from('campuses')
        .insert({
          institution_id,
          name: campusData.name,
          code: campusData.name.substring(0, 3).toUpperCase(),
          address: campusData.location
            ? {
                city: campusData.location.split(',')[0]?.trim() || '',
                province: campusData.location.split(',')[1]?.trim() || '',
              }
            : {},
        })
        .select()
        .single()

      if (campusError) {
        console.error('Campus creation error:', campusError)
        continue // Skip to next campus
      }

      // Process faculties for this campus
      for (const facultyData of campusData.faculties || []) {
        const { data: faculty, error: facultyError } = await supabase
          .from('faculties')
          .insert({
            institution_id,
            campus_id: campus.id,
            name: facultyData.name,
            code: facultyData.name.substring(0, 3).toUpperCase(),
            description: `Faculty of ${facultyData.name}`,
          })
          .select()
          .single()

        if (facultyError) {
          console.error('Faculty creation error:', facultyError)
          continue // Skip to next faculty
        }

        // Process courses for this faculty
        for (const courseData of facultyData.courses || []) {
          const { error: courseError } = await supabase.from('courses').insert({
            institution_id,
            faculty_id: faculty.id,
            campus_id: campus.id,
            name: courseData.name,
            code: courseData.code || courseData.name.substring(0, 6).toUpperCase(),
            requirements: courseData.requirements
              ? { text: courseData.requirements }
              : {},
            status: 'active',
          })

          if (courseError) {
            console.error('Course creation error:', courseError)
            // Continue with next course even if one fails
          }
        }
      }
    }

    return NextResponse.json(
      { success: true, message: 'Data saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Accept scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error while saving data' },
      { status: 500 }
    )
  }
}
