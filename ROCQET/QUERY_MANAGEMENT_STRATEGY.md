# 🔍 ROCQET Query Management Strategy

## 📊 Research Summary: How Others Do It

### Industry Leaders Comparison

| Tool | Approach | Key Features | What We Can Learn |
|------|----------|--------------|-------------------|
| **Metabase** | Questions & Models | - Saved questions as reusable queries<br>- Models as derived tables<br>- SQL snippets for common fragments<br>- {{variable}} syntax | Best-in-class query organization |
| **Retool** | Resource Queries | - GUI and SQL modes<br>- Dynamic resource switching<br>- Query library with versioning | Good for multi-tenant scenarios |
| **Hasura** | GraphQL Auto-gen | - Auto-generated from schema<br>- No manual query writing<br>- Permission-based queries | Automatic but less flexible |
| **Supabase** | SQL Editor | - Saved queries in dashboard<br>- Query favorites<br>- Results caching | Simple but effective |
| **DBeaver** | SQL Templates | - Template library<br>- Variable substitution<br>- Query history | Developer-focused features |

---

## 🎯 ROCQET Query Management Architecture

### Core Concept: "Query Templates"
Think of queries as **reusable, parameterized SQL templates** that can be:
- Saved and organized in your workspace
- Used in chains for automation
- Shared with team members
- Version controlled like prompts

---

## 📁 Information Architecture

```
/[workspace]/queries                    → Query Library (main hub)
/[workspace]/queries/new                → Create new query
/[workspace]/queries/[id]               → Query detail & editor
/[workspace]/queries/[id]/runs          → Execution history
/[workspace]/settings/databases/[id]/queries → Queries per connection
```

---

## 🏗️ Database Schema

```sql
-- Main queries table
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  connection_id UUID NOT NULL REFERENCES database_connections(id),
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Query content
  sql_template TEXT NOT NULL,              -- SQL with {{variables}}
  variables_schema JSONB DEFAULT '[]',     -- Variable definitions
  
  -- Organization
  folder_id UUID REFERENCES folders(id),
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Security
  is_read_only BOOLEAN DEFAULT true,       -- SELECT only
  requires_approval BOOLEAN DEFAULT false, -- For write operations
  allowed_users UUID[] DEFAULT '{}',       -- Specific user access
  
  -- Metadata
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, slug)
);

-- Query execution history
CREATE TABLE query_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES queries(id),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Execution details
  parameters JSONB,                        -- Variable values used
  sql_executed TEXT NOT NULL,              -- Actual SQL after substitution
  
  -- Results
  status TEXT CHECK (status IN ('pending', 'running', 'success', 'error')),
  rows_returned INTEGER,
  rows_affected INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- Chain context (if run from chain)
  chain_run_id UUID,
  step_id UUID,
  
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query versions (git-style)
CREATE TABLE query_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES queries(id),
  version INTEGER NOT NULL,
  
  -- Version content
  sql_template TEXT NOT NULL,
  variables_schema JSONB,
  change_description TEXT,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(query_id, version)
);

-- Query results cache (optional, for expensive queries)
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES queries(id),
  parameters_hash VARCHAR(64) NOT NULL,    -- Hash of parameters
  
  -- Cached data
  result_data JSONB NOT NULL,
  result_count INTEGER,
  
  -- Cache management
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(query_id, parameters_hash)
);
```

---

## 🎨 UI Components

### 1. Query Library Page (`/[workspace]/queries`)
```tsx
- Search bar with filters (connection, tags, read/write)
- Grid/List view toggle
- Folders sidebar (like prompts)
- Query cards showing:
  - Name & description
  - Database connection badge
  - Last run status
  - Tags
  - Favorite star
```

### 2. Query Editor (`/[workspace]/queries/[id]`)
```tsx
<div className="grid grid-cols-12 gap-6">
  {/* Left Panel - Query Editor */}
  <div className="col-span-8">
    <CodeMirrorSQLEditor 
      value={sqlTemplate}
      variables={extractVariables(sqlTemplate)}
      schema={databaseSchema}
    />
    
    {/* Variable inputs */}
    <VariableInputPanel 
      variables={variables}
      onChange={setVariables}
    />
    
    {/* Actions */}
    <div className="flex gap-2">
      <Button onClick={runQuery}>Run Query</Button>
      <Button onClick={saveQuery}>Save</Button>
      <Button onClick={addToChain}>Add to Chain</Button>
    </div>
  </div>
  
  {/* Right Panel - Results & Info */}
  <div className="col-span-4">
    <Tabs>
      <Tab>Results</Tab>
      <Tab>Schema</Tab>
      <Tab>History</Tab>
      <Tab>Settings</Tab>
    </Tabs>
    
    <ResultsTable data={results} />
  </div>
</div>
```

### 3. Variable System
```sql
-- Example query with variables
SELECT 
  * 
FROM 
  users 
WHERE 
  created_at >= {{start_date}}
  AND status = {{status}}
  AND workspace_id = {{workspace_id}}
LIMIT {{limit:100}}  -- Default value syntax
```

