# 🎯 ROCQET Tier Structure Documentation

*Last Updated: 2025-08-27*

## 📊 Tier Overview

### **🌟 STARTER Tier** (formerly Free)
**Type**: Personal Workspace  
**Price**: €0/month  
**Users**: 1 (workspace owner only)  

### **💎 PRO Tier**
**Type**: Personal Workspace (enhanced)  
**Price**: €19/month  
**Users**: 1 (workspace owner only)  

### **👥 TEAM Tier** (formerly Business)
**Type**: Team Workspace(s)  
**Price**: €99/month base (includes 2 seats)  
**Additional Seats**: €20/seat/month  
**Minimum Seats**: 2  
**Maximum Seats**: Unlimited  

---

## 🎯 Key Concepts

### Personal vs Team Workspaces

#### **Personal Workspaces (Starter/Pro)**
- One workspace per subscription
- Cannot invite team members
- Owner pays for their own subscription
- Workspace type: `personal`
- Can be upgraded from Starter → Pro (keeps same workspace)

#### **Team Workspaces (Team Tier)**
- Multiple workspaces possible
- Seat pool shared across all team workspaces
- Owner manages seat distribution
- Workspace type: `team`
- Owner pays for all seats

---

## 💺 Seat Pool Management (Team Tier)

### How It Works:
1. **Team owner purchases seat pool** (min 2 seats)
2. **Creates multiple team workspaces** as needed
3. **Distributes seats across workspaces**
4. **Total members across all workspaces ≤ total seats purchased**

### Example:
```
Company ABC purchases 10 seats:
- Marketing Team Workspace: 4 members
- Development Team Workspace: 3 members  
- Design Team Workspace: 3 members
Total: 10 members = 10 seats ✓
```

### Seat Rules:
- ✅ Can create unlimited workspaces (within seat limit)
- ✅ Can move members between workspaces
- ✅ Can buy additional seats anytime (per seat, not in blocks)
- ❌ Cannot exceed total purchased seats
- ❌ Cannot have less than 2 seats (minimum)
- ❌ Must remove members before reducing seats

---

## 📋 Feature Comparison

### **STARTER Tier**
```yaml
Limits:
  prompts: 25
  versions: 5 per prompt
  test_runs: 100/month
  workspaces: 1 (personal)
  
Features:
  - Basic folders
  - Public sharing (read-only)
  - GPT-3.5 & Claude Haiku
  
Restricted:
  - ❌ Private folders
  - ❌ API access
  - ❌ Analytics
  - ❌ Team features
  - ❌ Advanced AI models
```

### **PRO Tier**
```yaml
Limits:
  prompts: Unlimited
  versions: Unlimited
  test_runs: 5,000/month
  workspaces: 1 (personal)
  
Features:
  - Everything in Starter, plus:
  - Private folders & subfolders
  - API access (rate limited)
  - Basic analytics
  - All AI models (GPT-4, Claude Opus, etc.)
  - Export/Import
  - Custom variables & templates
  - 1 guest user (read-only)
  
Restricted:
  - ❌ Team collaboration
  - ❌ Multiple team members
  - ❌ Audit logs
  - ❌ Webhooks
```

### **TEAM Tier**
```yaml
Limits:
  prompts: Unlimited
  versions: Unlimited
  test_runs: Unlimited
  workspaces: Unlimited (within seat limit)
  team_members: Based on purchased seats
  
Features:
  - Everything in Pro, plus:
  - Multiple team workspaces
  - Seat pool management
  - Role-based access (Owner/Admin/Editor/Viewer)
  - Advanced analytics & reports
  - Audit logs
  - Activity feed
  - Webhooks
  - Priority support
  - Custom branding per workspace
```

---

## 🔄 Upgrade/Downgrade Flows

### Upgrade Paths:
```
Starter → Pro: 
  - Same workspace upgraded
  - Type remains 'personal'
  - Instant feature unlock

Starter/Pro → Team:
  - Creates NEW team workspace
  - Keeps personal workspace
  - Becomes owner of team workspace
  
Team → More Seats:
  - Instant addition
  - Can allocate to any workspace
```

### Downgrade Paths:
```
Pro → Starter:
  - Keep workspace, lose features
  - Prompts over 25 become read-only
  - API access revoked
  
Team → Fewer Seats:
  - Must remove members first
  - Cannot go below 2 seats
  - Workspaces remain but may be understaffed
  
Team → Pro/Starter:
  - ⚠️ Complex: Need to decide what happens to team workspaces
  - Option 1: Archive team workspaces (read-only)
  - Option 2: Transfer ownership to another member
  - Option 3: Delete team workspaces (with warning)
```

---

## 💰 Billing Logic

### Personal Workspaces:
- User pays directly
- Single subscription
- Monthly/yearly billing

### Team Workspaces:
- Owner pays for all seats
- Single bill for entire seat pool
- Can have multiple team workspaces on one subscription
- Seat changes are prorated

### Multiple Workspace Scenario:
```
User Jane has:
- Personal Workspace (Pro) - Jane pays €19/month
- ACME Team (member) - ACME owner pays
- StartupX Team (owner) - Jane pays for 5 seats €139/month

Total Jane pays: €19 + €139 = €158/month
```

---

## ⚠️ Important Considerations

### Downgrade Protection:
- **Data Loss Prevention**: Never delete data on downgrade
- **Grace Period**: 30 days to export data before restrictions
- **Feature Degradation**: Gracefully disable features, don't break
- **Clear Communication**: Warn before any destructive action

### Seat Management Edge Cases:
1. **Owner leaves team**: Must transfer ownership first
2. **Seat reduction**: Block if members > new seat count
3. **Workspace deletion**: Free up seats for reallocation
4. **Member in multiple workspaces**: Counts as 1 seat in pool

### Database Fields:
```sql
workspaces:
  - workspace_type: 'personal' | 'team' | 'organization'
  - is_personal: boolean
  - subscription_tier: 'starter' | 'pro' | 'team'
  - parent_account_id: UUID (for team workspaces, points to owner's account)
  
accounts: (new table needed)
  - id: UUID
  - owner_id: UUID (user who owns the account)
  - subscription_tier: 'starter' | 'pro' | 'team'
  - total_seats: integer (for team tier)
  - used_seats: integer (calculated)
```

---

## 🚀 Implementation Priority

1. **Phase 1**: Update tier names everywhere
2. **Phase 2**: Implement account/seat pool structure
3. **Phase 3**: Build upgrade/downgrade flows
4. **Phase 4**: Add seat management UI
5. **Phase 5**: Handle edge cases & restrictions

---

## 📝 Notes for Development

- Always use new names: `starter`, `pro`, `team` (not free/business)
- Team tier creates `team` type workspaces
- Personal tiers use `personal` type workspaces
- Seat pool is account-level, not workspace-level
- Minimum viable team = 2 seats (owner + 1 member)