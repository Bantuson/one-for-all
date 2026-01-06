import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new NextResponse('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type
  const supabase = createServiceClient()

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data

      const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id)?.email_address
      const primaryPhone = phone_numbers.find((p) => p.id === evt.data.primary_phone_number_id)?.phone_number

      if (!primaryEmail) {
        return new NextResponse('No primary email found', { status: 400 })
      }

      // Use the sync_clerk_user function from our migration
      const { data, error } = await supabase.rpc('sync_clerk_user', {
        p_clerk_user_id: id,
        p_email: primaryEmail,
        p_first_name: first_name || null,
        p_last_name: last_name || null,
        p_avatar_url: image_url || null,
        p_phone: primaryPhone || null,
      })

      if (error) {
        console.error('Error syncing user to Supabase:', error)
        return new NextResponse('Error syncing user', { status: 500 })
      }

      console.log('User synced successfully:', data)
    } else if (eventType === 'user.deleted') {
      const { id } = evt.data

      // Delete user from Supabase
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Error deleting user from Supabase:', error)
        return new NextResponse('Error deleting user', { status: 500 })
      }

      console.log('User deleted successfully')
    } else if (eventType === 'organizationMembership.created') {
      // Handle when a user accepts an organization invitation
      const membership = evt.data
      const orgId = membership.organization.id
      const clerkUserId = membership.public_user_data.user_id

      console.log(`Organization membership created: user ${clerkUserId} joined org ${orgId}`)

      // Find institution by clerk_org_id
      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('clerk_org_id', orgId)
        .single()

      if (institutionError || !institution) {
        console.error('Institution not found for Clerk org:', orgId)
        return new NextResponse('Institution not found', { status: 404 })
      }

      // Get or create user in our system
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (userError || !user) {
        console.error('User not found:', clerkUserId)
        return new NextResponse('User not found', { status: 404 })
      }

      // Map Clerk role to our role
      const clerkRole = membership.role
      let role: 'admin' | 'reviewer' | 'member' = 'member'
      if (clerkRole === 'org:admin') role = 'admin'
      else if (clerkRole === 'org:member') role = 'member'

      // Get pending invitation email to update the correct record
      const memberEmail = membership.public_user_data.identifier // Usually the email

      // Try to update existing pending invitation first
      const { data: existingMember } = await supabase
        .from('institution_members')
        .select('id')
        .eq('institution_id', institution.id)
        .eq('invited_email', memberEmail)
        .eq('invitation_status', 'pending')
        .single()

      if (existingMember) {
        // Update existing invitation to accepted
        // IMPORTANT: Do NOT overwrite role or permissions - they were set during invitation creation
        // Only update user_id, status, and accepted timestamp
        await supabase
          .from('institution_members')
          .update({
            user_id: user.id,
            invitation_status: 'accepted',
            invitation_accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMember.id)

        console.log(`Updated pending invitation for ${memberEmail} to accepted (preserved original permissions)`)
      } else {
        // Create new membership (direct invite via Clerk dashboard)
        await supabase
          .from('institution_members')
          .insert({
            institution_id: institution.id,
            user_id: user.id,
            role: role,
            invitation_status: 'accepted',
            invited_email: memberEmail,
          })

        console.log(`Created new membership for ${memberEmail}`)
      }
    } else if (eventType === 'organizationMembership.deleted') {
      // Handle when a user is removed from an organization
      const membership = evt.data
      const orgId = membership.organization.id
      const clerkUserId = membership.public_user_data.user_id

      console.log(`Organization membership deleted: user ${clerkUserId} left org ${orgId}`)

      // Find institution by clerk_org_id
      const { data: institution } = await supabase
        .from('institutions')
        .select('id')
        .eq('clerk_org_id', orgId)
        .single()

      if (institution) {
        // Get user
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', clerkUserId)
          .single()

        if (user) {
          // Remove membership
          await supabase
            .from('institution_members')
            .delete()
            .eq('institution_id', institution.id)
            .eq('user_id', user.id)

          console.log(`Removed membership for user ${clerkUserId} from institution ${institution.id}`)
        }
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}
