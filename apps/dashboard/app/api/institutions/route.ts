import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/institutions - Get all institutions user is a member of
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get current user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get institutions where user is a member
    const { data: institutions, error: institutionsError } = await supabase
      .from('institutions')
      .select(`
        *,
        institution_members!inner(role)
      `)
      .eq('institution_members.user_id', user.id)

    if (institutionsError) {
      console.error('Error fetching institutions:', institutionsError)
      return NextResponse.json(
        { error: 'Failed to fetch institutions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ institutions })
  } catch (error) {
    console.error('Error in GET /api/institutions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/institutions - Create a new institution
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, type, contact_email, contact_phone, website } = body

    // Validate required fields
    if (!name || !type || !contact_email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, contact_email' },
        { status: 400 }
      )
    }

    // Validate institution type
    const validTypes = ['university', 'college', 'nsfas', 'bursary_provider']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user from Supabase
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    // If user doesn't exist in Supabase yet, sync from Clerk
    // (This handles cases where webhook hasn't fired yet)
    if (userError || !user) {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)

      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress

      const primaryPhone = clerkUser.phoneNumbers.find(
        (p) => p.id === clerkUser.primaryPhoneNumberId
      )?.phoneNumber

      if (!primaryEmail) {
        return NextResponse.json(
          { error: 'User has no email address' },
          { status: 400 }
        )
      }

      // Sync user to Supabase
      const { data: syncedUserId, error: syncError } = await supabase.rpc(
        'sync_clerk_user',
        {
          p_clerk_user_id: userId,
          p_email: primaryEmail,
          p_first_name: clerkUser.firstName || null,
          p_last_name: clerkUser.lastName || null,
          p_avatar_url: clerkUser.imageUrl || null,
          p_phone: primaryPhone || null,
        }
      )

      if (syncError) {
        console.error('Error syncing user from Clerk:', syncError)
        return NextResponse.json(
          { error: 'Failed to sync user' },
          { status: 500 }
        )
      }

      // Fetch the newly created user
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (newUserError || !newUser) {
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      user = newUser
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create institution
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .insert({
        name,
        slug,
        type,
        contact_email,
        contact_phone: contact_phone || null,
        website: website || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (institutionError) {
      console.error('Error creating institution:', institutionError)

      // Handle duplicate slug
      if (institutionError.code === '23505') {
        return NextResponse.json(
          { error: 'An institution with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create institution' },
        { status: 500 }
      )
    }

    // The trigger automatically assigns the creator as admin
    // Return the created institution
    return NextResponse.json({ institution }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/institutions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
