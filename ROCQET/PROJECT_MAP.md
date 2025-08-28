# 🗺️ ROCQET Project Map
*Last Updated: 2025-08-23*

## 📍 Quick Navigation Guide

### 🎯 Main Pages & Their Components

#### 1. **Prompts Page** (`/[workspace]/prompts`)
```
Route: /[workspace]/prompts
Main File: src/app/[workspace]/prompts/page.tsx
Client Component: src/app/[workspace]/prompts/prompts-page-with-bulk.tsx

Components Used:
- WorkspaceSidebar (src/components/workspace-sidebar.tsx)
- AppHeader (src/components/layout/AppHeader.tsx)
- Button (src/components/ui/button.tsx)
- Bulk Action Modals (src/components/modals/bulk-actions-modals.tsx)

Features:
- Filter bar (search, tags, folders, favorites, sort)
- Bulk actions (select multiple, move, tag, delete, share)
- Table view with pagination
```

#### 2. **Prompt Detail Page** (`/[workspace]/prompts/[slug]`)
```
Route: /[workspace]/prompts/[slug]
Main File: src/app/[workspace]/prompts/[slug]/page.tsx
Client Component: src/components/prompt-detail-client.tsx

Components Used:
- PromptPlayground (src/components/prompt-playground.tsx)
- PromptVersionHistory (src/components/prompt-version-history.tsx)
- TagInput (src/components/tag-input.tsx)
- ShareModal (src/components/modals/share-modal.tsx)
```

#### 3. **Chains Page** (`/[workspace]/chains`)
```
Route: /[workspace]/chains
Main File: src/app/[workspace]/chains/page.tsx
Client Component: src/app/[workspace]/chains/client-page.tsx

Components Used:
- EmptyStates (src/components/empty-states.tsx)
- ChainCard (inline component)
```

#### 4. **Chain Edit Page** (`/[workspace]/chains/[id]/edit`)
```
Route: /[workspace]/chains/[id]/edit
Main File: src/app/[workspace]/chains/[id]/edit/page.tsx
Client Component: src/app/[workspace]/chains/[id]/edit/client-page.tsx

Components Used:
- PromptSearchModal (src/components/prompt-search-modal.tsx) ⭐ Beautiful filter bar source!
- DndContext for drag & drop
```

#### 5. **Dashboard** (`/[workspace]/dashboard`)
```
Route: /[workspace]/dashboard
Main File: src/app/[workspace]/dashboard/page.tsx
Components: Various stat cards and widgets
```

#### 6. **Settings Pages**
```
AI Providers: src/app/[workspace]/settings/ai-providers/page.tsx
Team: src/app/[workspace]/settings/team/page.tsx
Billing: src/app/[workspace]/settings/billing/page.tsx
General: src/app/[workspace]/settings/page.tsx
```

---

## 🧩 Shared Components Map

### Layout Components
- **AppHeader** (`src/components/layout/AppHeader.tsx`)
  - Dark/Light mode toggle
  - Search bar
  - Profile dropdown
  - Notifications

- **WorkspaceSidebar** (`src/components/workspace-sidebar.tsx`)
  - Navigation menu
  - Workspace switcher
  - User info

### UI Components
```
src/components/ui/
├── button.tsx         - Primary button component
├── dropdown-menu.tsx  - Dropdown menus
├── skeleton.tsx       - Loading skeletons
├── sonner.tsx        - Toast notifications
└── switch.tsx        - Toggle switches
```

### Modal Components
```
src/components/modals/
├── bulk-actions-modals.tsx  - Bulk move, tag, delete, share
├── share-modal.tsx          - Individual share modal
└── folder-modal.tsx         - Folder create/edit
```

### Feature Components
```
src/components/
├── prompt-search-modal.tsx    ⭐ Has the beautiful filter bar!
├── prompt-playground.tsx      - Test prompts with AI
├── prompt-version-history.tsx - Git-style version history
├── tag-input.tsx             - Tag management
├── folder-tree.tsx           - Folder hierarchy
├── api-key-manager.tsx       - API key CRUD
└── workspace-switcher.tsx    - Switch between workspaces
```

---

## 🔄 Component Usage Pattern

### Filter Bar Pattern (REUSABLE)
**Source**: `src/components/prompt-search-modal.tsx` (lines 250-400)
**Currently Used In**:
- ✅ Chain Edit Page (Select Prompt Modal)
- ✅ Prompts Page (after our fix)

**Should Be Applied To**:
- [ ] Chains overview page
- [ ] Dashboard search
- [ ] Any future listing pages

### Table Pattern
**Source**: `src/app/[workspace]/prompts/prompts-page-with-bulk.tsx`
**Features**:
- Bulk selection
- Inline actions
- Pagination
- Sorting

---

## 📁 API Routes

```
src/app/api/
├── folders/
│   ├── route.ts           - GET, POST, DELETE
│   └── [id]/route.ts      - PATCH, DELETE (dynamic)
├── prompts/
│   ├── route.ts           - GET, POST
│   └── [id]/route.ts      - PATCH, DELETE
├── chains/
│   ├── route.ts           - GET, POST
│   └── [id]/route.ts      - PATCH, DELETE
├── workspace/
│   └── invite/route.ts    - POST (send invites)
└── workspace-prompts/route.ts - GET (workspace specific)
```

---

## 🎨 Styling Patterns

### Color Usage
- **Primary**: `primary`, `primary-dark`, `primary-light`
- **Neutral**: `neutral-50` to `neutral-900`
- **Semantic**: `success`, `warning`, `error`, `info`

### Common Classes
```css
/* Buttons */
"flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"

/* Dropdowns */
"absolute top-full mt-2 right-0 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50"

/* Active state */
"bg-blue-50 dark:bg-blue-900/20 text-blue-600"
```

---

## 🚨 Common Pitfalls

1. **Wrong Component Import**
   - Check this map before editing
   - `prompts-page-with-bulk.tsx` NOT `client-page.tsx`

2. **Dark Mode**
   - Always include `dark:` variants
   - Use `neutral` scale for grays

3. **Workspace Context**
   - Everything is workspace-scoped
   - Always include `workspace_id` in queries

---

## 📝 Quick Reference

### To Change Filter Bar Anywhere:
1. Look at `src/components/prompt-search-modal.tsx` (lines 250-400)
2. Copy the pattern
3. Apply with consistent styling

### To Add New Page:
1. Create in `src/app/[workspace]/[feature]/page.tsx`
2. Add to sidebar navigation in `workspace-sidebar.tsx`
3. Follow workspace-first pattern

### To Modify Table:
1. Reference `prompts-page-with-bulk.tsx`
2. Keep bulk actions pattern
3. Include loading states

---

## 🔍 Search Commands

```bash
# Find where a component is used
grep -r "ComponentName" --include="*.tsx" --include="*.ts"

# Find all pages
ls src/app/[workspace]/*/page.tsx

# Find all API routes
ls src/app/api/*/route.ts
```