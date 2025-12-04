# Supabase Setup Guide - Authentication & Multi-Tenancy

## Overview

This guide walks you through setting up Supabase with Clerk authentication and multi-tenant institution management for the One For All Admissions Platform.

## Prerequisites

- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Clerk account created
- [ ] Clerk application created

## Step 1: Run Database Migrations (10 minutes)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Open `migrations/001_auth_setup.sql` in your code editor
5. Copy the entire contents
6. Paste into the Supabase SQL Editor
7. Click **Run** button
8. Verify no errors in the output panel
9. Repeat steps 3-8 for `migrations/002_institutions_schema.sql`

### Option B: Via Supabase CLI

```bash
cd apps/backend/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Verify migrations
supabase db diff
```

### Verification

After running migrations, verify tables were created:

```sql
-- Run this in SQL Editor to verify
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'institutions', 'campuses', 'faculties', 'courses', 'institution_members')
ORDER BY table_name;
```

You should see all 6 tables listed.

---

## Step 2: Configure Clerk JWT for Supabase (15 minutes)

### 2.1 Get Supabase JWT Secret

1. In Supabase Dashboard → **Settings** → **API**
2. Scroll to **JWT Settings**
3. Copy the **JWT Secret** (starts with something like `your-super-secret...`)

### 2.2 Configure Clerk JWT Template

1. Go to Clerk Dashboard → **JWT Templates**
2. Click **+ New template** → Select **Supabase** from templates
3. Configure the template:

```json
{
  "aud": "authenticated",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "https://{{domain}}/",
  "nbf": "{{token.nbf}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "phone": "{{user.primary_phone_number}}",
  "app_metadata": {
    "provider": "clerk"
  },
  "user_metadata": {
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "avatar_url": "{{user.profile_image_url}}"
  }
}
```

