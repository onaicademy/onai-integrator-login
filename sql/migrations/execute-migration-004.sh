#!/bin/bash

# Execute migration 004_create_integration_logs_table.sql
# Database: Landing BD (xikaiavwqinamgolmtcy)

set -e

SUPABASE_URL="https://xikaiavwqinamgolmtcy.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA"

echo "🚀 Starting migration 004_create_integration_logs_table..."
echo ""

# Read SQL file
SQL_FILE="$(dirname "$0")/004_create_integration_logs_table.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

echo "📄 SQL file found: $SQL_FILE"
echo ""

# Execute SQL using psql if available, otherwise use supabase CLI
if command -v psql &> /dev/null; then
  echo "🔧 Using psql to execute migration..."

  # Get database URL from Supabase (you'll need to get this from Supabase dashboard)
  # For now, we'll use the REST API approach

  echo "⚠️  psql found but connection string needed. Using alternative method..."
fi

# Try using npx supabase
if command -v npx &> /dev/null; then
  echo "🔧 Using Supabase CLI to execute migration..."
  echo ""

  # Link to project if not already linked
  npx supabase link --project-ref xikaiavwqinamgolmtcy 2>/dev/null || true

  # Execute migration
  npx supabase db push --db-url "postgresql://postgres.[PROJECT-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

  echo ""
  echo "✅ Migration executed via Supabase CLI"
else
  echo "⚠️  Supabase CLI not available"
  echo ""
  echo "Please execute the migration manually:"
  echo "1. Go to https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor"
  echo "2. Open SQL Editor"
  echo "3. Copy and paste the contents of: $SQL_FILE"
  echo "4. Click 'Run'"
  echo ""
  echo "Or install Supabase CLI: npm install -g supabase"
fi

echo ""
echo "📋 Next steps:"
echo "1. Verify table exists: SELECT COUNT(*) FROM integration_logs;"
echo "2. Test views: SELECT * FROM integration_stats_hourly LIMIT 5;"
echo "3. Test cleanup function: SELECT cleanup_old_integration_logs();"
echo ""
