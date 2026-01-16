/**
 * Shared authentication and authorization utilities for Agent API routes
 */
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export type AgentType =
  | 'document_reviewer'
  | 'aps_ranking'
  | 'reviewer_assistant'
  | 'analytics'
  | 'notification_sender'

export interface UserAccess {
  userId: string
  clerkUserId: string
  role: string
  institutionId: string
}

/**
 * Verify user is authenticated and has access to the specified institution
 * Returns user details if authorized, null otherwise
 */
export async function verifyInstitutionAccess(
  institutionId: string,
  requiredRoles: string[] = ['admin', 'reviewer']
): Promise<UserAccess | null> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return null
  }

  const supabase = createServiceClient()

  // Get Supabase user ID from Clerk ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return null
  }

  // Check membership and role
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('role')
    .eq('institution_id', institutionId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return null
  }

  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
    return null
  }

  return {
    userId: user.id,
    clerkUserId,
    role: membership.role,
    institutionId,
  }
}

/**
 * Create an agent chat session in the database
 */
export async function createChatSession(params: {
  institutionId: string
  agentType: AgentType
  inputContext: Record<string, unknown>
  targetType?: string
  targetIds?: string[]
  initiatedBy: string
}): Promise<{ id: string } | null> {
  const supabase = createServiceClient()

  const { data: session, error } = await supabase
    .from('agent_sessions')
    .insert({
      institution_id: params.institutionId,
      agent_type: params.agentType,
      status: 'pending',
      input_context: params.inputContext,
      target_type: params.targetType || null,
      target_ids: params.targetIds || [],
      total_items: params.targetIds?.length || 0,
      processed_items: 0,
      initiated_by: params.initiatedBy,
      is_chat_session: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create chat session:', error)
    return null
  }

  return session
}

/**
 * Get or create a chat session for continued conversations
 */
export async function getOrCreateChatSession(params: {
  sessionId?: string
  institutionId: string
  agentType: AgentType
  inputContext: Record<string, unknown>
  targetType?: string
  targetIds?: string[]
  initiatedBy: string
}): Promise<{ id: string; isNew: boolean } | null> {
  const supabase = createServiceClient()

  // If sessionId provided, verify it exists and belongs to this institution
  if (params.sessionId) {
    const { data: existing, error } = await supabase
      .from('agent_sessions')
      .select('id, status')
      .eq('id', params.sessionId)
      .eq('institution_id', params.institutionId)
      .eq('agent_type', params.agentType)
      .single()

    if (!error && existing) {
      // Update the session with new message context (append to input_context)
      await supabase
        .from('agent_sessions')
        .update({
          input_context: params.inputContext,
          status: 'pending', // Reset to pending for new message processing
        })
        .eq('id', existing.id)

      return { id: existing.id, isNew: false }
    }
  }

  // Create new session
  const session = await createChatSession(params)
  if (!session) {
    return null
  }

  return { id: session.id, isNew: true }
}
