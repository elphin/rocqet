# 📁 ROCQET Project Structure

## Complete Directory Organization

```
rocqet/
├── src/                      # All source code
│   ├── app/                  # Next.js 14 App Router
│   │   ├── (auth)/          # Auth group route
│   │   │   ├── signin/
│   │   │   ├── signup/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/     # Dashboard group
│   │   │   ├── layout.tsx   # Dashboard layout
│   │   │   ├── page.tsx     # Dashboard home
│   │   │   ├── prompts/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   └── new/
│   │   │   ├── templates/
│   │   │   ├── team/
│   │   │   ├── settings/
│   │   │   └── analytics/
│   │   ├── api/             # API routes
│   │   │   ├── auth/
│   │   │   ├── prompts/
│   │   │   ├── workspaces/
│   │   │   ├── search/
│   │   │   └── webhooks/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Landing page
│   │   ├── globals.css      # Global styles
│   │   └── providers.tsx    # App providers
│   │
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── index.ts
│   │   ├── features/       # Feature components
│   │   │   ├── prompts/
│   │   │   │   ├── PromptList.tsx
│   │   │   │   ├── PromptEditor.tsx
│   │   │   │   ├── PromptCard.tsx
│   │   │   │   ├── VersionHistory.tsx
│   │   │   │   └── CollaborationIndicator.tsx
│   │   │   ├── workspace/
│   │   │   │   ├── WorkspaceSwitcher.tsx
│   │   │   │   ├── WorkspaceSettings.tsx
│   │   │   │   └── MembersList.tsx
│   │   │   ├── search/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   └── SearchFilters.tsx
│   │   │   └── ai/
│   │   │       ├── PromptImprover.tsx
│   │   │       ├── VariableDetector.tsx
│   │   │       └── CostTracker.tsx
│   │   └── layouts/        # Layout components
│   │       ├── AppShell.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── lib/                # Core libraries
│   │   ├── db/            # Database
│   │   │   ├── schema.ts  # Drizzle schema
│   │   │   ├── index.ts   # DB client
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── auth/          # Authentication
│   │   │   ├── index.ts   # Supabase client
│   │   │   ├── middleware.ts
│   │   │   ├── hooks.ts
│   │   │   └── utils.ts
│   │   ├── api/           # API utilities
│   │   │   ├── client.ts  # API client
│   │   │   ├── errors.ts
│   │   │   └── types.ts
│   │   ├── search/        # Search integration
│   │   │   ├── typesense.ts
│   │   │   ├── embeddings.ts
│   │   │   └── index.ts
│   │   ├── realtime/      # Real-time features
│   │   │   ├── collaboration.ts
│   │   │   ├── presence.ts
│   │   │   └── sync.ts
│   │   └── ai/            # AI integrations
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── providers.ts
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWorkspace.ts
│   │   ├── usePrompts.ts
│   │   ├── useRealtime.ts
│   │   ├── useSearch.ts
│   │   └── useDebounce.ts
│   │
│   ├── utils/             # Utility functions
│   │   ├── cn.ts         # Class names
│   │   ├── format.ts     # Formatters
│   │   ├── validators.ts # Zod schemas
│   │   ├── constants.ts
│   │   └── helpers.ts
│   │
│   ├── types/             # TypeScript types
│   │   ├── database.ts   # DB types
│   │   ├── api.ts        # API types
│   │   ├── ui.ts         # UI types
│   │   └── global.d.ts   # Global types
│   │
│   └── middleware.ts      # Next.js middleware
│
├── public/                # Static assets
│   ├── images/
│   ├── fonts/
│   └── manifest.json
│
├── drizzle/              # Drizzle migrations
│   ├── meta/
│   └── migrations/
│
├── tests/                # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/              # Build/deploy scripts
│   ├── setup.ts
│   ├── seed.ts
│   └── migrate.ts
│
├── docs/                 # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .github/              # GitHub configuration
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
│
├── Configuration Files
├── .env.local           # Local environment
├── .env.example         # Example env file
├── .eslintrc.json       # ESLint config
├── .gitignore           # Git ignore
├── .prettierrc          # Prettier config
├── docker-compose.yml   # Docker setup
├── drizzle.config.ts    # Drizzle config
├── next.config.js       # Next.js config
├── package.json         # Dependencies
├── postcss.config.js    # PostCSS config
├── tailwind.config.ts   # Tailwind config
├── tsconfig.json        # TypeScript config
└── vercel.json          # Vercel config
```

---

## 📦 Key Files Explained

### App Router Structure

```typescript
// app/layout.tsx - Root layout
export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

// app/(dashboard)/layout.tsx - Dashboard layout
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <Sidebar />
      <main>{children}</main>
    </AppShell>
  )
}
```

### Database Schema

```typescript
// lib/db/schema.ts
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  // ...
});

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  // ...
});
```

### Server Actions

```typescript
// app/actions/prompts.ts
'use server';

export async function createPrompt(data: CreatePromptInput) {
  const user = await requireAuth();
  const workspace = await getWorkspace();
  
  const prompt = await db.insert(prompts).values({
    ...data,
    workspaceId: workspace.id,
    createdBy: user.id
  });
  
  revalidatePath('/dashboard/prompts');
  return prompt;
}
```

### API Routes

```typescript
// app/api/prompts/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace');
  
  const results = await db
    .select()
    .from(prompts)
    .where(eq(prompts.workspaceId, workspaceId));
  
  return Response.json(results);
}
```

---

## 🎨 Component Organization

### UI Components (Atomic)
```
components/ui/
├── Button.tsx       # Base button component
├── Card.tsx         # Card container
├── Dialog.tsx       # Modal dialog
├── Input.tsx        # Form input
└── index.ts         # Barrel export
```

### Feature Components (Molecular)
```
components/features/prompts/
├── PromptList.tsx   # List of prompts
├── PromptEditor.tsx # Editor with collaboration
├── PromptCard.tsx   # Single prompt card
└── index.ts         # Exports
```

### Layout Components (Organisms)
```
components/layouts/
├── AppShell.tsx     # Main app layout
├── Sidebar.tsx      # Navigation sidebar
└── Header.tsx       # Top header
```

---

## 🔧 Configuration Files

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
```

### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          // ... brand colors
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "ES2022"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 📝 Naming Conventions

### Files
- **Components**: PascalCase (`PromptEditor.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: camelCase (`types/database.ts`)
- **Styles**: kebab-case (`prompt-editor.module.css`)

### Exports
- **Default exports**: For pages and layouts
- **Named exports**: For components and utilities
- **Barrel exports**: Use index.ts for clean imports

### Variables
- **Components**: PascalCase (`PromptList`)
- **Functions**: camelCase (`createPrompt`)
- **Constants**: UPPER_SNAKE (`MAX_PROMPT_LENGTH`)
- **Types/Interfaces**: PascalCase (`PromptData`)

---

## 🚀 Import Aliases

Use these aliases for clean imports:

```typescript
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { createPrompt } from '@/app/actions/prompts';
import { db } from '@/lib/db';
import type { Prompt } from '@/types/database';
```

---

## 📦 Module Boundaries

### Clean Architecture Layers

1. **Presentation Layer** (`app/`, `components/`)
   - UI components
   - Pages and layouts
   - User interactions

2. **Application Layer** (`hooks/`, `app/actions/`)
   - Business logic
   - Use cases
   - Server actions

3. **Domain Layer** (`types/`, `utils/validators`)
   - Business entities
   - Domain logic
   - Validation rules

4. **Infrastructure Layer** (`lib/`)
   - External services
   - Database access
   - Third-party integrations

---

## 🔄 Data Flow

```
User Action → Component → Hook → Server Action → Database
     ↑                                              ↓
     └──────────── Revalidation ←──────────────────┘
```

---

**Follow this structure for consistency and maintainability!**

🏗️ **A well-organized codebase is a happy codebase!**