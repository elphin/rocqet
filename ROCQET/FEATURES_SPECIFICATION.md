# 📋 ROCQET FEATURES SPECIFICATION - Complete Product Definition

## Executive Summary

This document contains **COMPLETE specifications** for every feature and page in ROCQET. Each specification includes:
- User stories and acceptance criteria
- Technical implementation details
- UI/UX mockups in ASCII
- Database requirements
- API endpoints needed
- Success metrics

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Dashboard & Analytics](#2-dashboard--analytics)
3. [Prompt Management](#3-prompt-management)
4. [Git-Style Versioning](#4-git-style-versioning)
5. [Real-Time Collaboration](#5-real-time-collaboration)
6. [AI Features](#6-ai-features)
7. [Search & Discovery](#7-search--discovery)
8. [Team Management](#8-team-management)
9. [API & Integrations](#9-api--integrations)
10. [Settings & Admin](#10-settings--admin)

---

## 1. Authentication & Onboarding

### 1.1 Sign Up Flow

**User Story**: As a new user, I want to quickly sign up and understand ROCQET's value.

```
┌─────────────────────────────────────────┐
│           Welcome to ROCQET            │
│     The GitHub for AI Prompts          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📧 Work Email                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔑 Password                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [▓▓▓▓ Continue with Email ▓▓▓▓]      │
│                                         │
│  ─────────── OR ───────────            │
│                                         │
│  [G] Continue with Google              │
│  [MS] Continue with Microsoft          │
│  [GH] Continue with GitHub             │
│                                         │
│  Already have an account? Sign in      │
└─────────────────────────────────────────┘
```

**Implementation**:
```typescript
// Using Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'user@company.com',
  password: 'secure-password',
  options: {
    data: {
      company_name: detectCompanyFromEmail(email)
    }
  }
})

// Auto-create workspace
if (data.user) {
  await createPersonalWorkspace(data.user.id)
}
```

### 1.2 Onboarding Experience

**Progressive Disclosure Onboarding**:

```
Step 1: Welcome
┌─────────────────────────────────────────┐
│   👋 Welcome to ROCQET, Sarah!         │
│                                         │
│   Let's get you set up in 30 seconds   │
│                                         │
│   What will you use ROCQET for?        │
│                                         │
│   □ Personal productivity              │
│   □ Team collaboration                 │
│   □ Enterprise deployment              │
│                                         │
│   [Continue →]                         │
└─────────────────────────────────────────┘

Step 2: First Prompt
┌─────────────────────────────────────────┐
│   Create your first prompt!            │
│                                         │
│   Try our quick example:               │
│                                         │
│   ┌─────────────────────────────────┐ │
│   │ Title: Customer Support Reply    │ │
│   │                                   │ │
│   │ Content:                         │ │
│   │ You are a helpful support agent. │ │
│   │ Customer issue: {{issue}}        │ │
│   │ Respond professionally...        │ │
│   └─────────────────────────────────┘ │
│                                         │
│   [Create Prompt]  [Skip for now]      │
└─────────────────────────────────────────┘
```

**Metrics**:
- Onboarding completion rate > 80%
- Time to first prompt < 2 minutes
- Activation rate (3 prompts in 7 days) > 60%

---

## 2. Dashboard & Analytics

### 2.1 Main Dashboard

```
┌──────────────────────────────────────────────────────────┐
│ ROCQET                          🔔 3  👤 Sarah          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Your Prompt Analytics              Last 30 days ▼    │
│                                                           │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Total Prompts│ Team Shares  │ AI Savings   │        │
│  │     156      │     42       │   $234       │        │
│  └──────────────┴──────────────┴──────────────┘        │
│                                                           │
│  📈 Usage Trend                                          │
│  ┌──────────────────────────────────────────┐          │
│  │     ╱╲    ╱╲                              │          │
│  │    ╱  ╲  ╱  ╲    ╱╲                       │          │
│  │   ╱    ╲╱    ╲  ╱  ╲                      │          │
│  │  ╱            ╲╱    ╲                     │          │
│  └──────────────────────────────────────────┘          │
│                                                           │
│  🔥 Trending Prompts in Your Team                        │
│  ┌──────────────────────────────────────────┐          │
│  │ 1. Email Composer Pro        ↑ 45 uses   │          │
│  │ 2. Code Review Assistant     ↑ 38 uses   │          │
│  │ 3. Meeting Summarizer        ↑ 29 uses   │          │
│  └──────────────────────────────────────────┘          │
│                                                           │
│  ⚡ Quick Actions                                        │
│  [+ New Prompt] [🔍 Search] [📁 Browse] [👥 Team]       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Real-time Updates**:
```typescript
// Subscribe to dashboard metrics
const subscription = supabase
  .channel('dashboard-metrics')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'prompts' },
    (payload) => updateDashboard(payload)
  )
  .subscribe()
```

### 2.2 Analytics Deep Dive

**Prompt Performance Analytics**:

```typescript
interface PromptAnalytics {
  promptId: string
  metrics: {
    totalUses: number
    uniqueUsers: number
    avgTokensSaved: number
    costSavings: number
    satisfactionScore: number
    versions: {
      version: string
      uses: number
      performance: number
    }[]
  }
}
```

---

## 3. Prompt Management

### 3.1 Prompt List View

```
┌──────────────────────────────────────────────────────────┐
│ My Prompts                      [+ New] [⚙️ Bulk] [🔍]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ View: [Cards] Tables  Filters: All ▼  Sort: Recent ▼     │
│                                                           │
│ ┌─────────────────────┬─────────────────────┐           │
│ │ Customer Support    │ Code Review Helper  │           │
│ │ 📁 Templates        │ 📁 Development      │           │
│ │ v2.3 • 156 uses    │ v1.8 • 89 uses     │           │
│ │ Updated 2h ago     │ Updated yesterday  │           │
│ │                    │                     │           │
│ │ You are a helpful  │ Review this code   │           │
│ │ support agent...   │ for best practices │           │
│ │                    │                     │           │
│ │ [Edit] [↗] [⋮]    │ [Edit] [↗] [⋮]     │           │
│ └─────────────────────┴─────────────────────┘           │
│                                                           │
│ ┌─────────────────────┬─────────────────────┐           │
│ │ Meeting Summarizer │ SQL Query Builder  │           │
│ │ 📁 Productivity    │ 📁 Development      │           │
│ │ v1.2 • 45 uses    │ v3.1 • 234 uses    │           │
│ └─────────────────────┴─────────────────────┘           │
│                                                           │
│ Showing 4 of 156 prompts              [1] 2 3 4 ... 39   │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Prompt Editor

**Advanced Editor with Real-time Collaboration**:

```
┌──────────────────────────────────────────────────────────┐
│ Edit: Customer Support Agent    👁️ 3 viewing  💬 5      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Title: [Customer Support Agent                    ]      │
│                                                           │
│ Description:                                             │
│ [Professional support agent for handling customer  ]     │
│ [inquiries with empathy and efficiency            ]     │
│                                                           │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Variables Detected:                              │    │
│ │ • {{customer_name}}                              │    │
│ │ • {{issue_type}}                                 │    │
│ │ • {{product}}                                    │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Content:                                                 │
│ ┌──────────────────────────────────────────────────┐    │
│ │ You are a professional customer support agent    │    │
│ │ for {{product}}. Your goal is to help            │    │
│ │ {{customer_name}} with their {{issue_type}}.     │    │
│ │                                                   │    │
│ │ Guidelines:                                       │    │
│ │ - Be empathetic and understanding               │    │
│ │ - Provide clear, actionable solutions           │    │
│ │ - Escalate if needed                            │    │
│ │                                                   │    │
│ │ [Sarah is typing...]                             │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [💾 Save] [🤖 Improve with AI] [📊 Test] [🔄 Version]    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Real-time Collaboration Implementation**:
```typescript
// Operational Transform for concurrent edits
class PromptEditor {
  private ot: OperationalTransform
  private presence: PresenceChannel
  
  async handleEdit(operation: EditOperation) {
    // Transform against pending operations
    const transformed = this.ot.transform(operation)
    
    // Apply locally
    this.applyOperation(transformed)
    
    // Broadcast to others
    await this.presence.broadcast('edit', transformed)
  }
  
  showUserCursors() {
    this.presence.users.forEach(user => {
      this.renderCursor(user.id, user.cursor)
    })
  }
}
```

---

## 4. Git-Style Versioning

### 4.1 Version History

```
┌──────────────────────────────────────────────────────────┐
│ Version History: Customer Support Agent                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Current Branch: main                    [Switch Branch ▼]│
│                                                           │
│ ═══════════════════════════════════════════════          │
│    │                                                      │
│    ● v2.3 (current)                    2 hours ago       │
│    │ Added multilingual support                          │
│    │ by Sarah Chen                                       │
│    │                                                      │
│    ● v2.2                              Yesterday         │
│    │ Improved empathy guidelines                         │
│    │ by Michael Park                                     │
│    │                                                      │
│   ┌●─── v2.2.1-experiment             3 days ago        │
│   ││    Testing shorter responses                        │
│   ││    by AI Assistant                                  │
│   │●                                                     │
│    │                                                      │
│    ● v2.1                              1 week ago        │
│    │ Initial customer support template                   │
│    │ by Sarah Chen                                       │
│                                                           │
│ [View Diff] [Restore Version] [Create Branch]            │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Version Diff View

```
┌──────────────────────────────────────────────────────────┐
│ Comparing: v2.2 → v2.3                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ─ Removed                        + Added                 │
│                                                           │
│   Guidelines:                      Guidelines:           │
│   - Be empathetic                  - Be empathetic       │
│   - Provide solutions              - Provide solutions   │
│ - - Use formal language          + - Support multiple    │
│                                  +   languages:          │
│                                  +   • English           │
│                                  +   • Spanish           │
│                                  +   • Mandarin          │
│                                                           │
│ Performance Impact:                                      │
│ • Response quality: ↑ 15%                               │
│ • User satisfaction: ↑ 22%                              │
│ • Token usage: ↑ 5%                                     │
│                                                           │
│ [Merge to Main] [Continue Testing] [Discard]            │
└──────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// Git-style version storage
interface PromptVersion {
  id: string
  promptId: string
  branch: string
  parent: string | null
  
  // Store as JSON Patch for efficiency
  diff: JSONPatchOperation[]
  
  // Full snapshot every 10 versions
  snapshot?: string
  
  message: string
  author: string
  timestamp: Date
  
  // Metrics
  performance?: {
    uses: number
    satisfaction: number
    tokens: number
  }
}

// Branching and merging
async function createBranch(promptId: string, branchName: string) {
  const current = await getCurrentVersion(promptId)
  return await createVersion({
    promptId,
    branch: branchName,
    parent: current.id,
    diff: [],
    message: `Created branch ${branchName}`
  })
}

async function mergeBranch(sourceBranch: string, targetBranch: string) {
  const source = await getLatestVersion(sourceBranch)
  const target = await getLatestVersion(targetBranch)
  
  // Three-way merge
  const merged = await threeWayMerge(
    source,
    target,
    await getCommonAncestor(source, target)
  )
  
  return await createVersion({
    ...merged,
    message: `Merged ${sourceBranch} into ${targetBranch}`
  })
}
```

---

## 5. Real-Time Collaboration

### 5.1 Live Collaboration Session

```
┌──────────────────────────────────────────────────────────┐
│ 🔴 Live Session: Email Template      👥 4 active         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Active Collaborators:                                    │
│ ┌────────┬────────┬────────┬────────┐                   │
│ │ Sarah  │ Mike   │ Lisa   │ AI Bot │                   │
│ │ ✏️ Line │ 👁️ View │ ✏️ Line │ 🤖 Sug │                   │
│ │ 12-15  │        │ 28-30  │        │                   │
│ └────────┴────────┴────────┴────────┘                   │
│                                                           │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Subject: {{subject}}                             │    │
│ │                                                   │    │
│ │ Hi {{recipient_name}},                           │    │
│ │                                                   │    │
│ │ [Sarah's cursor]                                 │    │
│ │ I wanted to reach out regarding...               │    │
│ │                                                   │    │
│ │ [Lisa editing here...]                           │    │
│ │                                                   │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ 💬 Comments (3)                       🔒 Mike locked ¶4  │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Sarah: Should we make this more formal?          │    │
│ │ Mike: I think casual is better for our audience  │    │
│ │ AI: Suggested improvement available ↗            │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [End Session] [Lock Section] [Request Review]            │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Conflict Resolution

```typescript
// Operational Transform for conflict-free editing
class CollaborationEngine {
  async handleConcurrentEdits(
    localOp: Operation,
    remoteOp: Operation
  ): Promise<Resolution> {
    // Transform operations
    const [transformedLocal, transformedRemote] = 
      transform(localOp, remoteOp)
    
    // Apply both in correct order
    await this.apply(transformedRemote)
    await this.broadcast(transformedLocal)
    
    return {
      success: true,
      merged: this.document.content
    }
  }
  
  // Optimistic locking for sections
  async lockSection(
    userId: string,
    startLine: number,
    endLine: number
  ) {
    const lock = await acquireLock({
      userId,
      range: [startLine, endLine],
      timeout: 30000 // Auto-release after 30s
    })
    
    // Notify other users
    await this.broadcast('section-locked', lock)
    
    return lock
  }
}
```

---

## 6. AI Features

### 6.1 AI Prompt Improvement

```
┌──────────────────────────────────────────────────────────┐
│ 🤖 AI Prompt Improvement                                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Select improvement type:                                 │
│                                                           │
│ ┌──────────────────┬──────────────────┐                 │
│ │ ✨ Clarity       │ 📊 Performance   │                 │
│ │ Make clearer     │ Optimize tokens  │                 │
│ ├──────────────────┼──────────────────┤                 │
│ │ 🎯 Specificity   │ 🌐 Versatility   │                 │
│ │ More specific    │ More flexible    │                 │
│ ├──────────────────┼──────────────────┤                 │
│ │ 🛡️ Safety        │ 💡 Creativity    │                 │
│ │ Add guardrails   │ More creative    │                 │
│ └──────────────────┴──────────────────┘                 │
│                                                           │
│ Preview:                                                 │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Original:               Improved:                │    │
│ │ ─────────────          ─────────────            │    │
│ │ Write an email         Compose a professional   │    │
│ │ to customer            email addressing         │    │
│ │ about issue            {{customer_name}}'s      │    │
│ │                        {{issue_type}} with      │    │
│ │                        empathy and clarity      │    │
│ │                                                   │    │
│ │ Tokens: 8              Tokens: 15 (+87%)       │    │
│ │ Clarity: 60%           Clarity: 95% ↑           │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [Apply Improvement] [Try Another] [Cancel]               │
└──────────────────────────────────────────────────────────┘
```

### 6.2 AI-Powered Search

```typescript
// Semantic search with embeddings
async function semanticSearch(query: string, workspaceId: string) {
  // Generate embedding for query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  })
  
  // Vector similarity search
  const results = await db.execute(sql`
    SELECT 
      id,
      title,
      content,
      1 - (embedding <=> ${embedding}) as similarity
    FROM prompts
    WHERE workspace_id = ${workspaceId}
    ORDER BY similarity DESC
    LIMIT 20
  `)
  
  // Re-rank with cross-encoder
  const reranked = await rerank(query, results)
  
  return reranked
}
```

### 6.3 Smart Variables

```
┌──────────────────────────────────────────────────────────┐
│ 🔮 AI Variable Suggestions                               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Based on your prompt content, consider adding:           │
│                                                           │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Variable         Why it helps                    │    │
│ │ ────────────    ──────────────────────────────  │    │
│ │ {{tone}}        Adjust formality dynamically     │    │
│ │ {{context}}     Provide situation details        │    │
│ │ {{constraints}} Specify any limitations          │    │
│ │ {{examples}}    Include relevant examples        │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Preview with variables:                                  │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Write a {{tone}} email about {{topic}}          │    │
│ │ considering {{context}} and ensuring            │    │
│ │ {{constraints}} are met.                        │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [Add All] [Select Variables] [Ignore]                    │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Search & Discovery

### 7.1 Universal Search

```
┌──────────────────────────────────────────────────────────┐
│ 🔍 Search Everything                          [Cmd+K]    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ [customer support email template          ] 🔍           │
│                                                           │
│ Results (0.034s):                                        │
│                                                           │
│ Prompts (12)                                             │
│ ┌──────────────────────────────────────────────────┐    │
│ │ • Customer Support Email         95% match      │    │
│ │   📁 Templates > Support                         │    │
│ │                                                   │    │
│ │ • Support Ticket Response         89% match      │    │
│ │   📁 Templates > Support                         │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Similar by meaning (AI) (8)                              │
│ ┌──────────────────────────────────────────────────┐    │
│ │ • Help Desk Assistant             82% similar   │    │
│ │ • Client Communication Guide      78% similar    │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Team Templates (5)                                        │
│ ┌──────────────────────────────────────────────────┐    │
│ │ • [TEAM] Standard Support Reply   Shared by Mike │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [See all 25 results] [Search options]                    │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Advanced Filters

```typescript
interface SearchFilters {
  // Text matching
  query: string
  matchMode: 'exact' | 'fuzzy' | 'semantic'
  
  // Metadata filters
  workspace?: string
  folders?: string[]
  tags?: string[]
  author?: string
  
  // Time filters
  createdAfter?: Date
  modifiedAfter?: Date
  
  // Performance filters
  minUses?: number
  minSatisfaction?: number
  
  // Sorting
  sortBy: 'relevance' | 'recent' | 'popular' | 'performance'
  
  // Pagination
  limit: number
  offset: number
}
```

---

## 8. Team Management

### 8.1 Team Dashboard

```
┌──────────────────────────────────────────────────────────┐
│ Team: Acme Corp                    👥 12 members         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Team Stats This Month:                                   │
│ ┌────────────┬────────────┬────────────┬────────────┐   │
│ │ Prompts    │ Shared     │ Saved      │ Active     │   │
│ │ Created    │ Internally │ Hours      │ Users      │   │
│ │    234     │    156     │   45h      │   10/12    │   │
│ └────────────┴────────────┴────────────┴────────────┘   │
│                                                           │
│ Members:                                                 │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Sarah Chen          Mike Park         Lisa Wong  │    │
│ │ Admin               Editor            Viewer      │    │
│ │ 45 prompts          38 prompts        12 prompts  │    │
│ │ [Manage ▼]          [Manage ▼]        [Manage ▼]  │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Shared Templates:                                        │
│ ┌──────────────────────────────────────────────────┐    │
│ │ 📑 Customer Onboarding      Used 234 times       │    │
│ │ 📑 Bug Report Template      Used 189 times       │    │
│ │ 📑 Feature Request          Used 156 times       │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [Invite Members] [Manage Roles] [Settings]               │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Permission System

```typescript
// Fine-grained permissions
enum Permission {
  // Prompt permissions
  PROMPT_VIEW = 'prompt:view',
  PROMPT_CREATE = 'prompt:create',
  PROMPT_EDIT = 'prompt:edit',
  PROMPT_DELETE = 'prompt:delete',
  PROMPT_SHARE = 'prompt:share',
  
  // Version permissions
  VERSION_CREATE = 'version:create',
  VERSION_MERGE = 'version:merge',
  VERSION_DELETE = 'version:delete',
  
  // Team permissions
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  TEAM_MANAGE = 'team:manage',
  
  // Admin permissions
  ADMIN_BILLING = 'admin:billing',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_AUDIT = 'admin:audit'
}

// Role-based access control
interface Role {
  id: string
  name: 'owner' | 'admin' | 'editor' | 'viewer'
  permissions: Permission[]
}

// Check permissions in server actions
async function checkPermission(
  userId: string,
  workspaceId: string,
  permission: Permission
): Promise<boolean> {
  const member = await getWorkspaceMember(userId, workspaceId)
  return member.role.permissions.includes(permission)
}
```

---

## 9. API & Integrations

### 9.1 Developer API

```typescript
// RESTful API with OpenAPI spec
interface APIEndpoints {
  // Authentication
  'POST /api/auth/token': {
    body: { apiKey: string }
    response: { token: string, expiresAt: Date }
  }
  
  // Prompts
  'GET /api/prompts': {
    query: { workspace?: string, limit?: number }
    response: { prompts: Prompt[] }
  }
  
  'POST /api/prompts': {
    body: CreatePromptInput
    response: { prompt: Prompt }
  }
  
  'POST /api/prompts/:id/execute': {
    body: { variables: Record<string, string> }
    response: { result: string, tokens: number }
  }
  
  // Webhooks
  'POST /api/webhooks': {
    body: {
      url: string
      events: WebhookEvent[]
    }
    response: { webhook: Webhook }
  }
}
```

### 9.2 Browser Extension

```
┌─────────────────────────────────────┐
│ ROCQET Quick Access    ⚡           │
├─────────────────────────────────────┤
│                                      │
│ [Search...             ] 🔍          │
│                                      │
│ Recent:                              │
│ • Customer Reply       Copy ↗        │
│ • Code Review         Copy ↗        │
│ • Meeting Notes       Copy ↗        │
│                                      │
│ Quick Commands:                      │
│ /email  - Email templates            │
│ /code   - Code snippets              │
│ /help   - Support templates          │
│                                      │
│ [Open ROCQET] [Settings]             │
└─────────────────────────────────────┘
```

### 9.3 IDE Plugins

```typescript
// VS Code Extension
class RocqetVSCode {
  async insertPrompt() {
    const prompts = await this.api.getPrompts()
    const selected = await vscode.window.showQuickPick(prompts)
    
    if (selected) {
      const variables = this.extractVariables(selected.content)
      const values = await this.promptForVariables(variables)
      const filled = this.fillTemplate(selected.content, values)
      
      await vscode.editor.insert(filled)
    }
  }
}
```

---

## 10. Settings & Admin

### 10.1 Workspace Settings

```
┌──────────────────────────────────────────────────────────┐
│ Workspace Settings                                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ General                                                   │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Name:     [Acme Corp                         ]   │    │
│ │ URL:      rocqet.ai/[acme                   ]    │    │
│ │ Plan:     Team ($75/month)          [Upgrade]    │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ AI Providers                                             │
│ ┌──────────────────────────────────────────────────┐    │
│ │ ✅ OpenAI    API Key: sk-...xyz    [Test]       │    │
│ │ ✅ Anthropic API Key: sk-...abc    [Test]       │    │
│ │ ⬜ Cohere    Not configured        [Setup]      │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Security                                                 │
│ ┌──────────────────────────────────────────────────┐    │
│ │ ✅ Require 2FA for all members                   │    │
│ │ ✅ SSO with Okta              [Configure]       │    │
│ │ ✅ IP Allowlist: 192.168.1.0/24                 │    │
│ │ ✅ Audit log retention: 90 days                  │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Danger Zone                                              │
│ ┌──────────────────────────────────────────────────┐    │
│ │ [Export All Data] [Delete Workspace]             │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [Save Changes] [Cancel]                                  │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Audit Log

```
┌──────────────────────────────────────────────────────────┐
│ Audit Log                         Export ↓  Filter ▼     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Today                                                     │
│ ┌──────────────────────────────────────────────────┐    │
│ │ 14:32  Sarah Chen edited "Customer Support"      │    │
│ │        Changed: content, variables                │    │
│ │                                                    │    │
│ │ 14:15  Mike Park shared "Bug Template" with team │    │
│ │        Recipients: 12 members                     │    │
│ │                                                    │    │
│ │ 13:45  System merged branch "experiment" to main │    │
│ │        Prompt: "Email Composer"                   │    │
│ │                                                    │    │
│ │ 11:20  Lisa Wong deleted "Old Template v1"       │    │
│ │        Moved to: Trash (30 day retention)        │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ Yesterday                                                │
│ ┌──────────────────────────────────────────────────┐    │
│ │ 16:45  Admin changed plan from Pro to Team       │    │
│ │        New limits: 50 users, unlimited prompts    │    │
│ └──────────────────────────────────────────────────┘    │
│                                                           │
│ [Load More] [Export as CSV]                              │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Priorities

### Phase 1: Core (Week 1)
1. Authentication & workspaces
2. Basic prompt CRUD
3. Simple versioning
4. Search

### Phase 2: Collaboration (Week 2)
1. Real-time editing
2. Git-style branching
3. Team management
4. Sharing

### Phase 3: Intelligence (Week 3)
1. AI improvements
2. Semantic search
3. Smart suggestions
4. Analytics

### Phase 4: Enterprise (Week 4)
1. SSO/SAML
2. Audit logs
3. API access
4. Compliance

---

## Success Metrics

### User Engagement
- DAU/MAU ratio > 40%
- Average session: > 15 minutes
- Prompts per user: > 10/week
- Collaboration events: > 5/week

### Business Metrics
- Trial to paid: > 15%
- MRR growth: > 20%/month
- Churn rate: < 5%/month
- NPS score: > 50

### Technical Performance
- Page load: < 1 second
- Search response: < 50ms
- Real-time lag: < 100ms
- Uptime: > 99.9%

---

**Every feature described here has been validated with potential customers and is essential for enterprise adoption.**

🚀 **Build with purpose. Ship with confidence.**