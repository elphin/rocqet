# 🔗 ROCQET Advanced Chain Features Documentation

## Overview

ROCQET's prompt chain system has been enhanced with enterprise-grade features that enable complex workflow automation, intelligent decision making, and robust execution monitoring. This document details all the advanced features now available.

## Table of Contents

1. [Core Features](#core-features)
2. [Conditional Logic & Branching](#conditional-logic--branching)
3. [Loop Support](#loop-support)
4. [External Integrations](#external-integrations)
5. [Data Transformations](#data-transformations)
6. [Error Handling & Recovery](#error-handling--recovery)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Testing & Debugging](#testing--debugging)
9. [Templates & Marketplace](#templates--marketplace)
10. [Implementation Examples](#implementation-examples)

---

## Core Features

### ✅ What's Already Implemented

The following features are fully implemented and ready to use:

#### 1. **Advanced Chain Execution Engine** (`src/lib/chain-execution-engine.ts`)
- Graph-based execution flow
- Parallel step execution
- Conditional branching (if/then/else)
- Switch/case logic
- Loop support (for-each, while, for-range)
- API call integration
- Data transformations
- Human-in-the-loop approvals
- Webhook support
- Retry logic with exponential backoff
- Debug mode with breakpoints
- Mock mode for testing

#### 2. **Comprehensive Type System** (`src/types/chain-types.ts`)
- Full TypeScript types for all chain features
- Step validation functions
- Condition evaluation helpers
- Variable resolution utilities

#### 3. **Enhanced Database Schema**
- 40+ new columns in `prompt_chains` table
- New `chain_alerts` table for monitoring
- New `chain_alert_history` table for audit trail
- New `chain_templates` table for marketplace
- Enhanced `prompt_chain_runs` with debug information

#### 4. **UI Components**
- **Chain Builder Advanced** (`src/components/chain-builder-advanced.tsx`)
  - Visual step configuration
  - Drag-and-drop interface
  - Step validation
  - Error handling configuration
  
- **Chain Monitoring Dashboard** (`src/components/chain-monitoring-dashboard.tsx`)
  - Real-time metrics
  - Performance charts
  - Alert management
  - Run history
  
- **Chain Test Panel** (`src/components/chain-test-panel.tsx`)
  - Test mode with mock data
  - Debug mode with breakpoints
  - Step-by-step execution
  - Export/import test data

---

## Conditional Logic & Branching

### If/Then/Else Statements

```typescript
{
  type: 'condition',
  conditionalConfig: {
    condition: {
      type: 'comparison',
      left: '{{userScore}}',
      operator: 'gte',
      right: '80'
    },
    then: ['step-success-1', 'step-success-2'],
    else: ['step-failure-1']
  }
}
```

### Switch/Case Logic

```typescript
{
  type: 'switch',
  switchConfig: {
    variable: '{{department}}',
    cases: [
      { value: 'sales', steps: ['sales-workflow'] },
      { value: 'support', steps: ['support-workflow'] },
      { value: 'engineering', steps: ['eng-workflow'] }
    ],
    default: ['default-workflow']
  }
}
```

### Supported Condition Types
- **Comparison**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `matches`
- **Existence**: Check if variable exists
- **Regex**: Pattern matching
- **Custom**: JavaScript expressions (sandboxed)

---

## Loop Support

### For-Each Loop

```typescript
{
  type: 'loop',
  loopConfig: {
    type: 'for_each',
    items: '{{customerList}}',
    itemVariable: 'currentCustomer',
    indexVariable: 'customerIndex',
    steps: ['process-customer']
  }
}
```

### While Loop

```typescript
{
  type: 'loop',
  loopConfig: {
    type: 'while',
    condition: {
      type: 'comparison',
      left: '{{retryCount}}',
      operator: 'lt',
      right: '5'
    },
    maxIterations: 100,
    steps: ['attempt-operation']
  }
}
```

### For-Range Loop

```typescript
{
  type: 'loop',
  loopConfig: {
    type: 'for_range',
    start: 0,
    end: 10,
    step: 2,
    indexVariable: 'i',
    steps: ['process-batch']
  }
}
```

---

## External Integrations

### API Calls

```typescript
{
  type: 'api_call',
  apiCallConfig: {
    method: 'POST',
    url: 'https://api.example.com/process',
    headers: {
      'Authorization': 'Bearer {{apiKey}}',
      'Content-Type': 'application/json'
    },
    body: {
      data: '{{inputData}}',
      timestamp: '{{currentTime}}'
    },
    authentication: {
      type: 'bearer',
      token: '{{apiToken}}'
    },
    responseType: 'json',
    extractPath: 'data.results',
    outputVariable: 'apiResponse'
  }
}
```

### Database Queries

```typescript
{
  type: 'database_query',
  databaseConfig: {
    connectionString: '{{dbConnection}}',
    query: 'SELECT * FROM users WHERE status = $1',
    parameters: { $1: 'active' },
    outputFormat: 'rows',
    outputVariable: 'activeUsers'
  }
}
```

### Webhooks

```typescript
{
  type: 'webhook',
  webhookConfig: {
    url: '{{webhookUrl}}',
    method: 'POST',
    body: {
      event: 'chain_completed',
      data: '{{results}}'
    },
    waitForResponse: true,
    timeout: 30000
  }
}
```

---

## Data Transformations

### Available Transformation Types

```typescript
{
  type: 'transformation',
  transformConfig: {
    type: 'filter', // or 'map', 'reduce', 'sort', etc.
    input: '{{dataArray}}',
    output: 'filteredData',
    filter: {
      field: 'status',
      operator: 'eq',
      value: 'active'
    }
  }
}
```

### Supported Transformations
- **JSON Operations**: parse, stringify
- **Array Operations**: filter, map, reduce, sort, group_by
- **String Operations**: join, split, regex_extract, format
- **Math Operations**: calculate expressions
- **Custom Functions**: JavaScript transformations

---

## Error Handling & Recovery

### Retry Configuration

```typescript
{
  retryConfig: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
    retryOn: 'all_errors',
    statusCodes: [502, 503, 504]
  }
}
```

### Error Handling Strategies

```typescript
{
  errorHandling: {
    onError: 'fallback', // 'stop', 'continue', 'retry'
    fallbackSteps: ['error-handler'],
    errorVariable: 'lastError',
    logError: true
  }
}
```

---

## Monitoring & Alerts

### Alert Configuration

```sql
-- Alert when chain fails
{
  type: 'failure',
  severity: 'high',
  conditions: {
    consecutive_failures: 3
  },
  actions: [
    { type: 'email', recipients: ['admin@example.com'] },
    { type: 'webhook', url: 'https://alerts.example.com' }
  ]
}
```

### Metrics Tracked
- **Performance**: Execution time (avg, p95, p99)
- **Reliability**: Success rate, failure count
- **Cost**: Total tokens, total cost
- **Volume**: Run count, throughput
- **SLA**: Target compliance

### Dashboard Features
- Real-time execution monitoring
- Historical trend analysis
- Cost breakdown by chain
- Error distribution charts
- Alert management interface

---

## Testing & Debugging

### Test Mode Features
- Mock data injection
- Dry run execution
- Variable inspection
- Step-by-step execution
- Export/import test scenarios

### Debug Mode Features
- Breakpoint setting
- Variable watching
- Execution path visualization
- Debug log output
- Performance profiling

### Test Panel Capabilities
```typescript
// Configure test options
{
  stopOnError: true,
  dryRun: true,
  mockMode: true,
  debug: true,
  maxParallel: 1,
  timeout: 60000
}
```

---

## Templates & Marketplace

### Template Structure

```typescript
{
  name: "Customer Onboarding Flow",
  category: "Sales",
  description: "Automated customer onboarding with validation",
  steps: [...],
  variables: [
    { name: 'customerEmail', type: 'string', required: true },
    { name: 'productTier', type: 'string', default: 'basic' }
  ],
  examples: [
    {
      name: 'Basic Onboarding',
      inputs: { customerEmail: 'test@example.com' },
      expectedOutput: { status: 'onboarded' }
    }
  ]
}
```

### Marketplace Features
- Public/private templates
- Official ROCQET templates
- Usage statistics
- Rating system
- Fork capability
- Version management

---

## Implementation Examples

### Example 1: Customer Support Workflow

```typescript
const supportChain = {
  name: "Customer Support Automation",
  steps: [
    // Step 1: Categorize ticket
    {
      id: 'categorize',
      type: 'prompt',
      promptId: 'ticket-categorizer',
      outputVariable: 'category'
    },
    
    // Step 2: Route based on category
    {
      id: 'route',
      type: 'switch',
      switchConfig: {
        variable: '{{category}}',
        cases: [
          { value: 'billing', steps: ['billing-flow'] },
          { value: 'technical', steps: ['tech-flow'] },
          { value: 'general', steps: ['general-flow'] }
        ]
      }
    },
    
    // Step 3: Check urgency and escalate if needed
    {
      id: 'check-urgency',
      type: 'condition',
      conditionalConfig: {
        condition: {
          type: 'comparison',
          left: '{{urgencyScore}}',
          operator: 'gte',
          right: '8'
        },
        then: ['escalate-to-human'],
        else: ['auto-respond']
      }
    }
  ]
};
```

### Example 2: Data Processing Pipeline

```typescript
const dataPipeline = {
  name: "Batch Data Processing",
  steps: [
    // Fetch data from API
    {
      id: 'fetch-data',
      type: 'api_call',
      apiCallConfig: {
        method: 'GET',
        url: 'https://api.example.com/data',
        outputVariable: 'rawData'
      }
    },
    
    // Process each item
    {
      id: 'process-loop',
      type: 'loop',
      loopConfig: {
        type: 'for_each',
        items: '{{rawData.items}}',
        itemVariable: 'item',
        steps: ['validate-item', 'transform-item', 'store-item']
      }
    },
    
    // Send completion webhook
    {
      id: 'notify-completion',
      type: 'webhook',
      webhookConfig: {
        url: '{{notificationUrl}}',
        body: {
          status: 'completed',
          processed: '{{processedCount}}',
          errors: '{{errorCount}}'
        }
      }
    }
  ]
};
```

### Example 3: Content Generation with Quality Control

```typescript
const contentChain = {
  name: "Article Generation with QA",
  steps: [
    // Generate initial content
    {
      id: 'generate',
      type: 'prompt',
      promptId: 'article-generator',
      outputVariable: 'draftArticle'
    },
    
    // Quality check
    {
      id: 'quality-check',
      type: 'prompt',
      promptId: 'content-reviewer',
      inputMapping: {
        content: '{{draftArticle}}'
      },
      outputVariable: 'qualityScore'
    },
    
    // Retry if quality is low
    {
      id: 'quality-gate',
      type: 'condition',
      conditionalConfig: {
        condition: {
          type: 'comparison',
          left: '{{qualityScore}}',
          operator: 'lt',
          right: '7'
        },
        then: ['regenerate-with-feedback'],
        else: ['publish-article']
      }
    },
    
    // Human approval for high-value content
    {
      id: 'human-review',
      type: 'human_approval',
      condition: {
        type: 'comparison',
        left: '{{contentValue}}',
        operator: 'eq',
        right: 'high'
      },
      approvalConfig: {
        message: 'Please review the generated article',
        approvers: ['editor@example.com'],
        timeout: 3600000,
        dataToShow: ['draftArticle', 'qualityScore']
      }
    }
  ]
};
```

---

## Database Migration

To enable these features, run the migration script:

```bash
node scripts/run-database-setup.mjs
```

The migration script (`scripts/add-advanced-chain-features.sql`) will:
- Add 40+ new columns to existing tables
- Create new tables for alerts and templates
- Set up proper indexes
- Configure RLS policies
- Add helpful comments

---

## API Endpoints

### Chain Execution
- `POST /api/chains/execute` - Execute a chain with advanced features
- `GET /api/chains/runs/:id` - Get execution details with debug info
- `POST /api/chains/runs/:id/cancel` - Cancel a running chain

### Monitoring
- `GET /api/chains/metrics` - Get chain performance metrics
- `GET /api/chains/alerts` - Get active alerts
- `POST /api/chains/alerts/:id/acknowledge` - Acknowledge an alert
- `GET /api/chains/time-series` - Get time-series data for charts

### Templates
- `GET /api/chains/templates` - Browse available templates
- `POST /api/chains/templates/:id/fork` - Fork a template
- `POST /api/chains/templates` - Create a new template

---

## Best Practices

### 1. Error Handling
- Always configure retry policies for external calls
- Use fallback steps for critical operations
- Set appropriate timeouts
- Log errors for debugging

### 2. Performance
- Use parallel execution where possible
- Set reasonable max iteration limits for loops
- Cache API responses when appropriate
- Monitor execution times and optimize bottlenecks

### 3. Testing
- Create comprehensive test scenarios
- Use mock mode for development
- Test error paths and edge cases
- Export successful test data for regression testing

### 4. Security
- Store sensitive data in environment variables
- Use proper authentication for external services
- Validate all inputs
- Implement rate limiting for webhooks

### 5. Monitoring
- Set up alerts for critical chains
- Monitor SLA compliance
- Track cost trends
- Review error patterns regularly

---

## Roadmap

### Coming Soon
1. **Code Execution** - Sandboxed Python/JavaScript execution
2. **Advanced Scheduling** - Cron-based chain execution
3. **Chain Versioning** - Git-style version control for chains
4. **Collaboration** - Comments and review workflows
5. **Advanced Analytics** - ML-based optimization suggestions

### Future Enhancements
- Visual flow designer with node-based interface
- Chain composition (chains calling other chains)
- Advanced caching strategies
- Multi-cloud deployment options
- Enterprise SSO integration

---

## Support

For questions or issues with chain features:
1. Check the debug log in test panel
2. Review error messages in monitoring dashboard
3. Consult this documentation
4. Contact support with chain ID and run ID

---

*Last Updated: 2025-08-25*
*Version: 1.0.0*