Variable Schema:
```json
{
  "variables": [
    {
      "name": "start_date",
      "type": "date",
      "required": true,
      "description": "Filter users created after this date"
    },
    {
      "name": "status",
      "type": "select",
      "options": ["active", "inactive", "pending"],
      "default": "active"
    },
    {
      "name": "limit",
      "type": "number",
      "default": 100,
      "min": 1,
      "max": 1000
    }
  ]
}
```

---

## 🔗 Chain Integration

### Database Step Configuration
```tsx
{
  type: 'database',
  config: {
    mode: 'query' | 'template' | 'raw',
    
    // Mode: Use saved query
    queryId: 'query-uuid',
    
    // Mode: Use template
    template: 'SELECT * FROM {{table}} WHERE id = {{id}}',
    
    // Mode: Raw SQL
    sql: 'SELECT * FROM users',
    
    // Variable mapping from previous steps
    variableMapping: {
      'user_id': '{{step1.output.id}}',
      'status': '{{step2.output.status}}'
    }
  }
}
```

---

## 🔒 Security Features

### 1. Query Validation
- Prevent SQL injection with parameterized queries
- Validate against allowed operations
- Schema validation before execution

### 2. Permission Levels
```typescript
enum QueryPermission {
  READ_ONLY = 'read_only',      // SELECT only
  READ_WRITE = 'read_write',    // SELECT, INSERT, UPDATE
  ADMIN = 'admin'                // All operations including DDL
}
```

### 3. Audit Trail
```typescript
// Every query execution is logged
{
  user: 'user@example.com',
  query: 'Update user status',
  timestamp: '2024-01-25T10:30:00Z',
  rowsAffected: 5,
  parameters: { status: 'active' }
}
```

---

## 🚀 Implementation Phases

### Phase 1: Basic Query Management (Week 1)
- [ ] Database schema creation
- [ ] Basic query CRUD operations
- [ ] Simple SQL editor (textarea)
- [ ] Query execution with results table

### Phase 2: Advanced Editor (Week 2)
- [ ] CodeMirror SQL editor with syntax highlighting
- [ ] Variable system with {{}} syntax
- [ ] Schema browser sidebar
- [ ] Query history tracking

### Phase 3: Chain Integration (Week 3)
- [ ] Database step uses saved queries
- [ ] Variable mapping from chain context
- [ ] Results passing to next steps
- [ ] Error handling in chains

### Phase 4: Enterprise Features (Week 4)
- [ ] Query approval workflow
- [ ] Results caching
- [ ] Query scheduling
- [ ] Export results (CSV, JSON)
- [ ] Query performance analytics

---

## 💡 Unique ROCQET Features

### 1. "Query Chains"
Link multiple queries together:
```sql
-- Query 1: Get active users
WITH active_users AS ({{query:get_active_users}})

-- Query 2: Calculate metrics
SELECT * FROM active_users WHERE ...
```

### 2. "Smart Variables"
Auto-detect and suggest variables:
- Workspace context: `{{workspace_id}}`
- User context: `{{current_user_id}}`
- Date helpers: `{{today}}`, `{{last_week}}`

### 3. "Query Templates Library"
Pre-built templates for common use cases:
- User analytics
- Revenue reports
- Data exports
- Health checks

### 4. "Query Playground"
Test queries with sample data before saving:
- Mock data generation
- Dry run mode
- Explain plan visualization

---

## 📊 Success Metrics

- Query execution time < 1 second for 95% of queries
- Zero SQL injection vulnerabilities
- 100% audit trail coverage
- Query reuse rate > 60%

---

## 🎯 MVP Features (Start Here!)

1. **Basic Query CRUD**
   - Create, read, update, delete queries
   - Simple SQL editor
   - Save to workspace

2. **Query Execution**
   - Run query against connection
   - Display results in table
   - Basic error handling

3. **Variable System**
   - {{variable}} syntax
   - Simple input fields
   - Parameter substitution

4. **Chain Integration**
   - Use saved query in database step
   - Pass results to next step

---

## 🔄 Migration from Current System

The current database step in chains will be enhanced to support:
1. Inline SQL (current)
2. Saved query reference (new)
3. Query template with variables (new)

This provides backwards compatibility while adding power features.

---

## 📝 Example User Flow

1. **Create Connection** → Set up PostgreSQL database
2. **Browse Schema** → Explore available tables
3. **Write Query** → Create SELECT with {{variables}}
4. **Test Query** → Run with test values
5. **Save Query** → Name and describe
6. **Use in Chain** → Add as database step
7. **Monitor Runs** → View execution history

---

## 🏆 Why This Approach?

1. **Familiar** - Similar to Metabase's Questions concept
2. **Powerful** - Full SQL with template variables
3. **Secure** - Parameterized queries, audit trail
4. **Integrated** - Works seamlessly with chains
5. **Scalable** - From simple SELECTs to complex analytics

This positions ROCQET as the "GitHub for AI Prompts AND Database Queries" - a complete automation platform for modern teams.