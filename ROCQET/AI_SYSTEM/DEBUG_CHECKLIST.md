# 🐛 DEBUG CHECKLIST - Quick Fixes for Common Issues

## 🚨 WHEN TO USE THIS
Use this checklist IMMEDIATELY when you encounter:
- Syntax errors
- JSX parsing errors  
- Build failures
- Runtime errors
- Hydration mismatches

---

## 🎯 SYNTAX/JSX ERRORS - 30 Second Fix

### 1. READ THE ERROR MESSAGE FIRST!
```
Error: '}' expected. (916:13)  
        ^^^^^^^ THIS IS THE EXACT LINE!
```
**ACTION:** Go DIRECTLY to that line number. Don't guess elsewhere!

### 2. Run Prettier Check (Shows exact location)
```bash
npx prettier --check path/to/file.tsx
```
This gives you the EXACT location with context!

### 3. TypeScript Compiler Check
```bash
npx tsc --noEmit
```
Often gives better error messages than Next.js

### 4. Common JSX Gotchas - Check These First!
```jsx
❌ {/* Comment */      → ✅ {/* Comment */}
❌ <div>               → ✅ <div></div>
❌ {condition && (}    → ✅ {condition && ()}  
❌ onClick={function}  → ✅ onClick={() => function()}
```

---

## 🔥 SERVER/BUILD ERRORS

### Port Already in Use (Port 3000)
```bash
# ALWAYS safe to kill for this project
npx kill-port 3000 3001 3002
```

### Module Not Found / Webpack Errors
```bash
# Nuclear option - clears all cache
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

### Missing Dependencies
```bash
# Check what's missing
npm ls
# Install missing packages
npm install
```

---

## 💧 HYDRATION ERRORS

### Date Formatting Mismatch
```typescript
// ❌ BAD - Different on server/client
date.toLocaleDateString()

// ✅ GOOD - Consistent everywhere  
date.toLocaleDateString('en-US', {
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit'
})
```

### Dynamic Content
```jsx
// ❌ BAD
<div>{Math.random()}</div>

// ✅ GOOD
const [value, setValue] = useState(null);
useEffect(() => setValue(Math.random()), []);
<div>{value}</div>
```

---

## 🔍 DEBUGGING STRATEGIES

### 1. Binary Search (For Large Files)
```jsx
// Comment out half the component
// {/* 
//   <ProblematicSection />
// */}
// If error gone = problem is in commented section
// If error remains = problem is in other half
```

### 2. Git Diff Check
```bash
# See what you changed recently
git diff HEAD~1
# Or see all unstaged changes
git diff
```

### 3. Console Debugging
```javascript
console.log('🔍 Reached here');
console.log('📦 Data:', { variable });
console.trace('📍 Stack trace');
```

### 4. React DevTools
- Check component props
- Verify state changes
- Monitor re-renders

---

## ⚡ QUICK WINS

### VS Code Extensions That Help
- **Error Lens** - Shows errors inline
- **Pretty TypeScript Errors** - Makes TS errors readable
- **ESLint** - Catches issues before runtime

### Useful Commands
```bash
# Check for TypeScript errors
npm run type-check

# Check for linting issues  
npm run lint

# Format all files
npx prettier --write .

# Find a string in all files
grep -r "searchterm" src/
```

---

## 🎯 SPECIFIC ERROR SOLUTIONS

### "Cannot find module"
1. Check import path spelling
2. Check file extension (.ts vs .tsx)
3. Restart TS server in VS Code (Cmd+Shift+P → "Restart TS")

### "Invalid Hook Call"
1. Check you're calling hooks at top level
2. No hooks in conditions/loops
3. Check React versions match

### "Text content does not match server-rendered HTML"
1. Check for date formatting
2. Check for Math.random()
3. Check for browser-only APIs (window, document)
4. Wrap in useEffect for client-only code

### "Expression expected" / "Unexpected token"
1. Check for missing closing brackets
2. Check JSX comments: `{/* */}`
3. Check ternary operators have all parts
4. Check arrow functions syntax

---

## 📋 SYSTEMATIC APPROACH

When debugging, ALWAYS follow this order:

1. **READ** the error message completely
2. **GO TO** the exact line mentioned
3. **CHECK** for common syntax issues (brackets, quotes, semicolons)
4. **USE** Prettier to find the exact issue
5. **VERIFY** with TypeScript compiler
6. **RESTART** if needed (clear cache, restart server)

---

## 🚀 PREVENTIVE MEASURES

### Before Committing
```bash
# Run these ALWAYS before saving
npm run type-check
npm run lint
npm test
```

### Editor Settings (VS Code)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto"
}
```

---

## 💡 PRO TIPS

1. **The error is usually RIGHT WHERE it says it is** - Don't overthink!
2. **Missing `}` errors** - Often a JSX comment missing closing brace
3. **Red squiggly lines** - Trust your editor, it's usually right
4. **When in doubt** - Delete .next folder and restart
5. **Save time** - Use Prettier first, ask questions later

---

## 🔧 Project-Specific Fixes

### ROCQET/Prompt Editor Issues
- Check date utility functions are imported
- Verify Supabase client is initialized  
- Check workspace context is available
- Verify user permissions for operations

### Database/Supabase Errors
```bash
# Check Supabase status
npx supabase status

# Reset local database
npx supabase db reset

# Check migrations
npx supabase migration list
```

---

**REMEMBER:** 95% of syntax errors are:
- Missing closing bracket/brace
- Typo in variable name  
- Wrong import path
- JSX comment not closed properly

**START HERE, SAVE 15 MINUTES!**