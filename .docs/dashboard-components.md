# Dashboard Component Inventory

> Generated: 2026-01-06
> Updated: 2026-01-13 (Skeleton Loading, Role UI Refinements)
> Branch: registration_consolidation (merged to master)

## Business Logic Flow

```
Landing Page (/)
├── Hero component with animated feature cards
├── $ register → /register (6-step workflow)
└── $ sign-in → LoginModal

Registration (/register)
├── Step 0: AuthStep (OAuth, email/password, verification)
├── Step 1: InstitutionTypeStep
├── Step 2: InstitutionSetupStep
├── Step 3: CustomizeStep (SetupEditorMasterDetail)
├── Step 4: TeamStep (TeamInviteStep)
└── Step 5: ConfirmStep → Dashboard

Dashboard (/dashboard/[slug])
├── DashboardHeader (search, team, settings)
├── DashboardEditor / SetupEditorMasterDetail
├── Team Page (/team) - CRUD operations
└── Settings Dropdown (theme toggle, sign out)
```

---

## Landing Page Components

| Component | Path | Purpose |
|-----------|------|---------|
| **page.tsx** | `app/page.tsx` | Root landing page with smart routing |
| **LandingLayout** | `components/layout/LandingLayout.tsx` | Main wrapper with header/footer |
| **Hero** | `components/landing/Hero.tsx` | CTA buttons + animated feature cards |
| **Footer** | `components/landing/Footer.tsx` | Copyright footer |
| **Logo** | `components/branding/Logo.tsx` | One For All logo |
| **LoginModal** | `components/modals/LoginModal.tsx` | Clerk SignIn modal |
| **ClerkErrorBoundary** | `components/auth/ClerkErrorBoundary.tsx` | Error boundary for Clerk |

---

## Registration Flow Components

| Component | Path | Purpose |
|-----------|------|---------|
| **register/page.tsx** | `app/register/page.tsx` | Registration route handler |
| **UnifiedRegistrationPage** | `components/registration/UnifiedRegistrationPage.tsx` | 6-step workflow orchestrator |
| **AuthStep** | `components/registration/steps/AuthStep.tsx` | OAuth + email auth |
| **InstitutionTypeStep** | `components/registration/steps/InstitutionTypeStep.tsx` | Type selection |
| **InstitutionSetupStep** | `components/registration/steps/InstitutionSetupStep.tsx` | Institution details form |
| **CustomizeStep** | `components/registration/steps/CustomizeStep.tsx` | Campus/faculty/course editor |
| **TeamStep** | `components/registration/steps/TeamStep.tsx` | Team invitation wrapper |
| **ConfirmStep** | `components/registration/steps/ConfirmStep.tsx` | Review and submit |

---

## Dashboard Components

| Component | Path | Purpose |
|-----------|------|---------|
| **layout.tsx** | `app/dashboard/[institution_slug]/layout.tsx` | Dashboard layout wrapper |
| **page.tsx** | `app/dashboard/[institution_slug]/page.tsx` | Main dashboard page |
| **team/page.tsx** | `app/dashboard/[institution_slug]/team/page.tsx` | Team management CRUD |
| **DashboardHeader** | `components/dashboard/DashboardHeader.tsx` | Navigation header |
| **DashboardEditor** | `components/dashboard/DashboardEditor.tsx` | Main editor interface |
| **DashboardEmptyState** | `components/dashboard/DashboardEmptyState.tsx` | Empty state placeholder |
| **SettingsDropdown** | `components/dashboard/SettingsDropdown.tsx` | Theme + sign out menu |
| **CommandPalette** | `components/dashboard/CommandPalette.tsx` | Cmd+K search interface |
| **MasterDetailLayout** | `components/dashboard/MasterDetailLayout.tsx` | Two-pane layout |

---

## Setup Components

| Component | Path | Purpose |
|-----------|------|---------|
| **SetupEditorMasterDetail** | `components/setup/SetupEditorMasterDetail.tsx` | Tree-based hierarchy editor |
| **TeamInviteStep** | `components/setup/TeamInviteStep.tsx` | Team invitation form (role-first or legacy mode) |
| **InstitutionSelector** | `components/setup/InstitutionSelector.tsx` | Pre-configured institution selector |
| **InstitutionPreview** | `components/setup/InstitutionPreview.tsx` | Institution data preview |

---

## Role Management Components (NEW)

Institution-level custom roles with granular permissions. Located in `components/roles/`.

