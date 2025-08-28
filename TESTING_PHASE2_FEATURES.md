# 🧪 Testing Guide for Phase 2 Features

## ✅ Issues Fixed
1. **Fixed ReferenceError**: Added missing state declarations for `selectedPromptForVariables` and `showVariableModal`
2. **Fixed imports**: Added VariableFillModal import
3. **Server running correctly on port 3000**
4. **Added test API key to database** (needs to be replaced with real key)

## 🚀 New Features to Test

### 1. Smart Discovery (Prompts Page)
**Location**: `/[workspace]/prompts`

**How to test**:
1. Go to your prompts page (e.g., `/test/prompts`)
2. Click the "Smart Discovery" button (sparkles icon) in the top-right corner
3. Test three modes:
   - **Search**: Type keywords to search through prompt documentation
   - **Related**: Click on any prompt to see related prompts
   - **Recommended**: View AI recommendations based on your usage

**What to verify**:
- Search finds prompts by documentation fields (when_to_use, requirements, etc.)
- Related prompts show similar tags/content
- Recommendations are relevant

### 2. Run History (Prompt Detail Page)
**Location**: `/[workspace]/prompts/[slug]` → "Run History" tab

**How to test**:
1. Open any prompt detail page
2. Click the "Run History" tab
3. Use the search and filters:
   - Search through past runs
   - Filter by status (success/error)
   - Filter by date range
   - Export data as CSV or JSON

**What to verify**:
- Statistics show correctly (total runs, success rate, duration, cost)
- Search works through inputs/outputs
- Export downloads files correctly
- Run details expand to show full input/output

### 3. Chain Execution Enhancement
**Location**: `/[workspace]/chains/[slug]` → "Execute" button

**How to test**:
1. Create or open a chain
2. Click "Execute" button
3. In the execution panel:
   - Select API key (⚠️ You need to add a real OpenAI key first!)
   - Fill in input variables
   - Toggle advanced options:
     - Parallel execution
     - Timeout settings
     - Dry run mode
   - Click "Execute Chain"

**What to verify**:
- Steps execute in order (or parallel if enabled)
- Progress shows for each step
- Statistics update in real-time
- Error handling works properly

## ⚠️ Important Setup Required

### Add Real OpenAI API Key
The test key "sk-test-key-replace-with-real" won't work. You need to:

**Option 1: Via Supabase Dashboard**
1. Go to Supabase Dashboard
2. Navigate to Table Editor → workspace_api_keys
3. Find the test entry
4. Replace `api_key` with your real OpenAI key

**Option 2: Via Script**
1. Edit `add-test-api-key.mjs`
2. Replace line 62 with your real key:
   ```javascript
   'sk-your-real-openai-key-here', // Your real key
   ```
3. Run: `node add-test-api-key.mjs`

## 📊 Database Tables Created

New tables added for Phase 2:
- `prompt_chain_steps` - Stores chain step configurations
- `chain_runs` - Chain execution history
- `workspace_api_keys` - API keys per workspace

## 🔍 SQL Functions Created

- `search_prompt_documentation` - JSONB search function for Smart Discovery

## 🎯 Quick Test Checklist

- [ ] Smart Discovery sidebar opens/closes
- [ ] Documentation search returns results
- [ ] Related prompts show on detail page
- [ ] Run History tab displays
- [ ] Run search and filters work
- [ ] Export generates CSV/JSON files
- [ ] Chain execution panel opens
- [ ] API key selector shows keys
- [ ] Chain steps show progress
- [ ] Statistics update during execution

## 🐛 Known Limitations

1. **API Key Required**: Chain execution won't work without a valid OpenAI/Anthropic key
2. **Run History**: Only shows data if prompts have been executed
3. **Smart Discovery**: Recommendations work best with usage data

## 💡 Next Steps

After testing, remaining Phase 2 features to implement:
- Webhook Integration
- Conditional logic in chains
- Loop support for batch processing
- Chain templates library

---

**Last Updated**: 2025-08-24
**Status**: Ready for testing (after adding real API key)