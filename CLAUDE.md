# 🚀 ROCQET AI Development Instructions

## 🔴 BELANGRIJKE REMINDER VOOR CLAUDE

**SQL MIGRATIES**: Voer ALTIJD zelf SQL migraties uit via Drizzle:
1. Maak schema files in `src/lib/db/schema/`
2. Run `npm run db:generate` om migratie te genereren
3. Run `npm run db:push` en selecteer optie 1 voor nieuwe tabellen
4. VRAAG NOOIT aan de gebruiker om SQL te kopiëren naar Supabase Dashboard

**De gebruiker heeft expliciet gevraagd dat jij dit zelf doet!**

---

## ⚡ CRITICAL: Start Here Every Session!

**This is the MASTER instruction file for building ROCQET - The GitHub for AI Prompts**

---

## 📍 Session Start Protocol (ALWAYS DO THIS FIRST!)

```yaml
Step 1: Check current state
  → Read: ROCQET/AI_SYSTEM/DAILY_CONTEXT.md

Step 2: Check active tasks  
  → Read: ROCQET/AI_SYSTEM/CURRENT_SPRINT.md

Step 3: Load ONLY what you need
  → DO NOT load all documentation at once!
```

---

## 📁 Documentation Map - Where Everything Lives

### 🎯 Core Documentation
- **Product Vision**: `ROCQET/MISSION.md` - Why we're building this
- **Architecture**: `ROCQET/MASTER_PLAN.md` - Technical decisions & database schema
- **Features**: `ROCQET/FEATURES_SPECIFICATION.md` - Every feature in detail
- **Lessons**: `ROCQET/LESSONS_LEARNED.md` - CRITICAL! Avoid past mistakes

### 🤖 AI Development System
- **Context Protocol**: `ROCQET/AI_SYSTEM/CONTEXT_PROTOCOL.md` - How to load context efficiently
- **Daily Context**: `ROCQET/AI_SYSTEM/DAILY_CONTEXT.md` - Current state (UPDATE AFTER EACH TASK!)
- **Sprint Planning**: `ROCQET/AI_SYSTEM/CURRENT_SPRINT.md` - This week's goals
- **Agent Guide**: `ROCQET/AI_SYSTEM/AGENTS_USAGE.md` - When to use specialized agents

### 🏗️ Project Setup
- **Structure**: `ROCQET/INITIAL_SETUP/PROJECT_STRUCTURE.md` - Directory organization
- **Environment**: `ROCQET/INITIAL_SETUP/ENV_TEMPLATE.md` - Required env variables

---

## 🎮 Development Workflow

### For Every Feature:
```typescript
1. Read specification
   → grep -A 50 "feature_name" ROCQET/FEATURES_SPECIFICATION.md

2. Check architecture
   → grep -A 30 "relevant_section" ROCQET/MASTER_PLAN.md

3. Implement using patterns
   → Follow workspace-first architecture
   → Use server actions for mutations
   → Real-time subscriptions for updates

4. Test immediately
   → npm test
   → Manual testing in browser

5. Update progress
   → Update ROCQET/AI_SYSTEM/DAILY_CONTEXT.md
```

---

## ⚠️ CRITICAL RULES - NEVER BREAK THESE!

### ❌ NEVER DO:
1. **Large refactoring** - Read `ROCQET/LESSONS_LEARNED.md` first!
2. **Load all docs at once** - Wastes tokens, causes confusion
3. **Skip testing** - Test after EVERY feature
4. **Ignore workspace context** - Everything is workspace-first
5. **Use Prisma** - We use Drizzle ORM
6. **Use Zustand** - We use TanStack Query only
7. **Forget to update DAILY_CONTEXT.md** - Track all progress

### ✅ ALWAYS DO:
1. **Start with DAILY_CONTEXT.md** - Know where we are
2. **Progressive context loading** - Load only what's needed
3. **Follow established patterns** - Check MASTER_PLAN.md
4. **Test incrementally** - Small changes, test, repeat
5. **Update documentation** - Keep DAILY_CONTEXT.md current
6. **Think workspace-first** - Not user-first
7. **Use server actions** - For all data mutations

---

## 🏗️ Architecture Quick Reference

### Tech Stack (LOCKED IN)
```typescript
{
  framework: "Next.js 15.5.0",      // Upgraded to v15!
  react: "React 19.1.1",             // With React 19
  database: "Supabase PostgreSQL",  // With pgvector
  orm: "Drizzle",                   // NOT Prisma
  state: "TanStack Query",          // NOT Zustand
  realtime: "Supabase Realtime",
  search: "Typesense Cloud",
  auth: "Supabase Auth",            // NOT Clerk
  hosting: "Vercel"
}
```

### Core Patterns
```typescript
// Workspace-first architecture
every_entity.workspaceId // REQUIRED

// Server actions for mutations
'use server'
export async function createPrompt() { }

// Real-time subscriptions
supabase.channel().on('postgres_changes', ...)

// Git-style versioning
JSON Patch format for diffs
```

---

## 📊 Progressive Context Loading Strategy

### Level 0: Minimal (10 tokens)
```bash
cat ROCQET/AI_SYSTEM/DAILY_CONTEXT.md
```

### Level 1: Task Context (50 tokens)
```bash
cat ROCQET/AI_SYSTEM/CURRENT_SPRINT.md | grep -A 10 "today"
```

### Level 2: Feature Spec (200 tokens)
```bash
grep -A 50 "specific_feature" ROCQET/FEATURES_SPECIFICATION.md
```

### Level 3: Technical Details (varies)
```bash
grep -A 30 "Database Schema" ROCQET/MASTER_PLAN.md
```

