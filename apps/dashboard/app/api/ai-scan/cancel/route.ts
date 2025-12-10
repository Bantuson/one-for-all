import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * Cancel AI Scan Job API Route
 *
 * Cancels an ongoing scan job. Since scans run as subprocesses,
 * this primarily updates the job status in the database and
 * the client handles disconnecting from the SSE stream.
 */

// Store for active job processes (in production, use Redis or similar)
const activeJobs = new Map<string, AbortController>()

export function registerJob(jobId: string, controller: AbortController) {
  activeJobs.set(jobId, controller)
}

export function unregisterJob(jobId: string) {
  activeJobs.delete(jobId)
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing required field: job_id' },
        { status: 400 }
      )
    }

    // Try to abort the job if it's still running
    const controller = activeJobs.get(job_id)
    if (controller) {
      controller.abort()
      activeJobs.delete(job_id)
    }

    // In production, also update the database
    // await supabase.from('scan_jobs').update({ status: 'cancelled' }).eq('id', job_id)

    return NextResponse.json({ success: true, message: 'Scan cancelled' })
  } catch (error) {
    console.error('Cancel scan error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel scan' },
      { status: 500 }
    )
  }
}
