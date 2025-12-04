#!/bin/bash

# Verification script for auth setup
echo "🔍 Verifying Authentication Setup..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    echo "   Create one from .env.example"
    exit 1
fi

echo "✅ .env.local exists"

# Check required environment variables
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env.local | cut -d '=' -f2)

    if [ -z "$var_value" ] || [ "$var_value" = "your-"* ] || [ "$var_value" = "pk_test"* ] || [ "$var_value" = "sk_test"* ]; then
        echo "❌ $var_name not set or using placeholder value"
        return 1
    else
        echo "✅ $var_name is set"
        return 0
    fi
}

echo ""
echo "Checking Supabase variables..."
check_env_var "NEXT_PUBLIC_SUPABASE_URL"
check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "Checking Clerk variables..."
check_env_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_env_var "CLERK_SECRET_KEY"

echo ""
echo "Checking required files..."

# Check migration file exists
if [ -f "apps/backend/supabase/migrations/000_complete_schema.sql" ]; then
    echo "✅ Migration file exists"
else
    echo "❌ Migration file not found"
fi

# Check API routes exist
if [ -f "apps/dashboard/app/api/institutions/route.ts" ]; then
    echo "✅ Institution API routes exist"
else
    echo "❌ Institution API routes not found"
fi

# Check webhook endpoint exists
if [ -f "apps/dashboard/app/api/webhooks/clerk/route.ts" ]; then
    echo "✅ Clerk webhook endpoint exists"
else
    echo "❌ Clerk webhook endpoint not found"
fi

# Check Supabase client utilities exist
if [ -f "apps/dashboard/lib/supabase/client.ts" ]; then
    echo "✅ Supabase client utilities exist"
else
    echo "❌ Supabase client utilities not found"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Apply migration in Supabase Dashboard (see QUICK_START.md)"
echo "2. Run: pnpm dev"
echo "3. Open: http://localhost:3000"
echo "4. Click 'Get Started' to test registration"
echo ""
