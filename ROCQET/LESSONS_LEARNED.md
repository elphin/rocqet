# Lessons Learned - ROCQET Development

## 🔴 CRITICAL: Framer Motion Drag & Drop with React 19 (2025-08-26)

### Problem: Drag-and-drop completely broken in chain builder
**What happened**: Spent 3+ hours debugging why drag-and-drop wasn't working at all. Items wouldn't drag, and when they did, animations were glitchy and state wasn't persisting.

**Root causes**: 
1. **Framer Motion v10 incompatible with React 19** - Silent failure, no errors!
2. **onClick handler conflicting with drag** - Card had global click handler preventing drag
3. **State separation issue** - Configuring items were rendered outside Reorder.Group
4. **Performance with complex DOM** - Transparent/complex elements caused stuttering

**Solution**:
```bash
# 1. Upgrade Framer Motion for React 19 compatibility
npm install framer-motion@12.23.12  # v10 → v12

# 2. Remove conflicting onClick from draggable area
# 3. Keep all items in single Reorder.Group
# 4. Use drag={canDrag} to selectively disable dragging
```

**Final working pattern**:
```typescript
<Reorder.Group values={steps} onReorder={setSteps}>
  {steps.map((step) => {
    const canDrag = !step.isConfiguring && !step.isNew;
    return (
      <Reorder.Item
        key={step.id}
        value={step}
        drag={canDrag}  // Control drag per item
        whileDrag={canDrag ? { scale: 1.02 } : undefined}
      >
        <motion.div layout="position">  // Not layout (prevents stretch)
          <StepCard />
        </motion.div>
      </Reorder.Item>
    );
  })}
</Reorder.Group>
```

**Key learnings**:
1. **Always check React version compatibility** - Framer Motion v10 doesn't work with React 19!
2. **Test with simple components first** - We created test pages that revealed the issue
3. **Solid backgrounds drag better** - Performance issue with transparent/complex elements
4. **Keep items in single container** - Don't split draggable/non-draggable into separate groups
5. **Use `layout="position"`** - Prevents ugly stretch animations on size changes

**Debug approach that worked**:
1. Created minimal test component (`chain-builder-auto-animate.tsx`)
2. Tested with solid color blocks vs complex UI
3. Identified that simple elements worked fine
4. Applied learnings to main component

**Time wasted**: 3+ hours
**Time it should take next time**: 5 minutes (check package compatibility first!)

## 🔴 CRITICAL: Next.js 15 Breaking Changes (2025-08-23)

### Problem: ChunkLoadError and routing issues after upgrading to Next.js 15
**What happened**: After upgrading from Next.js 14 to 15.5.0, all dynamic routes were broken. The edit page would redirect to /dashboard, and ChunkLoadErrors appeared.

**Root cause**: 
- Next.js 15 introduced a breaking change: `params` in dynamic routes must now be awaited
- This affects ALL server components with dynamic segments like `[workspace]`, `[id]`, `[slug]`
- Direct access to `params.workspace` now causes runtime errors

**Solution Pattern**:
```typescript
// ❌ OLD (Next.js 14)
export default function MyPage({
  params
}: {
  params: { workspace: string }
}) {
  // Direct usage
  const data = await fetch(`/api/${params.workspace}`);
}

// ✅ NEW (Next.js 15)
export default async function MyPage({
  params
}: {
  params: Promise<{ workspace: string }>  // Note: Promise type
}) {
  const { workspace: workspaceSlug } = await params;  // Must await!
  const data = await fetch(`/api/${workspaceSlug}`);
}
```

**Files that need this pattern**:
- All server components in `app/[workspace]/...`
- All dynamic route pages like `app/invite/[id]/page.tsx`
- Layout files with dynamic segments

**Key learnings**:
1. Always check Next.js migration guides before upgrading major versions
2. This change is for better performance (parallel data fetching)
3. Client components ('use client') don't need this change
4. Update CLAUDE.md to reflect current tech stack versions

**Impact**: High - Breaks all dynamic routing if not fixed

### Client Components Pattern
For client components ('use client'), use the `React.use()` hook:

```typescript
// ✅ Client Component (Next.js 15)
'use client';
import { use } from 'react';

export default function MyClientPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = use(params);  // Use React.use() hook
  
  // Now use workspace and id in your component
  useEffect(() => {
    // fetch data
  }, [workspace, id]);  // Safe to use in dependencies
}
```

**Files updated with this pattern**:
- `src/app/[workspace]/prompts/[id]/edit/page.tsx`
- `src/app/[workspace]/prompts/[id]/test/page.tsx`
- `src/app/[workspace]/settings/page.tsx`

