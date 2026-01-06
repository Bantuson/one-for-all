# Dashboard Component Inventory

> Generated: 2026-01-06
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
| **TeamInviteStep** | `components/setup/TeamInviteStep.tsx` | Team invitation form |
| **InstitutionSelector** | `components/setup/InstitutionSelector.tsx` | Pre-configured institution selector |
| **InstitutionPreview** | `components/setup/InstitutionPreview.tsx` | Institution data preview |

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

### Authentication
- `GET /api/auth/session-check` - Session validation
- `POST /api/webhooks/clerk` - Clerk webhooks
