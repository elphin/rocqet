@echo off
REM 🚀 ROCQET Automated Setup Script for Windows
REM This script sets up the complete ROCQET development environment

echo.
echo ╔═══════════════════════════════════════════╗
echo ║       🚀 ROCQET SETUP WIZARD 🚀          ║
echo ║   Enterprise AI Prompt Management         ║
echo ╚═══════════════════════════════════════════╝
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% detected

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% detected

REM Check git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git is not installed
    pause
    exit /b 1
)
echo ✅ Git detected

echo.
echo 🏗️  Creating Next.js 14 project...

REM Create project with specific Next.js 14 version
call npx create-next-app@14.2.21 rocqet-app --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git

cd rocqet-app

echo.
echo 📦 Installing dependencies...

REM Install core dependencies
call npm install ^
    drizzle-orm ^
    @supabase/supabase-js ^
    @supabase/auth-helpers-nextjs ^
    @tanstack/react-query ^
    @tanstack/react-query-devtools ^
    zod ^
    date-fns ^
    clsx ^
    tailwind-merge

REM Install UI dependencies
call npm install ^
    @radix-ui/react-dialog ^
    @radix-ui/react-dropdown-menu ^
    @radix-ui/react-select ^
    @radix-ui/react-tabs ^
    @radix-ui/react-toast ^
    framer-motion ^
    lucide-react

REM Install dev dependencies
call npm install -D ^
    drizzle-kit ^
    @types/node ^
    @types/react ^
    @types/react-dom ^
    prettier ^
    eslint-config-prettier ^
    dotenv-cli

echo.
echo 🔐 Creating environment template...

REM Create .env.local
(
echo # Supabase Configuration
echo NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
echo.
echo # Database
echo DATABASE_URL=postgresql://postgres:password@localhost:5432/rocqet
echo.
echo # Typesense Search
echo TYPESENSE_HOST=your_typesense_host
echo TYPESENSE_PORT=443
echo TYPESENSE_PROTOCOL=https
echo TYPESENSE_API_KEY=your_typesense_api_key
echo.
echo # OpenAI
echo OPENAI_API_KEY=sk-...
echo.
echo # App Configuration
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
echo NODE_ENV=development
) > .env.local

echo ✅ Created .env.local template

echo.
echo 🗄️  Setting up Drizzle ORM...

REM Create drizzle config
(
echo import type { Config } from 'drizzle-kit';
echo import * as dotenv from 'dotenv';
echo.
echo dotenv.config({ path: '.env.local' });
echo.
echo export default {
echo   schema: './src/lib/db/schema.ts',
echo   out: './drizzle',
echo   driver: 'pg',
echo   dbCredentials: {
echo     connectionString: process.env.DATABASE_URL!,
echo   },
echo   verbose: true,
echo   strict: true,
echo } satisfies Config;
) > drizzle.config.ts

echo.
echo 📁 Creating project structure...

REM Create directories
mkdir src\app\api 2>nul
mkdir src\app\auth 2>nul
mkdir src\app\dashboard 2>nul
mkdir src\components\ui 2>nul
mkdir src\components\features 2>nul
mkdir src\components\layouts 2>nul
mkdir src\lib\db 2>nul
mkdir src\lib\api 2>nul
mkdir src\lib\auth 2>nul
mkdir src\hooks 2>nul
mkdir src\utils 2>nul
mkdir src\types 2>nul

echo ✅ Project structure created

echo.
echo 📝 Updating package.json scripts...

REM Update scripts
call npm pkg set scripts.dev="next dev"
call npm pkg set scripts.build="next build"
call npm pkg set scripts.start="next start"
call npm pkg set scripts.lint="next lint"
call npm pkg set scripts.db:generate="drizzle-kit generate:pg"
call npm pkg set scripts.db:push="drizzle-kit push:pg"
call npm pkg set scripts.db:studio="drizzle-kit studio"

echo.
echo 🔀 Initializing Git repository...

git init
git add .
git commit -m "🚀 Initial ROCQET setup"

echo.
echo ════════════════════════════════════════════
echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Update .env.local with your Supabase credentials
echo 2. Create a Supabase project at https://supabase.com
echo 3. Run 'npm run db:push' to create database tables
echo 4. Run 'npm run dev' to start development server
echo.
echo 📚 Documentation:
echo - Architecture: ROCQET\MASTER_PLAN.md
echo - Features: ROCQET\FEATURES_SPECIFICATION.md
echo - AI Guide: ROCQET\AI_SYSTEM\CONTEXT_PROTOCOL.md
echo.
echo 🚀 Happy building!
echo.
pause