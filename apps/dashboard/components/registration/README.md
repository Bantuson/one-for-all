# Unified Registration Flow

This directory contains the unified 7-step registration flow for institutional users.

## Structure

```
registration/
├── UnifiedRegistrationPage.tsx    # Main orchestrator component
├── index.ts                        # Barrel export
├── steps/                          # Individual step components
│   ├── AuthStep.tsx
│   ├── InstitutionTypeStep.tsx
│   ├── InstitutionDetailsStep.tsx
│   ├── InstitutionSelectStep.tsx
│   ├── CustomizeStep.tsx
│   ├── TeamStep.tsx
│   └── ConfirmStep.tsx
└── README.md                       # This file
```

## 7-Step Flow

1. **Auth** - Clerk authentication
2. **Institution Type** - Select institution category (University, College, NSFAS, Bursary Provider)
3. **Institution Details** - Manual entry (skipped if template mode)
4. **Institution Select** - Choose from 27 pre-configured templates (skipped if manual mode)
5. **Customize** - Edit campuses, faculties, courses using master-detail editor
6. **Team** - Invite team members with permissions (optional)
7. **Confirm** - Review and submit

## State Management

State is managed via Zustand store at `/lib/stores/unifiedRegistrationStore.ts`.

Key features:
- Auto-persists to localStorage
- Step validation via `selectCanProceed` selector
- Conditional step skipping (template vs manual mode)
- Error handling and submission state

## Usage

```tsx
import { UnifiedRegistrationPage } from '@/components/registration'

export default function RegisterPage() {
  return <UnifiedRegistrationPage />
}
```

## UI Patterns

The component follows terminal-style UI patterns:
- CodeCard containers with traffic light headers
- Syntax-highlighted labels (export, from, etc.)
- Comment-style descriptions
- CommandButton for submission
- Stepper progress indicator

## Dynamic Imports

All step components are lazy-loaded using Next.js dynamic imports with loading skeletons for optimal code splitting and performance.

## Next Steps

Create individual step components in `steps/` directory following the existing patterns from `/components/setup/` components.
