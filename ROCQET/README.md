# 🚀 ROCQET - Enterprise AI Prompt Management Platform

> **The GitHub for AI Prompts** - Built for teams that take AI seriously.

## 📌 Start Here

This folder contains EVERYTHING needed to build ROCQET from scratch as a **high-end enterprise SaaS** product. No compromises, no shortcuts.

### Quick Navigation
1. **[MISSION.md](./MISSION.md)** - Why we're building this (read first!)
2. **[MASTER_PLAN.md](./MASTER_PLAN.md)** - Complete technical architecture
3. **[FEATURES_SPECIFICATION.md](./FEATURES_SPECIFICATION.md)** - Every feature in detail
4. **[AI_SYSTEM/](./AI_SYSTEM/)** - How to work efficiently with AI
5. **[INITIAL_SETUP/](./INITIAL_SETUP/)** - Automated setup scripts

## 🎯 What is ROCQET?

**ROCQET** is an enterprise-grade prompt management platform that solves the chaos of AI prompt management for teams. Think of it as:
- **Version Control** for prompts (Git-style branching & merging)
- **Real-time Collaboration** (Google Docs for prompts)
- **Enterprise Security** (SSO, audit trails, compliance)
- **AI Optimization** (automatic improvements, cost tracking)

## 💰 Business Model

```yaml
Tiers:
  Starter:    Free        - 1 user, 100 prompts
  Pro:        $20/user/mo - Unlimited, AI features
  Team:       $15/user/mo - Collaboration, audit trail  
  Enterprise: Custom      - SSO, SLA, dedicated support
```

## 🏗️ Tech Stack (No Compromises)

```typescript
// Optimized for Vercel + Supabase deployment
{
  "framework": "Next.js 14",        // Stable, production-ready
  "database": "Supabase Postgres",  // With vector embeddings
  "orm": "Drizzle",                 // Edge-ready, fast
  "search": "Typesense Cloud",      // Millisecond search
  "realtime": "Supabase Realtime",  // Collaboration
  "ai": "OpenAI + Anthropic",       // Multi-provider
  "monitoring": "Sentry + Vercel",  // Complete observability
}
```

## 🚀 Development Workflow

### For AI Developers
```bash
# 1. Read current context
cat ROCQET/AI_SYSTEM/DAILY_CONTEXT.md

# 2. Check available agents
cat ROCQET/AI_SYSTEM/AGENTS_USAGE.md

# 3. Start building
npm run dev
```

### For Human Developers
```bash
# 1. Run automated setup
bash ROCQET/INITIAL_SETUP/setup.sh

# 2. Follow the workflow
open ROCQET/WORKFLOWS/FEATURE_WORKFLOW.md

# 3. Start building
npm run dev
```

## 📂 Folder Structure Explained

| Folder | Purpose | When to Use |
|--------|---------|-------------|
| **AI_SYSTEM/** | AI development optimization | Every AI session |
| **INITIAL_SETUP/** | Project bootstrapping | Once at start |
| **ARCHITECTURE/** | Technical decisions | When building features |
| **WORKFLOWS/** | Development processes | During development |
| **REUSABLE_CODE/** | Working code to copy | When implementing |
| **KNOWLEDGE/** | Lessons & best practices | To avoid mistakes |

## ✨ Key Differentiators

### 1. Git-Style Prompt Versioning
```typescript
// No other tool has this!
await createBranch(promptId, 'experiment/new-approach')
await mergeBranch(experimentId, 'main', 'Improved by 20%')
```

### 2. Real-Time Collaboration
```typescript
// Multiple users editing simultaneously
<CollaborativeEditor presence={true} locking="optimistic" />
```

### 3. AI-Powered Search
```typescript
// Semantic search with embeddings
const similar = await searchByMeaning("customer support email")
```

### 4. Enterprise Audit Trail
```typescript
// Complete history of everything
const audit = await getAuditLog({ 
  compliance: 'SOC2',
  format: 'json' 
})
```

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Workspace-based architecture
- [ ] Authentication with Supabase
- [ ] Basic CRUD with real-time
- [ ] Deploy to Vercel

### Phase 2: Collaboration (Week 2)
- [ ] Git-style versioning
- [ ] Real-time editing
- [ ] Comments & annotations
- [ ] Sharing with permissions

### Phase 3: Intelligence (Week 3)
- [ ] AI search with embeddings
- [ ] Prompt optimization
- [ ] Cost tracking
- [ ] Usage analytics

### Phase 4: Enterprise (Week 4)
- [ ] SSO integration
- [ ] Audit trail
- [ ] Compliance (SOC2)
- [ ] API access

## 🎯 Success Metrics

### Technical
- Page load: < 1s
- Search: < 50ms
- Real-time lag: < 100ms
- Uptime: 99.9%

### Business
- Week 1: 10 beta users
- Month 1: 100 users
- Month 3: $5K MRR
- Year 1: $100K ARR

## ⚡ Quick Commands

```bash
# Development
npm run dev           # Start development (port 3000)
npm run build         # Production build
npm run test          # Run tests

# Database
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Visual database browser

# Deployment
npm run deploy        # Deploy to Vercel
npm run preview       # Preview deployment
```

## 🚦 Getting Started

### Option 1: Automated Setup (Recommended)
```bash
bash ROCQET/INITIAL_SETUP/setup.sh
```

### Option 2: Manual Setup
1. Read [INITIAL_SETUP/PROJECT_STRUCTURE.md](./INITIAL_SETUP/PROJECT_STRUCTURE.md)
2. Install dependencies from [INITIAL_SETUP/DEPENDENCIES.json](./INITIAL_SETUP/DEPENDENCIES.json)
3. Configure environment from [INITIAL_SETUP/ENV_TEMPLATE.md](./INITIAL_SETUP/ENV_TEMPLATE.md)

## 🤝 For AI Assistants

**IMPORTANT**: This is an enterprise SaaS product. Always:
- Think **workspace-first**, not user-first
- Implement **real-time** features from the start
- Include **audit trails** for everything
- Design for **100,000+ users** scale
- Never compromise on **security**

## 📚 Essential Reading Order

1. **[MISSION.md](./MISSION.md)** - Understand the why
2. **[KNOWLEDGE/LESSONS_LEARNED.md](./KNOWLEDGE/LESSONS_LEARNED.md)** - Avoid past mistakes
3. **[MASTER_PLAN.md](./MASTER_PLAN.md)** - Technical architecture
4. **[FEATURES_SPECIFICATION.md](./FEATURES_SPECIFICATION.md)** - What to build
5. **[AI_SYSTEM/CONTEXT_PROTOCOL.md](./AI_SYSTEM/CONTEXT_PROTOCOL.md)** - How to work efficiently

---

**Remember**: We're building the **GitHub for AI Prompts**. Think big, build solid, ship fast.

🚀 **Let's build something amazing!**