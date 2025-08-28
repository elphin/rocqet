# 📝 TODO: Toekomstige Verbeteringen

## 🔥 Bug Fixes

### Delete Prompt Functionality
**Status: ✅ FULLY IMPLEMENTED | Date: 2025-08-24**

#### Problem:
- Delete button op prompts pagina faalde omdat soft delete kolommen (`deleted_at`, `deleted_by`, `original_folder_id`) niet bestonden in database

#### Solution:
1. **Migration Applied**: 
   - Added soft delete columns to database
   - Created indexes for performance
   - Added RLS policies for trash isolation

2. **Code Updated**:
   - `prompts-page-with-bulk.tsx`: Soft delete implementation
   - `prompts/page.tsx`: Filters out soft-deleted items
   - `trash/page.tsx`: Shows items in trash (30 day retention)

#### Features:
- ✅ Prompts worden naar trash verplaatst (niet permanent verwijderd)
- ✅ 30 dagen retention periode
- ✅ Restore functionaliteit beschikbaar in trash
- ✅ Automatic cleanup na 30 dagen

---

## 🎯 Editor Improvements

### XML "Wrap in Tag" Functionaliteit
**Priority: Medium | Added: 2025-08-23**

#### 🐛 Bug Fix:
- **Probleem**: Bij het indrukken van Enter in de modal verdwijnt alle content
  - Waarschijnlijk dubbele actie: form submit + onKeyDown handler
  - Content komt terug met Undo, dus wordt wel toegepast maar daarna overschreven
  - **Oplossing**: preventDefault() op form submit of onKeyDown conflict oplossen

#### ✨ Enhancement - Mooie XML Formatting:
Wanneer je "Wrap in Tag" gebruikt, moet het resultaat mooi geformatteerd worden:

**Huidige output:**
```xml
<instruction>Dit is de geselecteerde tekst</instruction>
```

**Gewenste output:**
```xml
<instruction>
  Dit is de geselecteerde tekst
</instruction>
```

**Implementatie details:**
- Opening tag op eigen regel
- Content met tab indentatie (2 spaties of tab)
- Closing tag op eigen regel
- Behoud eventuele bestaande indentatie levels
- Voor multi-line selections: behoud relative indentatie

---

## 🎨 UI/UX Polish

### Editor Toolbar
- [ ] Floating toolbar die bij selectie verschijnt (zoals Medium editor)
- [ ] Keyboard shortcuts tooltips (bijv. Ctrl+B voor bold in Markdown)
- [ ] Syntax highlighting voor variabelen in alle modes

### Performance
- [ ] Virtual scrolling voor lange prompts (1000+ regels)
- [ ] Debounce auto-save indicatie
- [ ] Lazy load CodeMirror language modes

---

## 🚀 Features voor Later

### Prompt Templates
- [ ] Template library met voorgedefinieerde prompt structuren
- [ ] Custom template creator
- [ ] Template variabelen met type hints

### Collaboration
- [ ] Real-time cursor positions van andere gebruikers
- [ ] Comments op specifieke regels
- [ ] Suggest changes mode (zoals Google Docs)

### AI Assistant
- [ ] "Improve this prompt" button met AI suggesties
- [ ] Auto-detect missing variables
- [ ] Prompt effectiveness score

---

## 🔧 Technical Debt

### Code Quality
- [ ] Unit tests voor editor component
- [ ] E2E tests voor edit flow
- [ ] Accessibility audit (WCAG 2.1 AA)

### Performance
- [ ] Bundle size optimization (tree-shake unused CodeMirror features)
- [ ] Image optimization voor avatars
- [ ] Database query optimization (N+1 queries in version history)

---

## 📋 Quick Wins (< 30 min each)

1. [ ] Add "Copy as Markdown" button voor XML mode
2. [ ] Syntax highlighting voor {{variables}} in description field
3. [ ] Auto-save draft every 30 seconds
4. [ ] Breadcrumb navigation (Workspace > Prompts > Edit)
5. [ ] "Unsaved changes" warning bij page leave
6. [ ] Ctrl+S keyboard shortcut voor save
7. [ ] Full-screen editor mode
8. [ ] Word/character count in status bar

---

## 🎯 Prioriteit Matrix

### High Priority (Deze sprint)
- Bug fix: Enter key in XML modal
- XML formatting verbetering

### Medium Priority (Volgende sprint)
- Floating toolbar
- Auto-save
- Keyboard shortcuts

### Low Priority (Backlog)
- Template library
- AI assistant
- Real-time collaboration

---

## 📝 Notes

- Gebruiker feedback 23-08-2025: "Enter key bug is vervelend maar workaround met Apply button werkt"
- Performance is goed tot ~500 regels, daarna merkbare vertraging
- Dark mode contrast kan beter voor syntax highlighting

---

_Dit document wordt regelmatig bijgewerkt met nieuwe feedback en prioriteiten._