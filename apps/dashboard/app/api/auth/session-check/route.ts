import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  return NextResponse.json({ ready: !!userId, userId })
}
