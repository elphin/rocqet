# Database Security Strategy for ROCQET

## Current Security Issues
1. **Inline SQL allows arbitrary queries** - Users can run DROP, DELETE, UPDATE
2. **No query validation** - No checks on what queries are allowed
3. **No resource limits** - Queries could return millions of rows
4. **No audit logging** - No tracking of who runs what queries

## Recommended Implementation

### Phase 1: Immediate Security (IMPLEMENT NOW)
```typescript
// Remove inline SQL option entirely
// Only allow saved queries that are pre-approved
{
  queryMode: 'saved', // Remove 'inline' option
  queryId: 'uuid',    // Reference to approved query
  variables: {}       // Safe parameterized inputs
}
```

### Phase 2: Query Builder (FUTURE)
```typescript
// Visual query builder that generates safe SQL
{
  operation: 'select', // select, count, exists
  table: 'users',      // From whitelist
  columns: ['id', 'name'], // Specific columns
  conditions: [
    { column: 'status', operator: 'eq', value: '{{variable}}' }
  ],
  limit: 100,         // Max 1000
  timeout: 5000       // Max 5 seconds
}
```

### Phase 3: Advanced Security
- **Row Level Security** - Users only see their workspace data
- **Query approval workflow** - Admins approve new queries
- **Execution logs** - Track all database operations
- **Rate limiting** - Max queries per minute
- **Cost tracking** - Monitor database usage

## Security Rules

### For Saved Queries (Recommended)
✅ **ALLOWED:**
- Pre-approved query templates
- Parameterized inputs (automatically escaped)
- Read-only operations by default
- Workspace-scoped data only

❌ **NOT ALLOWED:**
- Dynamic SQL construction
- DDL operations (CREATE, DROP, ALTER)
- Cross-workspace queries
- Unparameterized inputs

### For Database Connections
```typescript
// Connection security settings
{
  read_only: true,           // Default for all connections
  allowed_operations: ['SELECT'], // Whitelist operations
  max_rows: 1000,           // Limit result size
  timeout_ms: 5000,         // Max execution time
  allowed_tables: ['*'],    // Or specific table list
  blocked_tables: ['users', 'api_keys'], // Sensitive tables
}
```

## Implementation Priority

1. **NOW**: Remove inline SQL option from chain builder
2. **NEXT SPRINT**: Add query validation for saved queries
3. **FUTURE**: Build visual query builder
4. **LONG TERM**: Implement full RLS and audit logging

## Code Changes Needed

### 1. Remove Inline SQL Option
File: `src/components/chain-builder-premium-v2.tsx`
- Remove 'inline' option from query mode selector
- Remove SQL textarea input
- Keep only saved query selection

### 2. Add Query Validation
File: `src/app/actions/chain-actions.ts`
```typescript
// Validate saved queries before execution
async function validateQuery(queryId: string, workspaceId: string) {
  // Check query exists and belongs to workspace
  // Check query is marked as safe
  // Check user has permission to run query
  // Apply rate limits
}
```

### 3. Connection Security
File: `src/lib/db/schema/database-connections.ts`
```typescript
// Add security fields to connections
{
  read_only: boolean,
  max_rows: number,
  timeout_ms: number,
  allowed_operations: string[],
  allowed_tables: string[],
  blocked_tables: string[],
}
```

## Best Practices from Industry

### Zapier Approach
- No SQL access at all
- Pre-built integrations only
- Visual field mapping

### Retool Approach  
- SQL with {{ }} variables only
- Automatic parameterization
- Resource queries managed by admins

### Supabase Approach
- Row Level Security policies
- API access instead of direct SQL
- Function-based queries

## Recommendation: Start with Option 1

**Remove inline SQL immediately and only allow saved queries.**

This is the safest approach and follows the principle of least privilege. Users can only run queries that have been pre-approved and tested.

Later, we can add a visual query builder for more flexibility while maintaining security.