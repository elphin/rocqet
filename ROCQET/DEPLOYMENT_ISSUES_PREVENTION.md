# 🚨 Vercel Deployment Issues Prevention Guide

## Common Deployment Errors & Solutions

### 1. ❌ Next.js 15 Route Handler Params Error

**Error:**
```
Type '{ params: { id: string } }' does not satisfy the constraint 'ParamCheck<RouteContext>'
```

**Cause:** Next.js 15 requires params to be async in route handlers.

**Prevention:**
```typescript
// ❌ WRONG - Next.js 14 style
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
}

// ✅ CORRECT - Next.js 15 style
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

**Rule:** ALWAYS make params a Promise in route handlers and await it.

---

### 2. ❌ TypeScript "Property does not exist" Errors

**Error:**
```
Property 'id' does not exist on type '{ id: any; slug: any; name: any; }[]'
```

**Cause:** TypeScript inference issues with Supabase query results.

**Prevention:**
```typescript
// ❌ WRONG - Assumes workspace is object when it might be array
const workspace = membership.workspaces;
.eq('workspace_id', workspace.id)

// ✅ CORRECT - Use type assertion
const workspace = membership.workspaces;
.eq('workspace_id', (workspace as any).id)

// ✅ BETTER - Define proper types
interface Workspace {
  id: string;
  slug: string;
  name: string;
}
const workspace = membership.workspaces as Workspace;
```

---

### 3. ❌ Missing Imports (react/jsx-no-undef)

**Error:**
```
'Globe' is not defined. react/jsx-no-undef
```

**Prevention:**
```typescript
// Always check your imports match your usage
import {
  Play,
  Globe, // <- Don't forget to import!
  Settings
} from 'lucide-react';
```

**Tool:** Use VS Code auto-import or check all Lucide icons are imported.

---

### 4. ❌ ESLint Blocking Build

**Error:**
```
Failed to compile due to ESLint errors
```

**Prevention Strategy:**

1. **Development:** Keep strict rules
2. **Production:** Relax non-critical rules in `.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    // Turn off rules that shouldn't block deployment
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "warn"
  }
}
```

---

### 5. ❌ Archived/Test Files Breaking Build

**Prevention:**
- Don't commit test files with missing dependencies
- Use `.gitignore` for experimental code:
```
# Experimental/archived code
src/**/_archived/
src/**/_test/
```

- Or ensure all imports exist before archiving

---

## 🛠️ Pre-Deployment Checklist

Before pushing to production, ALWAYS:

### 1. Run Local Build Test
```bash
npm run build
```

### 2. Fix Critical Errors Only
Focus on errors, not warnings:
- ❌ Type errors (must fix)
- ❌ Missing imports (must fix)  
- ⚠️ ESLint warnings (can ignore for deployment)
- ⚠️ React Hook deps (can ignore for deployment)

### 3. Check for Common Issues
```bash
# Check for workspace.id usage
grep -r "workspace\.id" src/

# Check for non-async params in routes
grep -r "{ params }: { params: {" src/app/api/

# Check for missing imports in components
npm run lint
```

### 4. Test After Fixes
```bash
# Clean build
rm -rf .next
npm run build

# If successful, commit and push
git add -A
git commit -m "Fix deployment issues"
git push
```

---

## 🚀 Quick Fix Commands

### Fix All TypeScript Errors
```bash
# Add type assertions to workspace.id
find src -name "*.ts*" -exec sed -i 's/workspace\.id/(workspace as any).id/g' {} \;
```

### Remove Archived Files
```bash
rm -rf src/**/_archived
rm -rf src/**/_test
```

### Update All Route Handlers
Search and replace pattern:
```
{ params }: { params: { (\w+): string } }
→
{ params }: { params: Promise<{ $1: string }> }
```

---

## 📋 Environment-Specific Settings

### Development (.env.local)
```env
# Strict mode for development
NEXT_PUBLIC_STRICT_MODE=true
```

### Production (Vercel)
```env
# Relaxed for production
NEXT_PUBLIC_STRICT_MODE=false
```

---

## 🎯 Best Practices

1. **Type Safety**
   - Define interfaces for all Supabase responses
   - Avoid `any` in new code
   - Use `unknown` when type is truly unknown

2. **Import Management**
   - Use barrel exports for components
   - Auto-import extensions in VS Code
   - Regular import cleanup

3. **Route Handlers**
   - Always use Next.js 15 async params pattern
   - Define types for params
   - Handle errors properly

4. **Pre-commit Hooks** (Optional)
   ```json
   // package.json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run build"
       }
     }
   }
   ```

---

## 🔍 Debugging Vercel Builds

### 1. Check Vercel Logs
- Go to Vercel Dashboard
- Click on failed deployment
- Check "Building" logs for exact error

### 2. Common Vercel-Only Issues
- **NODE_ENV differences**: Vercel sets `NODE_ENV=production`
- **Case sensitivity**: Linux (Vercel) vs Windows (local)
- **Missing env vars**: Check all required vars are in Vercel

### 3. Reproduce Locally
```bash
# Simulate Vercel build
NODE_ENV=production npm run build
```

---

## 📝 When Adding New Features

1. **New Route Handler?**
   - Use async params pattern
   - Test with `npm run build`

2. **New Component?**
   - Import all dependencies
   - Check for TypeScript errors

3. **New Database Query?**
   - Define return types
   - Handle array vs object results

4. **Archiving Code?**
   - Remove imports first
   - Or move to `.gitignore`'d folder

---

## 🆘 Emergency Deployment

If you need to deploy urgently and can't fix all issues:

1. **Disable ESLint for build** (temporary!)
   ```json
   // next.config.js
   module.exports = {
     eslint: {
       ignoreDuringBuilds: true
     }
   }
   ```

2. **Use type assertions liberally**
   ```typescript
   (variable as any).property
   ```

3. **Remove problematic files**
   ```bash
   git rm problematic-file.tsx
   ```

**⚠️ IMPORTANT:** Fix properly after emergency deployment!

---

## 📚 Resources

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Vercel Build Troubleshooting](https://vercel.com/docs/troubleshooting)

---

Last Updated: 2025-08-28
Common Issues Fixed: 6
Deployment Success Rate Target: 100%