#!/bin/bash
# ============================================
# Production Database Backup Script
# Created: 2025-12-23
# ============================================

set -e  # Exit on error

BACKUP_DIR="/Users/miso/onai-integrator-login/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔒 Starting production database backups..."
echo "📁 Backup directory: $BACKUP_DIR"
echo "⏰ Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ============================================
# LANDING DB Backup (КРИТИЧНО - содержит 692 лида!)
# ============================================
echo ""
echo "📊 Backing up LANDING DB (xikaiavwqinamgolmtcy)..."

# Export using Supabase CLI
cd /Users/miso/onai-integrator-login

# Backup landing_leads table (692 records)
npx supabase db dump --db-url "postgresql://postgres.xikaiavwqinamgolmtcy:${LANDING_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  --data-only \
  --table landing_leads \
  > "$BACKUP_DIR/landing_db_landing_leads_${TIMESTAMP}.sql"

echo "✅ landing_leads backed up ($(wc -l < "$BACKUP_DIR/landing_db_landing_leads_${TIMESTAMP}.sql") lines)"

# Backup express_course_sales
npx supabase db dump --db-url "postgresql://postgres.xikaiavwqinamgolmtcy:${LANDING_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  --data-only \
  --table express_course_sales \
  > "$BACKUP_DIR/landing_db_express_sales_${TIMESTAMP}.sql"

echo "✅ express_course_sales backed up"

# Backup main_product_sales
npx supabase db dump --db-url "postgresql://postgres.xikaiavwqinamgolmtcy:${LANDING_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  --data-only \
  --table main_product_sales \
  > "$BACKUP_DIR/landing_db_main_sales_${TIMESTAMP}.sql"

echo "✅ main_product_sales backed up"

# Full schema backup
npx supabase db dump --db-url "postgresql://postgres.xikaiavwqinamgolmtcy:${LANDING_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  > "$BACKUP_DIR/landing_db_schema_${TIMESTAMP}.sql"

echo "✅ Full schema backed up"

# ============================================
# TRAFFIC DB Backup
# ============================================
echo ""
echo "🎯 Backing up TRAFFIC DB (oetodaexnjcunklkdlkv)..."

npx supabase db dump --db-url "postgresql://postgres.oetodaexnjcunklkdlkv:${TRAFFIC_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  > "$BACKUP_DIR/traffic_db_full_${TIMESTAMP}.sql"

echo "✅ Traffic DB backed up"

# ============================================
# MAIN DB Backup (minimal)
# ============================================
echo ""
echo "🏠 Backing up MAIN DB (arqhkacellqbhjhbebfh)..."

npx supabase db dump --db-url "postgresql://postgres.arqhkacellqbhjhbebfh:${MAIN_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  --schema public \
  --data-only \
  --table users,lessons,certificates \
  > "$BACKUP_DIR/main_db_essential_${TIMESTAMP}.sql"

echo "✅ Main DB essential tables backed up"

# ============================================
# Summary
# ============================================
echo ""
echo "🎉 Backup complete!"
echo "📊 Backup summary:"
ls -lh "$BACKUP_DIR"/*_${TIMESTAMP}.sql | awk '{print "  - " $9 " (" $5 ")"}'

echo ""
echo "💾 Total backup size:"
du -sh "$BACKUP_DIR"

echo ""
echo "✅ All backups saved to: $BACKUP_DIR"
echo "🔐 Keep these backups safe before running migrations!"