| Component | Path | Purpose |
|-----------|------|---------|
| **RoleBadge** | `components/roles/RoleBadge.tsx` | Small colored badge for role name |
| **RoleSelector** | `components/roles/RoleSelector.tsx` | Dropdown with permissions preview |
| **RolePermissionGrid** | `components/roles/RolePermissionGrid.tsx` | Grouped permission checkboxes |
| **RoleCard** | `components/roles/RoleCard.tsx` | Role display card with actions (min-h-[280px], skips access category) |
| **RoleForm** | `components/roles/RoleForm.tsx` | Create/Edit role form |
| **RoleDeleteDialog** | `components/roles/RoleDeleteDialog.tsx` | Delete confirmation dialog |

### Role Hooks

| Hook | Path | Purpose |
|------|------|---------|
| **useRoles** | `components/roles/hooks/useRoles.ts` | Fetch roles for institution |
| **useCreateRole** | `components/roles/hooks/useRoleMutations.ts` | Create role mutation |
| **useUpdateRole** | `components/roles/hooks/useRoleMutations.ts` | Update role mutation |
| **useDeleteRole** | `components/roles/hooks/useRoleMutations.ts` | Delete role mutation |

### Role-First Invite Flow

TeamInviteStep now supports two modes:

```tsx
// Role-first mode (when institutionId provided)
<TeamInviteStep institutionId={institutionId} />

// Legacy mode (permission checkboxes)
<TeamInviteStep />
```

---

## Permissions System

Centralized permission definitions in `lib/constants/permissions.ts`.

### Canonical Permissions (13 total)

| Permission | Category | Description |
|------------|----------|-------------|
| `view_dashboard` | access | View dashboard metrics (auto-granted) |
| `view_applications` | applications | Read-only application access |
| `process_applications` | applications | Review and update applications |
| `manage_applications` | applications | Full application management |
| `edit_campuses` | academic | Create/edit/delete campuses |
| `edit_faculties` | academic | Create/edit/delete faculties |
| `edit_courses` | academic | Manage courses and programs |
| `view_reports` | reporting | Access reports and analytics |
| `export_data` | reporting | Export data to files |
| `export_applications` | reporting | Export application data |
| `manage_team` | administration | Invite and manage team members |
| `manage_settings` | administration | Configure institution settings |
| `admin_access` | administration | All permissions (superuser) |

### Permission Helpers

```tsx
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  expandAdminAccess,
  PERMISSIONS,
  PERMISSION_GROUPS,
} from '@/lib/constants/permissions'

// Check single permission (respects admin_access)
if (hasPermission(user.permissions, 'manage_team')) { ... }

// Expand admin to all permissions
const effective = expandAdminAccess(user.permissions)
```

---

## Form Components

| Component | Path | Purpose |
|-----------|------|---------|
| **CampusWizard** | `components/forms/CampusWizard.tsx` | 4-step campus creation wizard |
| **CampusInfoStep** | `components/forms/steps/CampusInfoStep.tsx` | Campus name/code/location |
| **FacultiesStep** | `components/forms/steps/FacultiesStep.tsx` | Faculty management |
| **CoursesStep** | `components/forms/steps/CoursesStep.tsx` | Course management |
| **TeamMembersStep** | `components/forms/steps/TeamMembersStep.tsx` | Team member invites |

---

## UI Components

### Core Primitives
| Component | Path | Purpose |
|-----------|------|---------|
| **Button** | `components/ui/Button.tsx` | Multi-variant button |
| **Input** | `components/ui/Input.tsx` | Form input field |
| **Label** | `components/ui/Label.tsx` | Form label |
| **Dialog** | `components/ui/Dialog.tsx` | Modal dialog (Radix) |
| **AlertDialog** | `components/ui/AlertDialog.tsx` | Confirmation dialog |
| **DropdownMenu** | `components/ui/DropdownMenu.tsx` | Dropdown menu |
| **Select** | `components/ui/Select.tsx` | Select dropdown |
| **card** | `components/ui/card.tsx` | Simple card wrapper |

### Specialized Components
| Component | Path | Purpose |
|-----------|------|---------|
| **CodeCard** | `components/ui/CodeCard.tsx` | Terminal-style card |
| **TrafficLights** | `components/ui/TrafficLights.tsx` | Mac-style traffic lights + badges |
| **Stepper** | `components/ui/Stepper.tsx` | Progress stepper |
| **CommandButton** | `components/ui/CommandButton.tsx` | Terminal command button |
| **ThemeToggle** | `components/ui/ThemeToggle.tsx` | Dark/light toggle |
| **FormField** | `components/ui/FormField.tsx` | Form field wrapper |
| **FileUploadField** | `components/ui/FileUploadField.tsx` | File upload input |
| **DottedModal** | `components/ui/DottedModal.tsx` | Dotted border modal |
| **ModalHeader** | `components/ui/ModalHeader.tsx` | Reusable modal header |
| **SyntaxText** | `components/ui/SyntaxText.tsx` | Syntax-highlighted text |
| **VisuallyHidden** | `components/ui/VisuallyHidden.tsx` | Accessibility helper |

