# Admin Panel Layout Improvement Plan

## Problem Statement
Current admin panel lacks:
1. No sidebar navigation - difficult to navigate between sections
2. No back buttons on subpages (order details, anomalies)
3. No dedicated affiliates management page - hidden in domains config
4. Layout looks unprofessional - each page is self-contained with no shared structure

## Solution Overview
Create a professional admin layout with sidebar navigation, add missing affiliates page, and add back buttons to subpages.

## Implementation Steps

### Step 1: Create Admin Layout Component
**File:** `src/app/admin/layout.tsx`

Create a shared layout with:
- Fixed sidebar on the left with navigation links
- Main content area on the right
- User info and logout button in sidebar header
- Active link highlighting

Navigation items:
- Dashboard (/admin)
- Affiliates (/admin/affiliates) - NEW
- Domains (/admin/domains)
- Products (/admin/products)
- Orders (/admin/orders)
- Anomalies (/admin/orders/anomalies)
- Logs (/admin/logs)
- Audit (/admin/audit)

### Step 2: Create Affiliates Management Page
**File:** `src/app/admin/affiliates/page.tsx`

Dedicated page for managing affiliates:
- List all affiliates with status, code, name
- Create new affiliate form
- Edit affiliate (name, secrets, active status)
- Move affiliate creation from AdminConfigPanel to this page

**API:** Already exists at `src/app/api/admin/affiliates/route.ts`
- POST: Create/update affiliate
- PATCH: Update affiliate status

### Step 3: Add Back Navigation to Subpages
Add back button to:
- `src/app/admin/orders/[orderId]/page.tsx` - Back to orders
- `src/app/admin/orders/anomalies/page.tsx` - Back to orders (or dashboard)

### Step 4: Simplify AdminConfigPanel
**File:** `src/components/admin/admin-config-panel.tsx`

Remove affiliate management section (moved to dedicated page).
Keep: domains, return URLs, webhook endpoints, Stripe bindings.

### Step 5: Update Admin Dashboard
**File:** `src/app/admin/page.tsx`

- Add link to new affiliates page
- Remove inline styles that duplicate layout
- Simplify since sidebar now handles navigation

## Design Specifications

### Sidebar Styling (consistent with existing dark theme)
```tsx
// Sidebar container
className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-white/10"

// Navigation link (inactive)
className="flex items-center gap-3 px-5 py-3 text-slate-400 hover:text-white hover:bg-white/5"

// Navigation link (active)
className="flex items-center gap-3 px-5 py-3 text-white bg-white/10"

// Section header
className="px-5 py-3 text-xs uppercase tracking-wider text-slate-500"
```

### Back Button Styling
```tsx
className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
```

## Files to Modify/Create

| Action | File |
|--------|------|
| Create | `src/app/admin/layout.tsx` |
| Create | `src/app/admin/affiliates/page.tsx` |
| Modify | `src/app/admin/page.tsx` |
| Modify | `src/app/admin/orders/[orderId]/page.tsx` |
| Modify | `src/app/admin/orders/anomalies/page.tsx` |
| Modify | `src/components/admin/admin-config-panel.tsx` |

## Verification
1. Run `npm run dev`
2. Navigate to `/admin` - should see sidebar
3. Click each nav item - should navigate correctly
4. Go to `/admin/affiliates` - new page should work
5. Go to order detail - back button should work
6. Test all existing functionality still works
