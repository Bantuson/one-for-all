import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
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
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}
