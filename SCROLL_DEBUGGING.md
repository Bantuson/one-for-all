# Independent Panel Scrolling - Debugging Report

**Date**: 2026-01-04
**Issue**: Left and right panels in SetupEditorMasterDetail scroll together instead of independently
**Status**: ❌ UNRESOLVED after multiple attempts

---

## Current Code Snippets

### 1. Main Container (Line 1661)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx`

```tsx
<div className={cn('flex flex-col h-full', className)}>
```

**Status**: ✅ Correct - Uses `h-full` and `flex-col`

---

### 2. Breadcrumb (Line 147)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx`

```tsx
<div className="fixed top-[56px] left-0 right-0 z-20 px-4 h-[77px] bg-transparent flex items-center justify-between">
```

**Status**: ✅ Fixed positioning works - breadcrumb stays at top when scrolling
**Changes Made**: Changed from `sticky top-0 bg-card` to `fixed top-[56px] bg-transparent`

---

### 3. Main Content Area (Line 1678)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx`

```tsx
<div className="flex flex-1 gap-4 mt-[77px] overflow-hidden">
```

**Status**: ✅ Has `overflow-hidden` and `mt-[77px]` for breadcrumb spacing
**Changes Made**:
- Removed `overflow-hidden` → Added back `overflow-hidden`
- Added `mt-[77px]` to create space for fixed breadcrumb

---

### 4. Left Panel Wrapper (Line 1680)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx`

```tsx
<div className="w-72 h-full overflow-hidden flex flex-col">
  <NavigationTree ... />
</div>
```

**Status**: ✅ Has `h-full` to create height constraint
**Changes Made**: Added `h-full` (was missing originally)

---

### 5. NavigationTree Scroll Container (Line 365)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx` (inside NavigationTree component)

```tsx
<div className="flex-1 overflow-y-auto p-2" role="group">
  {campuses.map((campus) => {
    // Tree nodes render here
  })}
</div>
```

**Status**: ✅ Has `flex-1` and `overflow-y-auto`
**Parent hierarchy**:
```tsx
<div className="flex flex-col h-full" role="tree"> // Line 363
  <div className="flex-1 overflow-y-auto p-2" role="group"> // Line 365
```

---

### 6. Right Panel (CampusDetailPanel) Scroll Container (Line 1270)
**File**: `apps/dashboard/components/setup/SetupEditorMasterDetail.tsx`

```tsx
<div className="flex-1 overflow-y-auto flex flex-col">
  <div className="px-4 py-3 sticky top-0 z-10">
    {/* Header */}
  </div>
  <div className="p-4 space-y-6">
    {/* Content */}
  </div>
</div>
```

**Status**: ✅ Has `flex-1` and `overflow-y-auto`

---

### 7. CodeCard Wrapper (Line 232)
**File**: `apps/dashboard/components/setup/InstitutionSetupPage.tsx`

```tsx
<CodeCard overflow="visible">
  <CodeCardHeader ... />
  <div className={currentStep === 'edit' ? '' : 'p-6'}>
    {currentStep === 'edit' && <SetupEditorMasterDetail className="min-h-[500px]" />}
  </div>
</CodeCard>
```

**Status**: ✅ Now has `overflow="visible"` prop
**Changes Made**: Added `overflow="visible"` to allow nested scrolling

---

### 8. CodeCard Component (Line 21-37)
**File**: `apps/dashboard/components/ui/CodeCard.tsx`

```tsx
export function CodeCard({ children, className, overflow = 'hidden' }: CodeCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card',
        overflow === 'hidden' && 'overflow-hidden',
        overflow === 'visible' && 'overflow-visible',
        overflow === 'auto' && 'overflow-auto',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
```

**Status**: ✅ Now accepts `overflow` prop (defaults to 'hidden')
**Changes Made**: Made overflow configurable instead of hardcoded

---

## Complete Container Hierarchy