4. Name it: **Supabase Template**
5. Click **Save**
6. Copy the **Issuer URL** (you'll need this for Supabase)

### 2.3 Add Clerk as Supabase Auth Provider

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Scroll to **Auth Providers** section
3. Find **Custom JWT Providers** (or add it if not visible)
4. Click **Add Provider**
5. Configure:
   - **Provider Name**: `Clerk`
   - **Issuer URL**: Paste the issuer URL from Clerk JWT template (step 2.2)
   - **JWKS URL**: `https://YOUR_CLERK_DOMAIN/.well-known/jwks.json`
   - **Audience**: `authenticated`
6. Click **Save**

---

## Step 3: Set Up Environment Variables (5 minutes)

### 3.1 Get Supabase Credentials

From Supabase Dashboard → **Settings** → **API**:
- Copy **Project URL** (e.g., `https://xyz.supabase.co`)
- Copy **anon public** key (starts with `eyJhbGciOi...`)
- Copy **service_role** secret key (starts with `eyJhbGciOi...`)

### 3.2 Get Clerk Credentials

From Clerk Dashboard → **API Keys**:
- Copy **Publishable Key** (starts with `pk_test_...`)
- Copy **Secret Key** (starts with `sk_test_...`)

### 3.3 Update Environment Files

**Root `.env.local`** (for Next.js dashboard):

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Server-side only, never expose to client
```

**Backend `.env`** (for CrewAI agents):

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Clerk (for webhook verification)
CLERK_WEBHOOK_SECRET=whsec_...
```

---

## Step 4: Set Up Clerk Webhook (10 minutes)

### 4.1 Create Webhook Endpoint

Create API route to handle Clerk user sync:

```typescript
// apps/dashboard/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET not set')
  }

  // Get headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Error: Verification failed', { status: 400 })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data

    // Sync to Supabase
    const { error } = await supabaseAdmin.rpc('sync_clerk_user', {
      p_clerk_user_id: id,
      p_email: email_addresses[0]?.email_address || '',
      p_first_name: first_name || null,
      p_last_name: last_name || null,
      p_avatar_url: image_url || null,
      p_phone: phone_numbers[0]?.phone_number || null,
    })

    if (error) {
      console.error('User sync error:', error)
      return new Response('Error: User sync failed', { status: 500 })
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
```

### 4.2 Configure Webhook in Clerk

1. Go to Clerk Dashboard → **Webhooks**
2. Click **+ Add Endpoint**
3. Set **Endpoint URL**: `https://YOUR_DOMAIN.vercel.app/api/webhooks/clerk`
4. Select events:
   - ✅ `user.created`
   - ✅ `user.updated`
5. Click **Create**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add to `.env.local`: `CLERK_WEBHOOK_SECRET=whsec_...`

---

## Step 5: Test the Integration (15 minutes)

### 5.1 Test User Sync

1. Start the Next.js dev server:
   ```bash
   cd apps/dashboard
   npm run dev
   ```

2. Open browser to `http://localhost:3000` (or 3001 if port 3000 busy)

3. Click **Get Started** button

4. Complete Clerk sign-up flow

5. Verify user was synced to Supabase:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
   ```

You should see your new user with `clerk_user_id` populated.

### 5.2 Test Institution Registration

1. After signing in, the registration modal should show

2. Select **Institution** user type

3. Choose institution type (University, College, NSFAS, Bursary Provider)

4. Fill in institution details:
   - Name: "Test University"
   - Slug: "test-university"
   - Email: "admin@testuni.edu"
   - Phone: "+27123456789"

5. Review and submit

6. Verify institution was created:
   ```sql
   SELECT i.*, im.role
   FROM public.institutions i
   JOIN public.institution_members im ON im.institution_id = i.id
   ORDER BY i.created_at DESC
   LIMIT 5;
   ```

You should see:
- Institution record with your provided details
- Institution member record with `role = 'admin'`

### 5.3 Test RLS Policies

Test that users can only see their own institutions:

```sql
-- This should return rows (your institutions)
SELECT * FROM public.institutions;

-- Now test as different user (should see different institutions)
-- You'll need to sign in as another user and run the same query
```

---

## Step 6: Troubleshooting

### Issue: "relation 'public.users' does not exist"

**Solution**: Migration 001 didn't run successfully. Re-run:
```sql
-- Copy entire contents of migrations/001_auth_setup.sql
-- Paste in SQL Editor and run
```

### Issue: "JWT token invalid"

**Solution**: Check Clerk JWT template configuration:
1. Verify issuer URL in Supabase matches Clerk
2. Ensure JWKS URL is correct
3. Try regenerating the JWT template

### Issue: "User not synced to Supabase"

**Solution**: Check webhook:
1. Verify webhook URL is accessible (not localhost)
2. Check webhook logs in Clerk Dashboard
3. Verify `CLERK_WEBHOOK_SECRET` is set correctly
4. Check server logs for errors

### Issue: "Cannot create institution - RLS policy violation"

**Solution**:
1. Verify user exists in `public.users` table
2. Check that `created_by` column is set
3. Ensure RLS policies are enabled (run migration 002 again)

---

## Next Steps

✅ **Authentication Setup Complete!**

Now you can:
1. Wire up the registration form to call `/api/institutions` endpoint
2. Build the institution dashboard pages
3. Update CrewAI agent tools to use institution_id for tenant isolation

See the main implementation plan for Day 2 tasks.

---

## Security Checklist

Before going to production:

- [ ] Service role key stored securely (never in client code)
- [ ] RLS policies enabled on all tables
- [ ] Clerk webhook endpoint uses HTTPS
- [ ] Webhook secret is validated
- [ ] Test cross-tenant data isolation
- [ ] Review Supabase Auth logs regularly
- [ ] Enable Supabase database backups

---

## Useful SQL Queries

### View all users
```sql
SELECT * FROM public.users ORDER BY created_at DESC;
```

### View all institutions
```sql
SELECT * FROM public.institutions ORDER BY created_at DESC;
```

### View institution memberships
```sql
SELECT
    u.email,
    i.name AS institution,
    im.role,
    im.created_at
FROM public.institution_members im
JOIN public.users u ON u.id = im.user_id
JOIN public.institutions i ON i.id = im.institution_id
ORDER BY im.created_at DESC;
```

### Check RLS policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```
