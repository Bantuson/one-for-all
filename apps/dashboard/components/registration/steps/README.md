# Registration Step Components

This directory contains the step components for the unified registration flow. Each step is a thin adapter that connects existing UI patterns to the new `unifiedRegistrationStore`.

## Step Components

### 1. AuthStep.tsx
- **Purpose**: Handles Clerk authentication (sign up / sign in)
- **Store Actions**: `setClerkUserId()`, `nextStep()`
- **Features**:
  - Clerk SignUp/SignIn forms with virtual routing
  - Automatic institution check for existing users
  - Toggle between sign-up and sign-in modes
  - Terminal-style authentication status display

### 2. InstitutionTypeStep.tsx
- **Purpose**: Institution type selection
- **Store Actions**: `setInstitutionType(type)`, `nextStep()`, `prevStep()`
- **Features**:
  - 4 institution types: university, college, nsfas, bursary_provider
  - Icon-based grid layout
  - Back navigation
  - Terminal-style syntax highlighting

### 3. InstitutionDetailsStep.tsx
- **Purpose**: Institution details form
- **Store Actions**: `updateInstitutionData(data)`, `nextStep()`, `prevStep()`
- **Features**:
  - React Hook Form with Zod validation
  - Auto-slug generation from name
  - Logo upload support (TODO: actual storage integration)
  - Syntax-styled form fields
  - Fields: name, slug, contactEmail, contactPhone, website, logo

## Store Integration

All steps use the `useUnifiedRegistrationStore` from `/lib/stores/unifiedRegistrationStore.ts`:

```tsx
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'

// In component:
const { setUserType, nextStep, prevStep } = useUnifiedRegistrationStore()
```

## Design Patterns

### Terminal-Style Aesthetics
- Syntax highlighting with color classes: `text-syntax-export`, `text-syntax-key`, `text-syntax-string`
- Comment-style descriptions: `<span className="text-traffic-green">//</span>`
- Monospace font: `font-mono`
- Code-like structure with braces and variable declarations

### Navigation
- `CommandButton` for primary actions (e.g., "$ continue --registration")
- `BackCommand` for backward navigation
- Automatic step progression via `nextStep()/prevStep()`

### Form Validation
- Zod schemas for type-safe validation
- React Hook Form for form state management
- `SyntaxFormField` components for terminal-style inputs
- Auto-generated slugs for institution URLs

## Usage

These components are rendered by `UnifiedRegistrationPage.tsx` based on the current step in the store:

```tsx
import { AuthStep, InstitutionTypeStep, InstitutionDetailsStep } from './steps'

// In UnifiedRegistrationPage:
{currentStep === 'auth' && <AuthStep />}
{currentStep === 'institution-type' && <InstitutionTypeStep />}
{currentStep === 'institution-details' && <InstitutionDetailsStep />}
```

## Additional Steps (Steps 4-7)

The following steps are also part of the registration flow:
- `InstitutionSelectStep.tsx` - Wrapper around pre-configured institution selection
- `CustomizeStep.tsx` - Wrapper around campus/faculty/course customization
- `TeamStep.tsx` - Team member invitations
- `ConfirmStep.tsx` - Final review and submission

## Dependencies

### UI Components
- `@/components/ui/CommandButton` - Terminal-style buttons
- `@/components/ui/FormField` - Syntax-styled form fields
- `@/components/ui/FileUploadField` - Logo upload
- `@/components/ui/Button` - Standard buttons

### External
- `@clerk/nextjs` - Authentication (SignUp, SignIn, useUser)
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `lucide-react` - Icons

### Store
- `@/lib/stores/unifiedRegistrationStore` - Centralized state management

## File Structure

```
steps/
├── AuthStep.tsx               # Step 1: Authentication
├── InstitutionTypeStep.tsx    # Step 2: Institution type
├── InstitutionDetailsStep.tsx # Step 3: Institution details form
├── InstitutionSelectStep.tsx  # Step 4: Institution selection
├── CustomizeStep.tsx          # Step 5: Customize campus/faculty/courses
├── TeamStep.tsx               # Step 6: Team invitations
├── ConfirmStep.tsx            # Step 7: Final review and submission
├── index.ts                   # Barrel exports
└── README.md                  # This file
```
