# 🤖 AI CONTEXT PROTOCOL - Optimized AI Development System

## Overview

This protocol enables **ultra-efficient AI development** for ROCQET. Follow this EXACT sequence for optimal context usage and minimal token waste.

## 🎯 The Golden Rule

**NEVER load everything at once!** Progressive context loading saves 80% of tokens.

---

## 📊 Context Loading Strategy

### Level 0: Session Start (10 tokens)
```bash
# ALWAYS start here
cat ROCQET/AI_SYSTEM/DAILY_CONTEXT.md
```

### Level 1: Task Understanding (50 tokens)
```bash
# Only if task unclear
cat ROCQET/AI_SYSTEM/CURRENT_SPRINT.md
```

### Level 2: Feature Building (~200 tokens)
```bash
# Load ONLY the relevant spec
cat ROCQET/FEATURES_SPECIFICATION.md | grep -A 50 "feature_name"
```

### Level 3: Technical Details (varies)
```bash
# Load specific architecture sections as needed
cat ROCQET/MASTER_PLAN.md | grep -A 30 "Database Architecture"
```

### Level 4: Code Patterns (100-500 tokens)
```bash
# Load specific patterns when implementing
cat ROCQET/REUSABLE_CODE/[specific_pattern].ts
```

---

## 🔄 Standard Development Flow

### 1. Start Session
```yaml
AI: "What are we working on today?"
Human: "Continue sprint work" or "New feature: X"
AI: *Reads DAILY_CONTEXT.md*
AI: "Got it, working on [specific task]"
```

### 2. Implement Feature
```yaml
AI: *Reads relevant section from FEATURES_SPECIFICATION.md*
AI: *Loads specific code pattern from REUSABLE_CODE/*
AI: *Implements feature*
AI: "Feature implemented, running tests..."
```

### 3. Test & Validate
```yaml
AI: *Runs tests*
AI: *Fixes any issues*
AI: *Updates DAILY_CONTEXT.md with progress*
AI: "Feature complete and tested"
```

---

## 📁 Key Files Reference

### Must Read Daily
- `DAILY_CONTEXT.md` - Current state and focus
- `CURRENT_SPRINT.md` - Active tasks

### Reference When Needed
- `FEATURES_SPECIFICATION.md` - Feature details
- `MASTER_PLAN.md` - Architecture decisions
- `REUSABLE_CODE/*` - Copy-paste patterns

### Read Once Per Major Task
- `MISSION.md` - Product vision
- `LESSONS_LEARNED.md` - Avoid mistakes

---

## 🎮 AI Agent Instructions

### For Code Generation
```typescript
// ALWAYS follow this pattern for new features
1. Read feature spec from FEATURES_SPECIFICATION.md
2. Check REUSABLE_CODE/ for similar patterns
3. Implement using established patterns
4. Test immediately
5. Update DAILY_CONTEXT.md
```

### For Bug Fixes
```typescript
1. Reproduce the issue
2. Check LESSONS_LEARNED.md for similar problems
3. Fix using minimal changes
4. Test thoroughly
5. Document in DAILY_CONTEXT.md
```

### For Refactoring
```typescript
// WARNING: Read LESSONS_LEARNED.md first!
1. NEVER refactor more than one component at a time
2. Test after EVERY change
3. Keep backup of working version
4. Document changes in DAILY_CONTEXT.md
```

---

## 💬 Communication Protocol

### Status Updates
```yaml
Frequency: After each subtask
Format: "✅ Completed: [task]. Next: [task]"
Location: Update DAILY_CONTEXT.md
```

### Problem Reporting
```yaml
Format: "⚠️ Issue: [description]. Attempting: [solution]"
If blocked: "🚫 Blocked: [reason]. Need: [help required]"
```

### Progress Tracking
```yaml
Start of session: "📋 Today's goals: [list]"
During work: "🔄 Progress: [X/Y] tasks complete"
End of session: "✅ Completed: [summary]"
```

---

## 🚀 Efficiency Tips

### 1. Use Grep Strategically
```bash
# Don't load entire files
grep -A 20 "function createPrompt" file.ts  # Good
cat file.ts  # Bad (loads everything)
```

### 2. Cache Common Patterns
```typescript
// If using same pattern multiple times, store it
const STANDARD_SERVER_ACTION = `...pattern...`
// Reuse without reloading
```

### 3. Batch Related Tasks
```yaml
Good: Implement all CRUD operations together
Bad: Jump between unrelated features
```

### 4. Update Context Immediately
```bash
# After completing task
echo "✅ Implemented user auth" >> DAILY_CONTEXT.md
```

---

## 🔴 Critical Rules

### NEVER
- Load entire documentation at start
- Refactor without reading LESSONS_LEARNED.md
- Implement features without checking specs
- Skip testing after changes
- Forget to update DAILY_CONTEXT.md

### ALWAYS
- Start with DAILY_CONTEXT.md
- Test incrementally
- Follow established patterns
- Document progress
- Keep working version

---

## 📈 Performance Metrics

Track these for optimal AI development:

```yaml
Tokens per feature: < 5,000 target
Context switches: < 3 per feature
Test failures: < 2 per implementation
Time to feature: < 30 minutes average
```

---

## 🎯 Success Criteria

You're doing it right when:
- ✅ Features work first time
- ✅ Using < 5K tokens per feature
- ✅ No major refactoring needed
- ✅ Tests pass immediately
- ✅ Code follows patterns

You're doing it wrong when:
- ❌ Loading everything upfront
- ❌ Rewriting existing code
- ❌ Tests failing repeatedly
- ❌ Not following patterns
- ❌ Context confusion

---

## 🔄 Session Handoff Protocol

### End of Session
```bash
# Update status
cat >> DAILY_CONTEXT.md << EOF
## Session $(date +%Y%m%d-%H%M)
- Completed: [list]
- In Progress: [list]
- Blocked: [list]
- Next: [list]
EOF
```

### Start of New Session
```bash
# Read previous status
tail -20 DAILY_CONTEXT.md
# Continue from last point
```

---

**Remember: Efficient context usage = Faster development = Better product**

🚀 **Load smart, build fast!**