```
<html>
  <body>
    <InstitutionSetupPage>
      <div class="flex flex-col flex-1">
        <div class="container mx-auto pb-8 px-4 pt-[40px]">
          <div class="max-w-5xl mx-auto">
            <CodeCard overflow="visible">                          ← NOW VISIBLE
              <CodeCardHeader />
              <div class="">                                       ← No padding when edit step
                <SetupEditorMasterDetail class="min-h-[500px]">
                  <div class="flex flex-col h-full">               ← Line 1661
                    ├─ <Breadcrumb                                 ← Line 1663
                    │    class="fixed top-[56px] left-0 right-0 z-20
                    │           px-4 h-[77px] bg-transparent" />
                    │
                    └─ <div class="flex flex-1 gap-4              ← Line 1678
                                   mt-[77px] overflow-hidden">
                        ├─ <div class="w-72 h-full                ← Line 1680 (LEFT PANEL)
                        │             overflow-hidden flex flex-col">
                        │   └─ <NavigationTree>
                        │       <div class="flex flex-col h-full">  ← Line 363
                        │         <div class="flex-1               ← Line 365 (SCROLL ZONE)
                        │                    overflow-y-auto p-2">
                        │           {/* Tree nodes */}
                        │
                        └─ <CampusDetailPanel>                    ← Line 1702 (RIGHT PANEL)
                            <div class="flex-1                    ← Line 1270 (SCROLL ZONE)
                                       overflow-y-auto flex flex-col">
                              <div class="px-4 py-3 sticky top-0 z-10">
                                {/* Header */}
                              </div>
                              <div class="p-4 space-y-6">
                                {/* Content */}
                              </div>
```

---

## Failed Fix Attempts (Chronological)

### Attempt 1: Make Breadcrumb Sticky (FAILED)
**Date**: First attempt
**Change**:
```tsx
// Line 147
<div className="sticky top-0 z-20 px-4 h-[77px] bg-card border-b border-border ...">
```

**Why it failed**:
- `overflow-hidden` at line 1678 breaks sticky positioning
- Sticky only works relative to a scrolling ancestor
- The breadcrumb was a sibling to the flex container, not inside it

**User feedback**: "breadcrumb still scrolls along with panels and worse you added a solid background"

---

### Attempt 2: Fixed Breadcrumb + Remove overflow-hidden (FAILED)
**Date**: Second attempt
**Changes**:
```tsx
// Line 147 - Changed sticky to fixed
<div className="fixed top-[56px] left-0 right-0 z-20 px-4 h-[77px] bg-transparent ...">

// Line 1678 - Removed overflow-hidden
<div className="flex flex-1 gap-4 mt-[77px]">

// Line 1661 - Removed pt-[3px]
<div className={cn('flex flex-col h-full', className)}>
```

**Why it failed**:
- Breadcrumb became fixed (SUCCESS)
- But panels still scrolled together
- Without `overflow-hidden`, the parent created a single scroll context

**User feedback**: "breadcrumb is sufficiently fixed on scroll but left right panel scroll together. left panel does not have its own scroll bar element"

---

### Attempt 3: Add h-full to Left Panel + Restore overflow-hidden (FAILED)
**Date**: Third attempt
**Changes**:
```tsx
// Line 1680 - Added h-full
<div className="w-72 h-full overflow-hidden flex flex-col">

// Line 1678 - Restored overflow-hidden
<div className="flex flex-1 gap-4 mt-[77px] overflow-hidden">
```

**Root cause analysis**: Left panel wrapper had no height, so NavigationTree's `h-full` was 0px

**Why it failed**:
- Theory was correct: left panel needed `h-full`
- `overflow-hidden` should force independent scroll contexts
- But panels STILL scrolled together

**User feedback**: "still scroll together"

---

### Attempt 4: Add overflow="visible" to CodeCard (FAILED)
**Date**: Fourth attempt (current)
**Root cause found**: CodeCard has hardcoded `overflow-hidden` that clips everything

**Changes**:
```tsx
// CodeCard.tsx - Made overflow configurable
interface CodeCardProps {
  overflow?: 'hidden' | 'visible' | 'auto'
}

export function CodeCard({ children, className, overflow = 'hidden' }: CodeCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-card',
      overflow === 'hidden' && 'overflow-hidden',
      overflow === 'visible' && 'overflow-visible',
      overflow === 'auto' && 'overflow-auto',
      // ...
    )}>

// InstitutionSetupPage.tsx - Pass overflow="visible"
<CodeCard overflow="visible">
```

**Why it failed**: STILL INVESTIGATING

**User feedback**: "still scroll together"

---

## Current Theory: Why It's Still Not Working

### Possible Issues:

1. **Parent Container Above CodeCard**:
   - InstitutionSetupPage might have a scrolling container
   - Check line 200: `<div className="container mx-auto pb-8 px-4 pt-[40px]">`
   - This might be the actual scroll container

2. **Fixed Breadcrumb Breaks Layout Flow**:
   - Fixed positioning removes element from normal flow
   - The `mt-[77px]` might not be creating proper spacing
   - Content might be overflowing the parent instead of panels scrolling independently

