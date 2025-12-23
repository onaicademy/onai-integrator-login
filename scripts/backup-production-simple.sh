#!/bin/bash
# ============================================
# Simple Production Backup via Supabase MCP
# Created: 2025-12-23
# ============================================

set -e

BACKUP_DIR="/Users/miso/onai-integrator-login/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔒 Creating production backup..."
echo "📁 Directory: $BACKUP_DIR"
echo "⏰ Timestamp: $TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# ============================================
# LANDING DB - landing_leads (692 records!)
# ============================================
echo ""
echo "📊 Exporting landing_leads (692 records)..."

# Use Supabase MCP tool to export data
cat > "$BACKUP_DIR/backup_commands_${TIMESTAMP}.sql" << 'EOF'
-- PRODUCTION BACKUP: Landing DB
-- Date: 2025-12-23
-- Critical: 692 leads in landing_leads table

-- Export landing_leads
COPY (
  SELECT * FROM landing_leads
  ORDER BY created_at ASC
) TO STDOUT WITH CSV HEADER;
EOF

echo "✅ Backup SQL commands created"
echo "📝 File: $BACKUP_DIR/backup_commands_${TIMESTAMP}.sql"

echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "Run this in Supabase SQL Editor:"
echo ""
echo "-- 1. Go to: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql"
echo "-- 2. Run: SELECT * FROM landing_leads ORDER BY created_at;"
echo "-- 3. Click 'Download as CSV' button"
echo "-- 4. Save as: $BACKUP_DIR/landing_leads_${TIMESTAMP}.csv"
echo ""
echo "-- Или через curl (нужен API key):"
echo "curl 'https://xikaiavwqinamgolmtcy.supabase.co/rest/v1/landing_leads?select=*&order=created_at.asc' \\"
echo "  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \\"
echo "  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \\"
echo "  > $BACKUP_DIR/landing_leads_${TIMESTAMP}.json"

echo ""
echo "💡 Or use Supabase CLI backup:"
echo "npx supabase db dump --linked > $BACKUP_DIR/landing_db_full_${TIMESTAMP}.sql"

echo ""
echo "✅ Backup prepared. Follow manual steps above."
