# 🔐 Environment Configuration Guide

## Overview

This guide explains every environment variable needed for ROCQET and how to obtain them.

---

## 📋 Complete .env.local Template

```env
# ============================================
# SUPABASE CONFIGURATION (Required)
# ============================================
# Get from: https://app.supabase.com/project/[project-id]/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# DATABASE (Required)
# ============================================
# Get from: Supabase Dashboard > Settings > Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
# For connection pooling (recommended for serverless):
DATABASE_POOLING_URL=postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# ============================================
# SEARCH ENGINE - TYPESENSE (Required)
# ============================================
# Get from: https://cloud.typesense.org
TYPESENSE_HOST=xxx.a1.typesense.net
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=xyz123...
TYPESENSE_SEARCH_ONLY_API_KEY=xyz456...  # For client-side

# ============================================
# AI PROVIDERS (At least one required)
# ============================================
# OpenAI - https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Anthropic - https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...

# ============================================
# VERCEL KV CACHE (Optional but recommended)
# ============================================
# Get from: Vercel Dashboard > Storage > KV
KV_URL=redis://default:password@xxx.kv.vercel-storage.com:123
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx...
KV_REST_API_READ_ONLY_TOKEN=xxx...

# ============================================
# MONITORING & ERROR TRACKING (Optional)
# ============================================
# Sentry - https://sentry.io/settings/[org]/projects/[project]/keys/
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=rocqet
SENTRY_AUTH_TOKEN=xxx...

# Vercel Analytics (auto-configured on Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=xxx

# ============================================
# EMAIL SERVICE (Required for auth)
# ============================================
# Resend - https://resend.com/api-keys
RESEND_API_KEY=re_...

# OR SendGrid - https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG...

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Production: https://rocqet.ai
NEXT_PUBLIC_APP_NAME=ROCQET
NEXT_PUBLIC_APP_DESCRIPTION=Enterprise AI Prompt Management

# ============================================
# FEATURE FLAGS (Optional)
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SENTRY=true
NEXT_PUBLIC_ENABLE_COLLABORATION=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=true

# ============================================
# DEVELOPMENT SETTINGS
# ============================================
NODE_ENV=development  # development | production | test
LOG_LEVEL=debug  # debug | info | warn | error
NEXT_TELEMETRY_DISABLED=1  # Disable Next.js telemetry

# ============================================
# SECURITY & COMPLIANCE (Production)
# ============================================
# Session encryption
SESSION_SECRET=random-32-character-string-here

# CORS origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://rocqet.ai

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000  # milliseconds

# ============================================
# SSO CONFIGURATION (Enterprise)
# ============================================
# SAML
SAML_ENTRY_POINT=https://idp.company.com/sso/saml
SAML_ISSUER=rocqet
SAML_CERT=MIIDxTCCAq2gAwIBAgIQ...

# OAuth (GitHub)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

---

## 🚀 Quick Setup Guide

### Step 1: Supabase Setup

1. **Create Project**
   ```bash
   # Go to https://app.supabase.com
   # Click "New Project"
   # Note down the project ID
   ```

2. **Get API Keys**
   - Navigate to Settings → API
   - Copy `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

3. **Get Database URL**
   - Navigate to Settings → Database
   - Copy connection string → `DATABASE_URL`
   - Enable connection pooling for serverless

### Step 2: Typesense Setup

1. **Create Cluster**
   ```bash
   # Go to https://cloud.typesense.org
   # Create new cluster (free tier available)
   ```

2. **Get Credentials**
   - Copy host → `TYPESENSE_HOST`
   - Create API key → `TYPESENSE_API_KEY`
   - Create search-only key → `TYPESENSE_SEARCH_ONLY_API_KEY`

### Step 3: AI Provider Setup

**Option A: OpenAI**
```bash
# Go to https://platform.openai.com/api-keys
# Create new key → OPENAI_API_KEY
```

**Option B: Anthropic**
```bash
# Go to https://console.anthropic.com
# Create API key → ANTHROPIC_API_KEY
```

### Step 4: Vercel Deployment (Optional)

1. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

2. **Add Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from .env.local

3. **Set up KV Storage**
   - Go to Storage → Create KV Database
   - Copy credentials to env vars

---

## 🔒 Security Best Practices

### Development
```env
# .env.local (git ignored)
DATABASE_URL=postgresql://postgres:password@localhost:5432/rocqet
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
# .env.staging
DATABASE_URL=${STAGING_DATABASE_URL}
NEXT_PUBLIC_APP_URL=https://staging.rocqet.ai
```

### Production
```env
# Use Vercel/platform environment variables
# Never commit production keys to git
# Rotate keys regularly
# Use different keys per environment
```

---

## 🧪 Testing Configuration

Create `.env.test` for testing:

```env
# Use separate test database
DATABASE_URL=postgresql://postgres:password@localhost:5432/rocqet_test

# Mock external services
MOCK_TYPESENSE=true
MOCK_OPENAI=true

# Disable rate limiting
RATE_LIMIT_REQUESTS=9999
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   ```
   Error: Can't reach database
   Solution: Check DATABASE_URL format and firewall rules
   ```

2. **Typesense Search Not Working**
   ```
   Error: Connection refused
   Solution: Verify TYPESENSE_HOST includes subdomain
   ```

3. **AI Features Disabled**
   ```
   Error: No AI provider configured
   Solution: Add at least one AI API key
   ```

### Validation Script

```typescript
// validate-env.ts
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'TYPESENSE_HOST',
  'TYPESENSE_API_KEY'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
}

console.log('✅ Environment configuration valid');
```

---

## 📦 Environment Variable Loading Order

1. `.env` - Default values (committed to git)
2. `.env.local` - Local overrides (git ignored)
3. `.env.production` - Production values
4. `.env.production.local` - Production overrides
5. Platform environment variables (highest priority)

---

## 🔄 Updating Environment Variables

### Local Development
```bash
# Edit .env.local
# Restart dev server
npm run dev
```

### Production (Vercel)
```bash
# Update in Vercel Dashboard
# Trigger redeployment
vercel --prod
```

### Docker
```bash
# Use docker-compose.yml
docker-compose --env-file .env.production up
```

---

## 🎯 Minimal Configuration

For MVP development, you only need:

```env
# Minimum required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

Everything else can be added incrementally.

---

**Remember: Never commit sensitive keys to git!**

🔐 **Keep your secrets secret!**