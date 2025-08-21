#!/bin/bash

# 🚀 ROCQET Automated Setup Script
# This script sets up the complete ROCQET development environment

set -e  # Exit on error

echo "
╔═══════════════════════════════════════════╗
║       🚀 ROCQET SETUP WIZARD 🚀          ║
║   Enterprise AI Prompt Management         ║
╚═══════════════════════════════════════════╝
"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ required. Current version: $(node -v)"
    fi
    log_info "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
    fi
    log_info "npm $(npm -v) detected"
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
    fi
    log_info "Git $(git --version) detected"
}

# Create project structure
create_project() {
    echo ""
    echo "🏗️  Creating Next.js 14 project..."
    
    # Check if we're in the right directory
    if [ ! -f "ROCQET/README.md" ]; then
        log_warn "Not in ROCQET parent directory. Creating new ROCQET project..."
        mkdir -p ROCQET
        cd ROCQET
    fi
    
    # Create Next.js app with specific version 14
    npx create-next-app@14.2.21 rocqet-app \
        --typescript \
        --tailwind \
        --app \
        --src-dir \
        --import-alias "@/*" \
        --no-git
    
    cd rocqet-app
    log_info "Next.js 14 project created"
}

# Install dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing dependencies..."
    
    # Core dependencies
    npm install \
        drizzle-orm \
        @supabase/supabase-js \
        @supabase/auth-helpers-nextjs \
        @tanstack/react-query \
        @tanstack/react-query-devtools \
        zod \
        date-fns \
        clsx \
        tailwind-merge
    
    # UI dependencies
    npm install \
        @radix-ui/react-dialog \
        @radix-ui/react-dropdown-menu \
        @radix-ui/react-select \
        @radix-ui/react-tabs \
        @radix-ui/react-toast \
        framer-motion \
        lucide-react
    
    # Development dependencies
    npm install -D \
        drizzle-kit \
        @types/node \
        @types/react \
        @types/react-dom \
        prettier \
        eslint-config-prettier \
        dotenv-cli
    
    log_info "All dependencies installed"
}

# Set up environment variables
setup_env() {
    echo ""
    echo "🔐 Setting up environment variables..."
    
    cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/rocqet

# Typesense Search
TYPESENSE_HOST=your_typesense_host
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your_typesense_api_key

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# Vercel KV (optional)
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
EOF

    log_info "Created .env.local template"
    log_warn "Please update .env.local with your actual keys"
}

# Set up Drizzle
setup_drizzle() {
    echo ""
    echo "🗄️  Setting up Drizzle ORM..."
    
    # Create drizzle config
    cat > drizzle.config.ts << 'EOF'
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
EOF

    # Create database schema directory
    mkdir -p src/lib/db
    
    # Copy schema from ROCQET docs
    cp ../../ROCQET/ARCHITECTURE/schema.ts src/lib/db/schema.ts 2>/dev/null || \
    cat > src/lib/db/schema.ts << 'EOF'
// This will be replaced with full schema from ROCQET/ARCHITECTURE/
import { pgTable, uuid, text, timestamp, integer, jsonb, vector } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // personal | team | enterprise
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
EOF

    log_info "Drizzle ORM configured"
}

# Set up project structure
setup_structure() {
    echo ""
    echo "📁 Creating project structure..."
    
    # Create directory structure
    mkdir -p src/{app,components,lib,hooks,utils,types}
    mkdir -p src/app/{api,auth,dashboard}
    mkdir -p src/components/{ui,features,layouts}
    mkdir -p src/lib/{db,api,auth}
    
    # Create base files
    cat > src/lib/db/index.ts << 'EOF'
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
EOF

    cat > src/lib/auth/index.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
EOF

    log_info "Project structure created"
}

# Create initial UI components
create_components() {
    echo ""
    echo "🎨 Creating UI components..."
    
    # Create cn utility
    cat > src/utils/cn.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

    # Create Button component
    cat > src/components/ui/Button.tsx << 'EOF'
import { cn } from '@/utils/cn';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'hover:bg-gray-100': variant === 'ghost',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
EOF

    log_info "UI components created"
}

# Set up Git
setup_git() {
    echo ""
    echo "🔀 Initializing Git repository..."
    
    git init
    
    # Create .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.production

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# Drizzle
drizzle/

# IDE
.vscode/
.idea/
EOF

    git add .
    git commit -m "🚀 Initial ROCQET setup"
    
    log_info "Git repository initialized"
}

# Create development scripts
create_scripts() {
    echo ""
    echo "📝 Creating development scripts..."
    
    # Update package.json scripts
    npm pkg set scripts.dev="next dev"
    npm pkg set scripts.build="next build"
    npm pkg set scripts.start="next start"
    npm pkg set scripts.lint="next lint"
    npm pkg set scripts.db:generate="drizzle-kit generate:pg"
    npm pkg set scripts.db:push="drizzle-kit push:pg"
    npm pkg set scripts.db:studio="drizzle-kit studio"
    npm pkg set scripts.db:migrate="drizzle-kit migrate"
    
    log_info "Development scripts created"
}

# Final setup
final_setup() {
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env.local with your Supabase credentials"
    echo "2. Create a Supabase project at https://supabase.com"
    echo "3. Run 'npm run db:push' to create database tables"
    echo "4. Run 'npm run dev' to start development server"
    echo ""
    echo "📚 Documentation:"
    echo "- Architecture: ROCQET/MASTER_PLAN.md"
    echo "- Features: ROCQET/FEATURES_SPECIFICATION.md"
    echo "- AI Guide: ROCQET/AI_SYSTEM/CONTEXT_PROTOCOL.md"
    echo ""
    echo "🚀 Happy building!"
}

# Main execution
main() {
    check_prerequisites
    create_project
    install_dependencies
    setup_env
    setup_drizzle
    setup_structure
    create_components
    setup_git
    create_scripts
    final_setup
}

# Run if not sourced
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi