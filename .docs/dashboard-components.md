# Dashboard Component Inventory

> Generated: 2026-01-06
> Updated: 2026-01-15 (Agent Sandbox Infrastructure, WhatsApp Notifications)
> Branch: main

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
├── Applications Page (/applications) - Application management
│   ├── Status filtering (9 options including Documents Flagged)
│   ├── ApplicationCard grid (4-column responsive)
│   └── ApplicationDetailModal (full detail + document review)
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

## Applications Management Components (NEW)

Application viewing, filtering, and review workflow. Located in `components/applications/`.

| Component | Path | Purpose |
|-----------|------|---------|
| **ApplicationCard** | `components/applications/ApplicationCard.tsx` | Application summary card (260px fixed height) |
| **ChoiceStatusBadge** | `components/applications/ChoiceStatusBadge.tsx` | Choice status badge (7 statuses, 2 sizes) |
| **ChoicePriorityBadge** | `components/applications/ChoicePriorityBadge.tsx` | Priority indicator (shows only 2nd choice) |
| **DocumentRow** | `components/applications/DocumentRow.tsx` | Document with View/Approve/Flag actions |
| **NoteCard** | `components/applications/NoteCard.tsx` | Color-coded application note |
| **NotesGrid** | `components/applications/NotesGrid.tsx` | 4-column grid of NoteCards |
| **AddNoteForm** | `components/applications/AddNoteForm.tsx` | Note creation form with color/type selection |
| **CourseStatusBadge** | `components/courses/CourseStatusBadge.tsx` | Course status (Coming Soon/Open/Closed) |

### Application Pages

| Component | Path | Purpose |
|-----------|------|---------|
| **applications/page.tsx** | `app/dashboard/[institution_slug]/applications/page.tsx` | Main applications list with filtering |
| **applications/loading.tsx** | `app/dashboard/[institution_slug]/applications/loading.tsx` | Skeleton loading state |

### Application Type Definitions

Located in `lib/types/applications.ts`:

#### Status Types
| Type | Values |
|------|--------|
| **ApplicationStatus** | `submitted`, `pending`, `under_review`, `approved`, `rejected`, `waitlisted`, `incomplete` |
| **ChoiceStatus** | `pending`, `under_review`, `conditionally_accepted`, `accepted`, `rejected`, `waitlisted`, `withdrawn` |
| **DocumentReviewStatus** | `pending`, `approved`, `flagged`, `rejected` |
| **NoteType** | `general`, `flag`, `review`, `followup` |
| **NoteColor** | `gray`, `green`, `yellow`, `red`, `blue`, `purple` |

#### Core Interfaces
- **Application** - Main application with personal info, academic info, status history
- **ApplicationChoice** - Choice with priority, course, status, review metadata
- **ApplicationDocument** - Document with review status and flag fields
- **ApplicationNote** - Timestamped note with color and type
- **ApplicationRow** - Flattened format for table/card display

#### Color Mappings
- `CHOICE_STATUS_COLORS` - Status → Tailwind class mapping
- `APPLICATION_STATUS_COLORS` - Application status colors
- `DOCUMENT_STATUS_COLORS` - Document review status colors
- `NOTE_COLORS` - Note color classes with border

#### Helper Functions
```typescript
// Transform API camelCase response to snake_case ApplicationRow
transformApiResponseToApplicationRow(item: ApplicationChoiceApiResponse): ApplicationRow

// Get full name from personal info fields
getApplicantFullName(personalInfo: ApplicationPersonalInfo): string

// Format application ID for display (first 8 chars)
formatApplicationId(id: string): string
```

---

## Agent Sandbox Components (NEW)

AI-powered agent infrastructure for automated admissions processing. Located in `components/agents/`.

| Component | Path | Purpose |
|-----------|------|---------|
| **AgentActivityButton** | `components/agents/AgentActivityButton.tsx` | Header button with active session badge (8x8 rounded) |
| **AgentInstructionModal** | `components/agents/AgentInstructionModal.tsx` | Agent selection + instructions modal (DottedModal-based) |

### Agent Types

| Type | Icon | Purpose |
|------|------|---------|
| `document_reviewer` | FileSearch | Review and verify uploaded documents |
| `aps_ranking` | Calculator | Calculate admission point scores |
| `reviewer_assistant` | HelpCircle | Help with application review decisions |
| `analytics` | BarChart3 | Generate insights and visualizations |
| `notification_sender` | Send | Automated applicant notifications |

### Agent Session Interface

```typescript
interface AgentSession {
  id: string
  agentType: AgentType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  processedItems: number
  totalItems: number
  createdAt: string
}
```

### ReviewerChat Component (NEW)

Chat interface for Reviewer Assistant agent. Located at `components/agents/ReviewerChat.tsx`.

| Component | Path | Purpose |
|-----------|------|---------|
| **ReviewerChat** | `components/agents/ReviewerChat.tsx` | Chat modal for Q&A with Reviewer Assistant |
| **ChatMessageBubble** | (internal) | Message rendering with citations/recommendations |

**Chat Message Interface:**
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: string[]
  recommendations?: string[]
  confidence?: 'High' | 'Medium' | 'Low'
  isLoading?: boolean
}
```

**Quick Questions (Pre-built prompts):**
- Check Eligibility - "Is this applicant eligible for conditional acceptance?"
- Missing Documents - "What documents are missing for this application?"
- Course Requirements - "What are the minimum requirements for this course?"
- Compare Applicant - "How does this applicant compare to accepted students?"

### RealtimeSubscriptionProvider (NEW)

Client component for Supabase Realtime subscriptions. Located at `components/dashboard/RealtimeSubscriptionProvider.tsx`.

| Component | Path | Purpose |
|-----------|------|---------|
| **RealtimeSubscriptionProvider** | `components/dashboard/RealtimeSubscriptionProvider.tsx` | Manages agent_sessions realtime subscription per institution |

**Usage:**
```tsx
<RealtimeSubscriptionProvider institutionId={institutionId}>
  {children}
</RealtimeSubscriptionProvider>
```

Automatically subscribes to `agent_sessions` table changes on mount and cleans up on unmount.

### Agent Store (Zustand)

Located in `lib/stores/agentStore.ts`:

| Function | Purpose |
|----------|---------|
| `openModal()` / `closeModal()` | Modal visibility control |
| `fetchSessions(institutionId)` | Load agent sessions |
| `createSession(institutionId, agentType, instructions)` | Start new agent |
| `updateSessionStatus(id, status)` | Update session state |
| `getActiveCount()` | Count running sessions |

### Extended Agent Store Functions (NEW)

| Function | Purpose |
|----------|---------|
| `subscribeToRealtime(institutionId)` | Subscribe to Supabase Realtime for agent_sessions changes |
| `unsubscribeFromRealtime()` | Cleanup realtime channel subscription |
| `addSession(session)` | Add session from realtime INSERT event |
| `removeSession(sessionId)` | Remove session from realtime DELETE event |
| `updateSessionProgress(id, processed, total)` | Update progress from realtime UPDATE event |

**Selectors (performance optimization):**
```typescript
import { selectIsModalOpen, selectSessions, selectIsLoadingSessions, selectActiveCount } from '@/lib/stores/agentStore'
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
| **ApplicationDetailModal** | `components/modals/ApplicationDetailModal.tsx` | Full application detail with document review |

---

## State Management

| Store | Path | Purpose |
|-------|------|---------|
| **unifiedRegistrationStore** | `lib/stores/unifiedRegistrationStore.ts` | Primary registration state |
| **setupStore** | `lib/stores/setupStore.ts` | Setup editor state |
| **agentStore** | `lib/stores/agentStore.ts` | Agent session state (modal, sessions, realtime) |

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

### Applications (NEW)

- `GET /api/institutions/[institutionId]/applications` - List applications with choices (paginated, filterable)
- `GET /api/courses/[id]/applications` - List applications for specific course

### Application Detail (NEW)

- `GET /api/applications/[id]/notes` - Fetch application notes
- `POST /api/applications/[id]/notes` - Create application note
- `GET /api/applications/[id]/status` - Get choice statuses
- `PATCH /api/applications/[id]/status` - Update choice status(es)
- `GET /api/applications/[id]/documents/[docId]` - Get document details
- `PATCH /api/applications/[id]/documents/[docId]` - Update document review status (approve/flag)
- `GET /api/applications/[id]/student-number` - Get student numbers (access controlled)

### Application Choices (NEW)

- `GET /api/application-choices/[choiceId]` - Get specific choice
- `PATCH /api/application-choices/[choiceId]` - Update choice status

### Agent Sessions (NEW)

- `GET /api/institutions/[institutionId]/agent-sessions` - List recent agent sessions (limit 20)
- `POST /api/institutions/[institutionId]/agent-sessions` - Create agent session (admin/reviewer only)

### Notifications (NEW)

- `POST /api/notifications/whatsapp` - Send WhatsApp notification via Twilio
  - Types: `document_flagged`, `status_update`, `reminder`
  - Auto-formats SA phone numbers to WhatsApp format

### Backend Agent Execution (NEW)

Python FastAPI router for CrewAI execution. Located at `apps/backend/src/one_for_all/api/routers/agents.py`.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/agents/document-review/execute` | Execute DocumentReviewerCrew |
| `POST /api/v1/agents/aps-ranking/execute` | Execute APSRankingCrew |
| `POST /api/v1/agents/reviewer-assistant/execute` | Execute ReviewerAssistantCrew |
| `POST /api/v1/agents/analytics/execute` | Execute AnalyticsCrew |

**Request/Response:**
```python
class ExecuteRequest(BaseModel):
    session_id: str

class ExecuteResponse(BaseModel):
    success: bool
    session_id: str
    result: dict | None
    error: str | None
```

---

## Database Migrations

### Role System
| Migration | Purpose |
|-----------|---------|
| `011_institution_roles.sql` | Creates `institution_roles` table with RLS, auto-seeds admin role |

### Applications System (NEW)
| Migration | Purpose |
|-----------|---------|
| `012_export_applications_permission.sql` | Adds export_applications permission |
| `013_course_dates.sql` | Course opening/closing dates for computed status |
| `014_application_choices.sql` | Application choices table (priority, status, review metadata) |
| `015_migrate_application_choices.sql` | Migrate existing applications to choices |
| `016_student_numbers.sql` | Student numbers table (platform + institution) |
| `017_seed_student_number_formats.sql` | Seed institution student number formats |
| `019_application_notes.sql` | Application notes table with color/type |
| `020_document_flagging.sql` | Document flagging fields (review_status, flag_reason) |

### Agent Sandbox (NEW)
| Migration | Purpose |
|-----------|---------|
| `024_agent_sandbox.sql` | Agent sessions, decisions, saved charts tables with RLS |

---

## Scripts

### Bun Agent Runner (NEW)

Background worker that polls for pending agent sessions and triggers Python execution.

| Script | Path | Purpose |
|--------|------|---------|
| **agent-runner.ts** | `apps/dashboard/scripts/agent-runner.ts` | Poll pending sessions, trigger backend crews |

**Run command:**
```bash
pnpm agent-runner  # or: bun run scripts/agent-runner.ts
```

**Architecture:**
```
agent-runner.ts (Bun)
    │
    ├── Polls agent_sessions (status=pending) every 2s
    ├── Updates status to "running"
    ├── Calls Python backend: POST /api/v1/agents/[type]/execute
    └── Updates status to "completed" or "failed" with output_result
```

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for DB access
- `BACKEND_URL` - Python backend URL (default: http://localhost:8000)
