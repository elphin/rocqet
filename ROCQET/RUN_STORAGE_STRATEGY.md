# 📊 Run Storage Strategy - ROCQET

## Current Implementation

### Database Storage (`prompt_runs` table)
- **Permanent storage** in Supabase PostgreSQL
- Stores ALL runs when executed via API
- Contains full execution details:
  - Input (prompt content + variables)
  - Output 
  - Model & parameters
  - Tokens & cost
  - Execution metadata

### Local Storage (Browser)
- **Temporary storage** in React state
- Max 20 runs in playground session
- Lost on page refresh
- Used for quick comparisons during testing

---

## 🤔 Should We Keep Runs Long-term?

### Arguments FOR Long-term Storage ✅

1. **Historical Analysis**
   - Track prompt performance over time
   - Identify which models work best for specific prompts
   - Cost optimization insights
   - Quality trending

2. **Compliance & Auditing**
   - Enterprise customers need audit trails
   - Prove when/how AI was used
   - Cost tracking for billing
   - Usage analytics

3. **Learning & Optimization**
   - A/B test results over weeks/months
   - Seasonal performance variations
   - Model updates impact analysis
   - Team learning from past experiments

4. **Future Features**
   - "Show me all runs that cost < $0.01"
   - "Find runs with output > 500 tokens"
   - "Compare this month vs last month"
   - Export run data for analysis

### Arguments AGAINST Long-term Storage ❌

1. **Storage Costs**
   - Each run ~2-5KB
   - 1000 runs/day = ~150MB/month
   - Costs scale with usage

2. **Privacy Concerns**
   - Sensitive data in prompts/outputs
   - GDPR compliance complexity
   - Data retention policies

3. **Performance**
   - Large tables slow down queries
   - Need indexing strategies
   - Pagination complexity

---

## 💡 Recommended Strategy: Tiered Retention

### Tier 1: Hot Storage (0-7 days)
- **Keep EVERYTHING**
- Full prompt content & outputs
- All metadata
- Instant access for comparisons

### Tier 2: Warm Storage (7-30 days)
- **Keep METADATA + SAMPLES**
- Store: metrics, costs, model, parameters
- Sample: Keep 10% of actual content
- Compress outputs > 1000 chars

### Tier 3: Cold Storage (30-90 days)
- **METADATA ONLY**
- Remove prompt/output content
- Keep: tokens, cost, model, timestamp
- For analytics only

### Tier 4: Archive (90+ days)
- **AGGREGATED STATS**
- Daily/weekly summaries
- Total costs, runs, average tokens
- Delete individual records

---

## 🛠️ Implementation Plan

### Phase 1: Current (Now)
```sql
-- Keep everything for now
-- No automatic deletion
-- Monitor growth rate
```

### Phase 2: Smart Retention (Month 2)
```sql
-- Add retention_policy field
CREATE OR REPLACE FUNCTION cleanup_old_runs()
RETURNS void AS $$
BEGIN
  -- Archive runs older than 30 days
  UPDATE prompt_runs 
  SET 
    input = jsonb_build_object('archived', true),
    output = 'archived'
  WHERE executed_at < NOW() - INTERVAL '30 days'
    AND input->>'archived' IS NULL;
    
  -- Delete runs older than 90 days
  DELETE FROM prompt_runs
  WHERE executed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Run daily via cron
SELECT cron.schedule('cleanup-runs', '0 2 * * *', 'SELECT cleanup_old_runs()');
```

### Phase 3: User Control (Month 3)
- Let users choose retention:
  - Free: 7 days
  - Pro: 30 days
  - Enterprise: Unlimited
- "Pin" important runs to keep forever
- Export before deletion

---

## 📈 Storage Estimates

### Per User/Month:
- **Light User** (10 runs/day): ~1MB/month
- **Regular User** (50 runs/day): ~5MB/month  
- **Power User** (200 runs/day): ~20MB/month
- **Enterprise** (1000 runs/day): ~100MB/month

### Cost Impact:
- Supabase Free Tier: 500MB database → ~500 regular users
- Supabase Pro: 8GB database → ~8,000 regular users
- Additional storage: $0.125/GB/month

---

## 🎯 Recommendation

**Start with KEEP EVERYTHING for first 3 months**, then:

1. **Implement tiered retention** based on user feedback
2. **Default: 30-day full retention** (good balance)
3. **Optional: User-controlled retention** (premium feature)
4. **Always: Keep aggregate statistics** (for analytics)

### Why This Works:
- ✅ Valuable for testing phase (first 30 days)
- ✅ Historical data for improvements
- ✅ Compliance-friendly with clear policies
- ✅ Cost-effective with automatic cleanup
- ✅ User choice for important data

### Special Features to Add:
1. **"Star" runs** - Keep forever
2. **Export runs** - Before deletion
3. **Run collections** - Group important tests
4. **Scheduled cleanup** - With email notifications

---

## 🔧 Quick Wins for Now

1. **Add index on executed_at** for faster queries
2. **Implement pagination** in UI (load 20 at a time)
3. **Add "Export All Runs" button** for users
4. **Show storage usage** in settings

```sql
-- Optimize queries
CREATE INDEX idx_prompt_runs_executed_at 
ON prompt_runs(executed_at DESC);

CREATE INDEX idx_prompt_runs_prompt_user 
ON prompt_runs(prompt_id, executed_by, executed_at DESC);
```

---

**Bottom Line**: Keep runs for 30 days standard, let users export or pin important ones, auto-cleanup old data. This balances value, cost, and privacy! 🚀