---

## RLS (Row Level Security) Best Practices

### Problem: Infinite recursion in RLS policies
**What happened**: Spent hours debugging "infinite recursion detected in policy for relation admin_users" when trying to read tier_configurations.

**Root cause**: 
- tier_configurations had policies checking admin_users
- admin_users had RLS policies that self-referenced
- This created an infinite loop

**Correct approach**:
```sql
-- Public data should NOT have RLS
ALTER TABLE tier_configurations DISABLE ROW LEVEL SECURITY;

-- Only use RLS for truly private data
-- Admin restrictions should be in application layer for public data
```

**Lesson**: Don't over-engineer security. Public pricing data doesn't need RLS.

---

## Jest Worker Issues on Windows

### Problem: "Jest worker encountered 2 child process exceptions"
**What happened**: Next.js 14 compilation kept failing with Jest worker errors on Windows.

**Root cause**: Windows + Next.js 14 + certain Node versions = Jest worker conflicts

**Solution**:
```json
// package.json
"scripts": {
  "dev": "cross-env JEST_WORKER_DISABLE=true next dev"
}
```

**Better long-term solution**: Consider Docker or WSL2 for consistent dev environment.

---

## Database Migration Strategy

### What works:
```javascript
// Direct PostgreSQL connection with pg package
import pg from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.query(sqlString);
```

### What doesn't work:
- Drizzle migrations with Supabase (connection issues)
- Supabase CLI migrations (requires different setup)
- Running SQL through Supabase client (RLS complications)

---

## Architecture Decisions Log

### ✅ GOOD: Disabling RLS on public tables
- Pricing tiers are public information
- Simplifies queries
- Improves performance
- Admin checks in application layer

### ❌ BAD: Complex nested RLS policies
- Hard to debug
- Can cause recursion
- Performance overhead
- Cache invalidation issues

---

## Development Environment Setup

### Required for Windows development:
```env
# .env file
JEST_WORKER_DISABLE=true
NODE_OPTIONS=--max-old-space-size=4096
```

### Package requirements:
```json
"devDependencies": {
  "cross-env": "^10.0.0",  // Critical for Windows
  "dotenv": "^17.2.1",      // For migrations
  "pg": "^8.16.3"           // For direct DB access
}
```

---

## Time Wasters to Avoid

1. **Don't debug RLS recursion** - Just disable RLS if data is public
2. **Don't fight Jest workers** - Just disable them on Windows
3. **Don't use complex RLS hierarchies** - Keep it simple
4. **Don't ignore caching** - Restart dev server after DB changes
5. **Don't use Drizzle migrations with Supabase** - Use pg directly

---

## Quick Fixes vs Real Solutions

### Quick Fixes (acceptable for now):
- Disabling Jest workers (Windows compatibility)
- Using .env for Node options

### Real Solutions (implemented):
- Removing unnecessary RLS from public tables
- Direct PostgreSQL migrations with pg package
- Proper error handling and logging

### Future Improvements Needed:
- [ ] Docker development environment
- [ ] Automated migration runner
- [ ] Better error messages for common issues
- [ ] Health check endpoint for debugging

---

## Debugging Checklist for Future Issues

When something doesn't work:
1. Check browser console AND terminal output
2. Check if it's a caching issue (restart dev server)
3. Check if it's RLS related (test query directly in database)
4. Check if it's Windows-specific (Jest, path issues)
5. Check if Supabase service is working (status page)

---

## Commands That Actually Work

```bash
# Fix Jest worker issues
npm install cross-env
echo "JEST_WORKER_DISABLE=true" >> .env

# Run database migrations
node scripts/run-database-setup.mjs

# Test database queries
node scripts/test-tiers.mjs

# Kill stuck ports
npx kill-port 3000 3001 3002

# Check RLS policies
node scripts/check-policies.mjs
```

---

## Time Analysis of Billing Page Issue

**Total time spent**: ~2 hours
**Actual fix needed**: 5 minutes (disable RLS)

**Time breakdown**:
- 45 min: Trying different RLS policies
- 30 min: Debugging Jest worker issues (separate problem)
- 20 min: Fighting Supabase caching
- 15 min: Creating migration scripts
- 10 min: Actual solution

**What we should have done**:
1. Question if RLS is needed (5 min)
2. Disable RLS on public table (2 min)
3. Test (2 min)
4. Done ✅

**Key insight**: Sometimes the best security is no security (for public data).