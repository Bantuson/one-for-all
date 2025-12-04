# Authentication Setup Guide

This document explains how the authentication system is integrated between Clerk and Supabase.

## Architecture Overview

- **Clerk**: Handles user authentication (sign-up, sign-in, OAuth)
- **Supabase**: Stores user data and institution relationships
- **Webhook Sync**: Clerk webhooks automatically sync users to Supabase

## Setup Steps

### 1. Run Database Migration

Apply the complete schema migration to your Supabase project:

```bash
# Navigate to the backend supabase directory
cd apps/backend/supabase

# Run the migration using Supabase CLI
supabase db push migrations/000_complete_schema.sql
```

Or apply it directly in the Supabase SQL Editor.

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` in the project root and fill in:

```bash
# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### 3. Configure Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the webhook secret to `CLERK_WEBHOOK_SECRET`

### 4. Enable Google OAuth (Optional)

1. In Clerk Dashboard → Social Connections
2. Enable Google
3. Configure OAuth credentials from Google Cloud Console

## How It Works

### Registration Flow

1. User clicks "Get Started" → Opens RegistrationModal
2. User selects type (Institution Admin) → Proceeds through stepper
3. User enters institution details → ReviewSubmit component
4. **ReviewSubmit** calls `POST /api/institutions`:
   - Verifies user is authenticated via Clerk
   - Looks up user in Supabase `users` table
   - Creates institution in `institutions` table
   - Auto-assigns user as admin via trigger
5. User is redirected to `/dashboard/{slug}`

### Login Flow

1. User clicks "Login" → Opens LoginModal
2. User enters credentials or clicks Google
3. **LoginModal** uses Clerk's `useSignIn()`:
   - Authenticates with Clerk
   - On success, fetches user's institutions from Supabase
   - Redirects to first institution dashboard
4. If no institutions, redirects to `/dashboard`

### User Sync

Clerk webhooks automatically sync users to Supabase:

- `user.created` → Creates record in `users` table via `sync_clerk_user()` function
- `user.updated` → Updates user email and metadata
- `user.deleted` → Removes user from `users` table

## API Routes

### `POST /api/institutions`
Creates a new institution and assigns creator as admin.

**Request:**
```json
{
  "name": "University of Cape Town",
  "type": "university",
  "contact_email": "info@uct.ac.za",
  "contact_phone": "+27 21 650 9111",
  "website": "https://uct.ac.za"
}
```

**Response:**
```json
{
  "institution": {
    "id": "uuid",
    "name": "University of Cape Town",
    "slug": "university-of-cape-town",
    "type": "university",
    ...
  }
}
```

### `GET /api/institutions`
Returns all institutions where the authenticated user is a member.

**Response:**
```json
{
  "institutions": [
    {
      "id": "uuid",
      "name": "University of Cape Town",
      "slug": "university-of-cape-town",
      "institution_members": {
        "role": "admin"
      },
      ...
    }
  ]
}
```

### `GET /api/institutions/[id]`
Get a specific institution (requires membership).

### `PATCH /api/institutions/[id]`
Update institution details (requires admin role).

### `DELETE /api/institutions/[id]`
Delete institution (requires admin role).

## Database Schema

### Key Tables

**users** - Synced from Clerk
- `id` (UUID, PK)
- `clerk_user_id` (TEXT, unique)
- `email` (TEXT, unique)
- `first_name`, `last_name`, `phone`, `avatar_url`
- `onboarding_completed` (BOOLEAN)

**institutions** - Multi-tenant institutions
- `id` (UUID, PK)
- `name` (TEXT)
- `slug` (TEXT, unique)
- `type` (TEXT) - university, college, nsfas, bursary_provider
- `contact_email`, `contact_phone`, `website`
- `created_by` (UUID → users.id)

**institution_members** - User-institution relationships
- `id` (UUID, PK)
- `institution_id` (UUID → institutions.id)
- `user_id` (UUID → users.id)
- `role` (TEXT) - admin, reviewer, member, applicant

### RLS Policies

- Users can only view their own profile
- Users can only see institutions they're members of
- Only admins can update/delete institutions
- Service role (backend) has full access for CrewAI tools

## Testing

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3000`
3. Click "Get Started" and create an institution
4. Verify user appears in Supabase `users` table
5. Verify institution appears in `institutions` table
6. Verify membership appears in `institution_members` table
7. Try logging out and back in
8. Verify redirection to institution dashboard

## Troubleshooting

**Webhook not firing:**
- Check Clerk webhook logs in dashboard
- Verify endpoint URL is correct
- Ensure `CLERK_WEBHOOK_SECRET` matches

**User not syncing to Supabase:**
- Check server logs for webhook errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase logs for RPC function errors

**Login redirects to wrong page:**
- Verify institution slug is correct
- Check RLS policies aren't blocking queries
- Ensure user is a member of the institution

## Next Steps

After authentication is fully working:

1. Build dashboard UI for institution admin
2. Implement campus/faculty/course management
3. Create student application flow
4. Integrate CrewAI backend for application processing