---

## Skeleton Loading Components (NEW)

Located in `components/ui/Skeleton.tsx`. Loading states matching actual UI structure.

### Core Skeletons
| Component | Purpose |
|-----------|---------|
| **Skeleton** | Base animated pulse block |
| **TrafficLightsSkeleton** | Three-dot header decoration |

### Composite Skeletons
| Component | Props | Purpose |
|-----------|-------|---------|
| **CodeCardSkeleton** | `showFooter`, `permissionLines` | Matches CodeCard structure |
| **RolesTabSkeleton** | `count` (default 4) | 2-column grid of role cards |
| **MembersTabSkeleton** | `memberCount` (default 3) | Member list with avatar rows |
| **TeamPageSkeleton** | `className` | Full team page with tabs + card |

### Utility Skeletons
| Component | Props | Purpose |
|-----------|-------|---------|
| **TextSkeleton** | `size` (sm/md/lg/xl), `width` | Text placeholder |
| **AvatarSkeleton** | `size` (sm/md/lg) | Circular avatar |
| **ButtonSkeleton** | `size` (sm/md/lg/icon) | Button placeholder |

---

## Modal Components

| Component | Path | Purpose |
|-----------|------|---------|
| **LoginModal** | `components/modals/LoginModal.tsx` | Sign-in modal with Clerk |
| **EditCourseModal** | `components/modals/EditCourseModal.tsx` | Course editing modal |

---

## State Management

| Store | Path | Purpose |
|-------|------|---------|
| **unifiedRegistrationStore** | `lib/stores/unifiedRegistrationStore.ts` | Primary registration state |
| **setupStore** | `lib/stores/setupStore.ts` | Setup editor state |

---

## Utilities

| Utility | Path | Purpose |
|---------|------|---------|
| **utils.ts** | `lib/utils.ts` | cn() classname merger |
| **toast.ts** | `lib/toast.ts` | Sonner notifications |
| **localStorage.ts** | `lib/localStorage.ts` | Form state persistence |
| **sendgrid.ts** | `lib/email/sendgrid.ts` | SendGrid email service |
| **invitation.ts** | `lib/email/templates/invitation.ts` | Email templates |
| **client.ts** | `lib/supabase/client.ts` | Client-side Supabase |
| **server.ts** | `lib/supabase/server.ts` | Server-side Supabase |

---

## Institution Configurations

All pre-configured South African institutions in `lib/institutions/data/`:

- UP (University of Pretoria)
- Eduvos
- CPUT (Cape Peninsula University of Technology)
- NMU (Nelson Mandela University)
- NWU (North-West University)
- SUN (Stellenbosch University)
- TUT (Tshwane University of Technology)
- UCT (University of Cape Town)
- UFS (University of the Free State)
- UJ (University of Johannesburg)
- UKZN (University of KwaZulu-Natal)
- UWC (University of the Western Cape)
- VUT (Vaal University of Technology)
- Wits (University of the Witwatersrand)
- WSU (Walter Sisulu University)

---

## API Routes (Actively Used)

### Institutions
- `POST /api/institutions` - Create institution
- `GET /api/institutions/by-slug/[slug]` - Get by slug

### CRUD Operations
- `/api/campuses` - Campus CRUD
- `/api/faculties` - Faculty CRUD
- `/api/courses` - Course CRUD

### Registration
- `POST /api/register/complete` - Complete registration

### Invitations
- `POST /api/invitations/send` - Send invitation
- `POST /api/invitations/accept` - Accept invitation
- `GET /api/invitations/validate` - Validate token

### Roles (NEW)

- `GET /api/institutions/[institutionId]/roles` - List roles with member counts
- `POST /api/institutions/[institutionId]/roles` - Create custom role
- `GET /api/institutions/[institutionId]/roles/[roleId]` - Get single role
- `PATCH /api/institutions/[institutionId]/roles/[roleId]` - Update role
- `DELETE /api/institutions/[institutionId]/roles/[roleId]` - Delete role

### Members (Updated)

- `GET /api/institutions/[institutionId]/members` - List with role info (roleId, roleName, roleColor)
- `POST /api/institutions/[institutionId]/members` - Create with roleId support

### Authentication

- `GET /api/auth/session-check` - Session validation
- `POST /api/webhooks/clerk` - Clerk webhooks

---

## Database Migrations (Role System)

| Migration | Purpose |
|-----------|---------|
| `011_institution_roles.sql` | Creates `institution_roles` table with RLS, auto-seeds admin role |
| `012_export_applications_permission.sql` | Adds export_applications, seeds default roles (Applications Admin, Academic Maintainer) |