3. **Height Calculation Issues**:
   - `h-full` cascades: Main (1661) → Flex (1678) → Left wrapper (1680) → NavigationTree (363) → Scroll zone (365)
   - If any parent breaks the chain, `h-full` becomes 0px
   - CodeCard might not have a defined height

4. **min-h-[500px] Conflict**:
   - SetupEditorMasterDetail has `className="min-h-[500px]"`
   - This is a MINIMUM height, not a maximum
   - Content can still grow beyond 500px and cause page scrolling

5. **CSS Specificity or Runtime Issues**:
   - Tailwind classes might not be applying correctly
   - Browser might be caching old styles
   - Check DevTools computed styles

---

## Debugging Steps Needed

### 1. Verify Classes Are Applied
Open browser DevTools and check:
```
SetupEditorMasterDetail container (1661):
  - Should have: display: flex, flex-direction: column, height: 100%

Main content area (1678):
  - Should have: display: flex, flex: 1, overflow: hidden, margin-top: 77px

Left panel wrapper (1680):
  - Should have: width: 18rem, height: 100%, overflow: hidden, display: flex, flex-direction: column

NavigationTree scroll zone (365):
  - Should have: flex: 1, overflow-y: auto

Right panel (1270):
  - Should have: flex: 1, overflow-y: auto, display: flex, flex-direction: column

CodeCard:
  - Should have: overflow: visible (NOT overflow: hidden)
```

### 2. Check Computed Heights
In DevTools:
```
- SetupEditorMasterDetail: Check actual height value
- Main content area (1678): Check if flex: 1 is computing a height
- Left panel wrapper (1680): Check if h-full is resolving to a number
- NavigationTree scroll zone (365): Check if it has a bounded height
```

### 3. Test Scroll Behavior
In DevTools:
```
- Add content to NavigationTree to make it overflow
- Add content to CampusDetailPanel to make it overflow
- Check which element actually has the scrollbar
- Use "Scroll into view" to see which container scrolls
```

### 4. Inspect Parent Containers
```
- Check InstitutionSetupPage container classes
- Check if body or any parent has overflow-y-auto
- Look for any global CSS that might affect scrolling
```

---

## Key Questions to Answer

1. **Where is the actual scroll happening?**
   - Is it the body?
   - Is it the page container?
   - Is it CodeCard?
   - Or is it the individual panels?

2. **Are the CSS classes actually applied?**
   - Check DevTools computed styles
   - Verify Tailwind is generating the classes
   - Check for class name conflicts

3. **Is there enough content to trigger scrolling?**
   - NavigationTree needs more content than available height
   - CampusDetailPanel needs more content than available height
   - If content fits, no scrollbar appears

4. **Is there a JavaScript issue?**
   - Check console for errors
   - Verify React is rendering correctly
   - Check if dynamic classes are applying

---

## Next Steps

1. **Browser DevTools Inspection** (REQUIRED):
   - Open the page in browser
   - Inspect SetupEditorMasterDetail
   - Check computed styles for all containers
   - Identify where scrolling is actually happening

2. **Add Debug Borders**:
   ```tsx
   // Temporarily add to see container boundaries
   <div className="... border-4 border-red-500"> // Main container
   <div className="... border-4 border-blue-500"> // Flex container
   <div className="... border-4 border-green-500"> // Left panel
   <div className="... border-4 border-yellow-500"> // Right panel
   ```

3. **Test with Minimal Content**:
   - Remove most of the content
   - Add a single tall div to each panel
   - See if scrolling works with simple setup

4. **Check Parent Page**:
   - Inspect InstitutionSetupPage container
   - Check if it has overflow or height constraints
   - Verify CodeCard is in the right part of the tree

---

## Summary

**What's Working**:
- ✅ Breadcrumb stays fixed at top
- ✅ All scroll-related classes are correctly applied in code
- ✅ CodeCard no longer has hardcoded `overflow-hidden`

**What's Not Working**:
- ❌ Panels still scroll together
- ❌ No independent scrollbars visible
- ❌ Root cause unclear despite deep investigation

**Code Changes Made**:
1. Breadcrumb: `sticky` → `fixed`, removed solid background
2. Main content: Added `overflow-hidden` and `mt-[77px]`
3. Left panel wrapper: Added `h-full`
4. CodeCard: Made overflow configurable, set to `"visible"`

**Next Critical Step**: Browser DevTools inspection to see actual computed styles and identify where scrolling is occurring.
