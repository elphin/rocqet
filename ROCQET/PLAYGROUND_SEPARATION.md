# 🎮 Playground vs Simple Tester - Separation of Concerns

## Overview

ROCQET heeft twee verschillende test interfaces voor prompts, elk met een specifiek doel:

1. **Simple Tester** (Prompt Detail Page) - Snelle, basis testing
2. **Advanced Playground** (Dedicated Page) - Uitgebreide testing met vergelijkingen

---

## 🎯 Simple Tester (Prompt Detail Page)

### Locatie
- `/[workspace]/prompts/[id]` - Embedded in prompt detail view
- Component: `PromptPlaygroundEnhanced` of `PromptPlaygroundCompact`

### Features
- ✅ Quick execute met huidige settings
- ✅ Variable input velden
- ✅ Model/temperature selectie
- ✅ Direct output viewing
- ✅ Copy prompt/output functionaliteit
- ✅ Link naar Advanced Playground

### Use Cases
- Snel testen tijdens het bewerken van een prompt
- Verificatie dat prompt werkt met default settings
- Quick demo voor collega's
- Simpele output check

### Wat het NIET heeft
- ❌ Run history
- ❌ Comparison tussen runs
- ❌ Advanced settings (top_p, penalties, etc)
- ❌ Apply best settings functionaliteit
- ❌ Multiple output storage

---

## 🚀 Advanced Playground (Dedicated Page)

### Locatie
- `/[workspace]/prompts/[id]/playground` - Full page experience
- Component: `ImprovedTestPromptPage`

### Features
- ✅ **Complete testing environment**
  - Full model/provider selection
  - Advanced parameters (top_p, frequency_penalty, etc)
  - Variable management met color coding
  - Click-to-edit prompt editor

- ✅ **Run History & Comparison**
  - Store tot 20 runs lokaal
  - Load historische runs uit database
  - Full-screen comparison modal
  - Side-by-side output vergelijking
  - Metrics comparison (cost, tokens, speed, quality)

- ✅ **Apply Best Settings**
  - Apply settings from winning run
  - Apply prompt content from winning run
  - Apply both settings + content
  - Auto-save als nieuwe versie

- ✅ **Advanced Features**
  - Auto-save on blur
  - Keyboard shortcuts (Cmd+Enter)
  - Processed vs raw prompt preview
  - Export/import configurations

### Use Cases
- A/B testing verschillende models
- Optimaliseren van temperature/parameters
- Vergelijken van outputs voor kwaliteit
- Kosten optimalisatie
- Performance tuning
- Prompt evolution tracking

---

## 🔄 Navigation Flow

```
Prompt Detail Page (Simple Tester)
         ↓
    [Advanced Playground →] link
         ↓
Playground Page (Full Features)
         ↓
    Compare Runs Modal
         ↓
    Apply Best Settings
         ↓
    Save as New Version
```

---

## 💡 Best Practices

### Voor Simple Tester
1. Gebruik voor quick validation
2. Test met default settings
3. Verificatie na edits
4. Snelle demo's

### Voor Advanced Playground
1. Gebruik voor serieuze optimalisatie
2. Test meerdere models/settings
3. Vergelijk outputs systematisch
4. Sla beste configuratie op
5. Track performance over tijd

---

## 🏗️ Technical Implementation

### Simple Tester
```typescript
// Minimale state management
- content (read-only of editable)
- variables
- single output
- basic settings
```

### Advanced Playground
```typescript
// Uitgebreide state management
- editable content met auto-save
- run history array
- comparison state
- advanced settings
- database integration voor history
```

---

## 📊 Metrics

### Simple Tester Goals
- Load time: < 100ms
- Execution: Direct
- UI complexity: Minimal
- Context usage: Low

### Advanced Playground Goals
- Feature completeness: 100%
- Comparison capability: 2+ runs
- History retention: 20+ runs
- Settings persistence: Full

---

## 🎨 UI/UX Verschillen

### Simple Tester
- Inline/embedded view
- Collapsible sections
- Minimal screen real estate
- Focus op snelheid

### Advanced Playground
- Full page layout
- Split panels (editor/output)
- Full-screen comparison modal
- Focus op functionaliteit

---

## 🔮 Future Enhancements

### Simple Tester
- Quick templates
- Favorite settings preset
- One-click share

### Advanced Playground
- Semantic similarity analysis
- Performance trends graphs
- Batch testing
- Chain testing integration
- Export comparison reports

---

**Key Principle**: Keep the simple tester SIMPLE, put all advanced features in the playground!