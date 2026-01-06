# Removed Components Report

> Date: 2026-01-06
> Branch: registration_consolidation
> Audit Reason: Pre-merge cleanup to remove orphaned/unused components

## Summary

During the component audit, **12 components/files** were identified as orphaned (not imported by any active code paths) and removed from the codebase.

---

## Removed Components

### Category 1: UI Components (Not Imported)

| File | Path | Reason |
|------|------|--------|
| **StatusDot.tsx** | `components/ui/` | Not imported anywhere |
| **StatRow.tsx** | `components/ui/` | Not imported anywhere |

### Category 2: Dashboard Components (Replaced)

| File | Path | Reason |
|------|------|--------|
| **SettingsModal.tsx** | `components/dashboard/` | Replaced by SettingsDropdown |
| **ThreeColumnLayout.tsx** | `components/dashboard/` | Replaced by MasterDetailLayout |

### Category 3: Legacy Registration System (Replaced by /register route)

| File | Path | Reason |
|------|------|--------|
| **RegistrationModal.tsx** | `components/modals/` | Registration moved to /register route |
| **registrationStore.ts** | `lib/stores/` | Replaced by unifiedRegistrationStore |

### Category 4: Legacy Setup System (Orphaned Chain)

| File | Path | Reason |
|------|------|--------|
| **SetupTrigger.tsx** | `components/setup/` | Not imported by any active component |
| **InstitutionSetupWizard.tsx** | `components/setup/` | Only used by SetupTrigger (orphaned) |
| **SetupEditor.tsx** | `components/setup/` | Only used by InstitutionSetupWizard (orphaned) |

### Category 5: Legacy Registration Steps (Only used by RegistrationModal)

| File | Path | Reason |
|------|------|--------|
| **ClerkSignUp.tsx** | `components/auth/RegistrationSteps/` | Only used by RegistrationModal |
| **UserTypeSelection.tsx** | `components/auth/RegistrationSteps/` | Only used by RegistrationModal |
| **InstitutionTypeSelection.tsx** | `components/auth/RegistrationSteps/` | Only used by RegistrationModal |
| **InstitutionDetails.tsx** | `components/auth/RegistrationSteps/` | Only used by RegistrationModal |
| **ReviewSubmit.tsx** | `components/auth/RegistrationSteps/` | Only used by RegistrationModal |

---

## Orphan Chain Analysis

The legacy registration system formed an orphan chain:

```
Hero.tsx (landing page)
│
├── $ register → Link to /register (NEW - active)
│
└── RegistrationModal (import exists but unused)
    ├── registrationStore.ts
    └── components/auth/RegistrationSteps/
        ├── ClerkSignUp.tsx
        ├── UserTypeSelection.tsx
        ├── InstitutionTypeSelection.tsx
        ├── InstitutionDetails.tsx
        └── ReviewSubmit.tsx
```

Similarly, the legacy setup system:

```
(No active importer)
│
└── SetupTrigger.tsx
    └── InstitutionSetupWizard.tsx
        └── SetupEditor.tsx
```

---

## Components Kept (Verified Active)

The following components were initially flagged but verified as actively used:

| Component | Path | Used By |
|-----------|------|---------|
| **ModalHeader.tsx** | `components/ui/` | LoginModal.tsx, DottedModal.tsx |
| **SyntaxText.tsx** | `components/ui/` | FormField.tsx |

---

## Replacement Mapping

| Removed | Replaced By | Notes |
|---------|-------------|-------|
| RegistrationModal | `/register` route | Page-based registration flow |
| registrationStore | unifiedRegistrationStore | Consolidated state management |
| SettingsModal | SettingsDropdown | Dropdown preferred over modal |
| ThreeColumnLayout | MasterDetailLayout | Better UX with master-detail pattern |
| SetupEditor | SetupEditorMasterDetail | Tree-based editor preferred |
| InstitutionSetupWizard | Unified registration flow | Integrated into /register workflow |
| auth/RegistrationSteps/* | registration/steps/* | New unified step components |

---

## Verification

After removal:
- `pnpm type-check` - 0 errors
- `pnpm test` - All tests passing
- `pnpm lint` - No new errors

---

## Notes

1. **Hero.tsx cleanup**: The import statement for RegistrationModal was left as a comment but the component was no longer rendered. This import has been cleaned up.

2. **setup/index.ts cleanup**: Exports for removed components (SetupTrigger, InstitutionSetupWizard, SetupEditor) have been removed.

3. **No breaking changes**: All removed components were part of orphan chains with no active importers.
