# 🔑 API Key Management Strategy

## Executive Summary
Dit document beschrijft de strategie voor API key management in ROCQET, inclusief huidige implementatie, use cases, en toekomstige roadmap voor teams.

---

## 📊 Current Implementation (v1.0)

### Workspace-Level Keys
- **Scope**: Keys worden per workspace opgeslagen
- **Permissions**: Workspace admins/owners beheren keys
- **Isolation**: Complete scheiding tussen workspaces
- **Status**: ✅ Geïmplementeerd

```typescript
// Current priority order:
1. Workspace default key for provider
2. Mock response (no key available)
```

---

## 🎯 Team Use Cases Analysis

### Use Case 1: Marketing Agency
**Scenario**: Agency met meerdere klanten
- Workspace A: Nike (eigen OpenAI key, eigen budget)
- Workspace B: Adidas (eigen Anthropic key, eigen budget)
- Workspace C: Internal (agency keys)

**Requirement**: Strikte scheiding van keys en kosten
**Best fit**: Workspace-level keys ✅

### Use Case 2: Enterprise IT Department
**Scenario**: Groot bedrijf met centrale IT governance
- Alle teams gebruiken corporate API keys
- IT beheert en roteert keys centraal
- Compliance en security auditing

**Requirement**: Centrale controle en management
**Best fit**: Account-level keys

### Use Case 3: Scale-up/Startup
**Scenario**: Snel groeiend team met verschillende environments
- Production workspace (production keys)
- Development workspace (test keys)
- Demo workspace (demo keys met limits)

**Requirement**: Flexibiliteit met veiligheid
**Best fit**: Hybride model

---

## 🏗️ Architecture Comparison

### Option 1: Workspace-Level Keys (Current)

```
Workspace A → API Keys A → OpenAI/Anthropic/Google
Workspace B → API Keys B → OpenAI/Anthropic/Google
Workspace C → API Keys C → OpenAI/Anthropic/Google
```

**Pros:**
- ✅ Complete isolatie tussen projecten/klanten
- ✅ Granulaire toegangscontrole
- ✅ Aparte budgetten en usage tracking
- ✅ Verschillende providers per workspace

**Cons:**
- ❌ Duplicatie van keys tussen workspaces
- ❌ Meer setup werk voor nieuwe workspaces
- ❌ Geen centrale key rotation

### Option 2: Account-Level Keys

```
Account → Global API Keys → All Workspaces
```

**Pros:**
- ✅ Centrale management en rotation
- ✅ Eenvoudiger voor kleine teams
- ✅ Één plek voor compliance
- ✅ Minder setup overhead

**Cons:**
- ❌ Geen kosten-scheiding
- ❌ Alle workspaces delen limits
- ❌ Security risk: één compromised key = alle workspaces

### Option 3: Hybrid Model (Recommended Future)

```
Account Default Keys (inherited)
         ↓
Workspace Override Keys (optional)
```

**Implementation:**
```typescript
// Priority waterfall:
1. Workspace-specific key (if exists)
2. Account default key (fallback)
3. Mock response (no key)
```

---

## 🚀 Roadmap

### Phase 1: Foundation (Current) ✅
- [x] Workspace-level API keys
- [x] Encryption at rest
- [x] Provider validation
- [x] Default key per provider
- [x] Integration with playground

### Phase 2: Team Features (Q2 2025)
- [ ] Account-level default keys
- [ ] Key inheritance settings
- [ ] Usage dashboard per workspace
- [ ] Cost attribution reports
- [ ] Key rotation reminders

### Phase 3: Enterprise (Q3 2025)
- [ ] Key policies (enforce providers)
- [ ] Mandatory rotation schedules
- [ ] Audit logs for key usage
- [ ] Budget alerts and caps
- [ ] Cross-workspace key sharing
- [ ] Service accounts for CI/CD

### Phase 4: Advanced (Q4 2025)
- [ ] API key vaults integration (HashiCorp, AWS)
- [ ] Dynamic key provisioning
- [ ] Usage-based key throttling
- [ ] Workspace templates with preset keys
- [ ] RBAC for key permissions

---

## 💡 Implementation Details

### Database Schema Extension
```sql
-- Future: Account-level keys
CREATE TABLE account_api_keys (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Key inheritance settings
ALTER TABLE workspaces ADD COLUMN 
  use_account_keys BOOLEAN DEFAULT true;
```

### API Priority Logic
```typescript
async function getApiKey(workspaceId: string, provider: string) {
  // 1. Check workspace override
  const workspaceKey = await getWorkspaceKey(workspaceId, provider);
  if (workspaceKey) return workspaceKey;
  
  // 2. Check if inheritance is enabled
  const workspace = await getWorkspace(workspaceId);
  if (workspace.use_account_keys) {
    const accountKey = await getAccountKey(workspace.account_id, provider);
    if (accountKey) return accountKey;
  }
  
  // 3. No key available
  return null;
}
```

### UI/UX Considerations
```typescript
// Settings structure
Settings
├── Account Settings
│   └── API Keys (global defaults)
└── Workspace Settings
    └── API Keys (overrides)
        └── [ ] Use account keys (toggle)
```

---

## 🔒 Security Considerations

### Key Storage
- AES-256-GCM encryption at rest
- Keys never exposed in logs
- Masked display in UI
- Audit trail for all key operations

### Permissions Model
```typescript
// Account level
- Owner: Full access to account keys
- Admin: Manage account keys
- Member: No access to account keys

// Workspace level
- Owner: Full access to workspace keys
- Admin: Manage workspace keys
- Editor: Use keys (execute prompts)
- Viewer: No key access
```

### Compliance Features
- Key rotation tracking
- Usage auditing
- Cost attribution
- Data residency options

---

## 📈 Business Value

### For Small Teams
- Start simple with workspace keys
- No complex setup required
- Clear cost separation per project

### For Growing Teams
- Gradual adoption of account keys
- Flexibility to override per workspace
- Better governance without complexity

### For Enterprise
- Central IT control
- Compliance and auditing
- Cost management and attribution
- Security policies enforcement

---

## 🎯 Recommendation

### Short Term (Now)
Stick with **workspace-level keys** because:
1. Already implemented and working
2. Fits most use cases
3. Provides good isolation
4. Simpler to understand

### Medium Term (6 months)
Add **account-level defaults** as optional:
1. Backwards compatible
2. Opt-in for teams that want it
3. Reduces setup friction

### Long Term (12 months)
Full **hybrid model** with:
1. Inheritance controls
2. Policy enforcement
3. Advanced sharing options
4. Enterprise compliance features

---

## 📊 Success Metrics

### Adoption
- % of workspaces with configured keys
- Average time to first key setup
- Key rotation frequency

### Usage
- API calls per workspace
- Cost per workspace
- Error rates by provider

### Security
- Time to key rotation
- Number of exposed keys (should be 0)
- Audit log completeness

---

## 🔗 Related Documents
- [FEATURES_SPECIFICATION.md](./FEATURES_SPECIFICATION.md) - Full feature specs
- [TODO_IMPROVEMENTS.md](./TODO_IMPROVEMENTS.md) - Improvement backlog
- [MASTER_PLAN.md](./MASTER_PLAN.md) - Technical architecture

---

_Last updated: 2025-08-24_
_Status: Strategic Planning Document_