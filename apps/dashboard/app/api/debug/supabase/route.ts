import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/debug/supabase - Test Supabase connection and list institutions
export async function GET() {
  try {
    const supabase = createServiceClient()

    // Test 1: Check if we can connect
    const { data: institutions, error } = await supabase
      .from('institutions')
      .select('id, name, slug, type')
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error,
        errorCode: error.code,
        errorMessage: error.message,
        hint: 'Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL',
      })
    }

    return NextResponse.json({
      success: true,
      institutionCount: institutions?.length || 0,
      institutions: institutions || [],
      envCheck: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    })
  }
}
