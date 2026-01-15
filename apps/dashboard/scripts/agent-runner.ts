#!/usr/bin/env bun
/**
 * Bun Agent Runner
 * Polls agent_sessions table and triggers Python crew execution
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

// Map agent types to backend endpoints
const AGENT_ENDPOINTS: Record<string, string> = {
  document_reviewer: '/api/v1/agents/document-review/execute',
  aps_ranking: '/api/v1/agents/aps-ranking/execute',
  reviewer_assistant: '/api/v1/agents/reviewer-assistant/execute',
  analytics: '/api/v1/agents/analytics/execute',
}

async function processPendingSessions() {
  // Fetch pending sessions
  const { data: sessions, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (error || !sessions?.length) return

  for (const session of sessions) {
    console.log(`Processing session ${session.id} (${session.agent_type})...`)

    // Mark as running
    await supabase
      .from('agent_sessions')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', session.id)

    try {
      // Call Python backend
      const endpoint = AGENT_ENDPOINTS[session.agent_type]
      if (!endpoint) {
        throw new Error(`Unknown agent type: ${session.agent_type}`)
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      })

      const result = await response.json()

      // Update session with results
      await supabase
        .from('agent_sessions')
        .update({
          status: response.ok ? 'completed' : 'failed',
          output_result: result,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      console.log(`Session ${session.id} ${response.ok ? 'completed' : 'failed'}`)
    } catch (err) {
      console.error(`Session ${session.id} failed:`, err)
      await supabase
        .from('agent_sessions')
        .update({
          status: 'failed',
          output_result: { error: String(err) },
        })
        .eq('id', session.id)
    }
  }
}

// Run loop every 2 seconds
setInterval(processPendingSessions, 2000)
console.log('Bun Agent Runner started...')