**STOP when you have enough context!**

---

## 🔄 Session Management

### Start of Session
```bash
# 1. Check state
cat ROCQET/AI_SYSTEM/DAILY_CONTEXT.md | tail -20

# 2. Continue from last point
echo "Continuing from: [last completed task]"
```

### During Development
```bash
# After each subtask
echo "✅ Completed: [task]" >> ROCQET/AI_SYSTEM/DAILY_CONTEXT.md
```

### End of Session
```bash
# Update final status
cat >> ROCQET/AI_SYSTEM/DAILY_CONTEXT.md << EOF
Session $(date +%Y%m%d-%H%M)
- Completed: [list]
- Next: [list]
EOF
```

---

## 🎯 Current Sprint Focus

**Week 1: Foundation (Check CURRENT_SPRINT.md for details)**
- [ ] Environment setup
- [ ] Supabase configuration  
- [ ] Workspace architecture
- [ ] Core CRUD operations
- [ ] Deploy to Vercel

---

## 💡 Quick Decision Tree

```
Need to build something?
├── New feature → Read FEATURES_SPECIFICATION.md section
├── Bug fix → Check similar issues in LESSONS_LEARNED.md
├── Architecture question → Check MASTER_PLAN.md
├── How to work → Read CONTEXT_PROTOCOL.md
└── What to work on → Check CURRENT_SPRINT.md
```

---

## 🚨 Common Pitfalls to Avoid

1. **The Refactoring Trap**
   - We lost 70% functionality trying to "improve" architecture
   - Solution: Build right first time, no large refactors

2. **User-First Thinking**  
   - Previous mistake: Built around users not workspaces
   - Solution: EVERYTHING is workspace-scoped

3. **Mixed Patterns**
   - Had 4 different data fetching patterns
   - Solution: Server actions ONLY for mutations

4. **Loading Everything**
   - 5+ second load times from over-fetching
   - Solution: Pagination, selective loading

**Full lessons: `ROCQET/LESSONS_LEARNED.md`**

---

## 📝 File Naming Conventions

```typescript
// Components: PascalCase
PromptEditor.tsx

// Server actions: camelCase  
createPrompt.ts

// Utilities: camelCase
formatDate.ts

// Types: PascalCase
interface PromptData { }
```

---

## 🔐 Environment Variables Required

```env
# Minimum to start (see ROCQET/INITIAL_SETUP/ENV_TEMPLATE.md for all)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
OPENAI_API_KEY=
```

---

## 🎯 Success Metrics

Track these to ensure we're building right:
- Page load: < 1 second
- Search response: < 50ms  
- Test coverage: > 80%
- TypeScript strict: true
- Zero console errors

---

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start dev server

# Database Migrations (IMPORTANT - USE THIS METHOD!)
node scripts/run-database-setup.mjs  # Run database migrations

# Testing
npm test                 # Run tests
npm run type-check       # Check types

# Deployment
vercel --prod           # Deploy to production
```

---

## 🗄️ Database Migration Instructions (CRITICAL!)

### ✅ WORKING METHOD for Database Migrations:

1. **Create safe SQL files** in `scripts/`:
   ```sql
   -- Use these patterns:
   CREATE TABLE IF NOT EXISTS ...
   DO $$ BEGIN IF NOT EXISTS ... END $$;
   INSERT ... ON CONFLICT DO UPDATE ...
   DROP POLICY IF EXISTS ... before CREATE POLICY
   ```

2. **Run migrations with**:
   ```bash
   node scripts/run-database-setup.mjs
   ```

3. **Required setup**:
   - `.env.local` must have `DATABASE_URL`
   - Install: `npm install pg dotenv`
   - Migration file: `scripts/setup-tiers-safe.sql`

### ❌ METHODS THAT DON'T WORK:
- `npx supabase db push` - Needs Docker
- `npx supabase migration` - Needs local setup
- Direct Supabase CLI - Needs elevated privileges

### 📝 Safe Migration Pattern Example:
```sql
-- Add column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  END IF;
END $$;
```

---

## 📞 When Stuck

1. **First**: Check `ROCQET/LESSONS_LEARNED.md` - We probably hit this before
2. **Second**: Search in `ROCQET/FEATURES_SPECIFICATION.md` - It's probably specified
3. **Third**: Check `ROCQET/MASTER_PLAN.md` - Architecture might have the answer
4. **Last**: Ask user for clarification

---

## 🏆 Definition of Success

You're doing it RIGHT when:
- ✅ Features work first time
- ✅ Following workspace-first architecture
- ✅ Using established patterns
- ✅ Tests passing
- ✅ DAILY_CONTEXT.md is current

You're doing it WRONG when:
- ❌ Refactoring large sections
- ❌ Loading all docs at once
- ❌ Skipping tests
- ❌ Not updating progress
- ❌ Using user-first patterns

---

## 🎯 Remember The Mission

**We're building the GitHub for AI Prompts** - An enterprise-grade SaaS product with:
- Git-style version control for prompts
- Real-time collaboration
- Enterprise security
- No compromises on quality

**Target**: $100K ARR in Year 1

---

## 🔥 Final Reminders

1. **This is a REBUILD** - Don't copy old Promptvolt code
2. **Start clean** - Build with correct architecture from day 1
3. **No shortcuts** - Enterprise-grade from the start
4. **Track everything** - Update DAILY_CONTEXT.md religiously
5. **Test always** - After every single feature

---

**NOW GO BUILD SOMETHING AMAZING! 🚀**

*Start with: `cat ROCQET/AI_SYSTEM/DAILY_CONTEXT.md`*