#!/bin/bash

# 🧪 TRIPWIRE SERVICE LAYER DECOUPLING - VERIFICATION TESTS
# Run this script AFTER starting backend (npm run dev)

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"

# ================================================================
# USER CONFIGURATION - UPDATE THESE VALUES
# ================================================================

# Tripwire User (Amina)
TRIPWIRE_USER_ID="REPLACE_WITH_AMINA_USER_ID"  # UUID from Tripwire DB
TRIPWIRE_TOKEN="REPLACE_WITH_AMINA_JWT_TOKEN"  # JWT from browser

# Main Platform User (for comparison)
MAIN_USER_ID="REPLACE_WITH_MAIN_USER_ID"       # UUID from Main DB
MAIN_TOKEN="REPLACE_WITH_MAIN_JWT_TOKEN"       # JWT from browser

# ================================================================
# HELPER FUNCTIONS
# ================================================================

print_test() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

test_endpoint() {
    local name=$1
    local url=$2
    local token=$3
    local expected_status=${4:-200}
    
    echo -e "\n📡 Testing: ${name}"
    echo "   URL: ${url}"
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${url}" \
        -H "Authorization: Bearer ${token}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        print_success "Status: ${http_code} (Expected: ${expected_status})"
        echo "   Response: ${body}" | head -n 5
        return 0
    else
        print_error "Status: ${http_code} (Expected: ${expected_status})"
        echo "   Response: ${body}"
        return 1
    fi
}

# ================================================================
# PRE-FLIGHT CHECKS
# ================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🚀 TRIPWIRE DECOUPLING VERIFICATION${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"

# Check if backend is running
echo -e "\n🔍 Checking if backend is running..."
if curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
    print_success "Backend is running on ${BASE_URL}"
else
    print_error "Backend is NOT running. Start it with: npm run dev"
    exit 1
fi

# Check if tokens are configured
if [ "$TRIPWIRE_USER_ID" == "REPLACE_WITH_AMINA_USER_ID" ]; then
    print_error "Please configure TRIPWIRE_USER_ID in this script"
    exit 1
fi

if [ "$TRIPWIRE_TOKEN" == "REPLACE_WITH_AMINA_JWT_TOKEN" ]; then
    print_error "Please configure TRIPWIRE_TOKEN in this script"
    exit 1
fi

print_success "Configuration validated"

# ================================================================
# TRIPWIRE ENDPOINTS TESTS
# ================================================================

print_test "1. Tripwire Missions Endpoint"
test_endpoint \
    "GET /api/tripwire/missions/:userId" \
    "${BASE_URL}/api/tripwire/missions/${TRIPWIRE_USER_ID}" \
    "${TRIPWIRE_TOKEN}"

print_test "2. Tripwire Goals Endpoint"
test_endpoint \
    "GET /api/tripwire/goals/weekly/:userId" \
    "${BASE_URL}/api/tripwire/goals/weekly/${TRIPWIRE_USER_ID}" \
    "${TRIPWIRE_TOKEN}"

print_test "3. Tripwire Profile Endpoint"
test_endpoint \
    "GET /api/tripwire/users/:userId/profile" \
    "${BASE_URL}/api/tripwire/users/${TRIPWIRE_USER_ID}/profile" \
    "${TRIPWIRE_TOKEN}"

print_test "4. Tripwire Dashboard Endpoint"
test_endpoint \
    "GET /api/tripwire/analytics/student/:userId/dashboard" \
    "${BASE_URL}/api/tripwire/analytics/student/${TRIPWIRE_USER_ID}/dashboard" \
    "${TRIPWIRE_TOKEN}"

# ================================================================
# MAIN PLATFORM COMPARISON (OPTIONAL)
# ================================================================

if [ "$MAIN_USER_ID" != "REPLACE_WITH_MAIN_USER_ID" ]; then
    print_test "5. Main Platform Missions (Comparison)"
    test_endpoint \
        "GET /api/missions/:userId" \
        "${BASE_URL}/api/missions/${MAIN_USER_ID}" \
        "${MAIN_TOKEN}"
else
    echo -e "\n${YELLOW}⏭️  Skipping Main Platform tests (MAIN_USER_ID not configured)${NC}"
fi

# ================================================================
# SUMMARY
# ================================================================

echo -e "\n${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 TEST SUMMARY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"

echo -e "\n${GREEN}✅ PHASE 1 VERIFICATION COMPLETE${NC}"
echo -e "\nNext steps:"
echo -e "  1. Check backend logs for [Tripwire] prefix"
echo -e "  2. Verify data comes from Tripwire DB (pjmvxecykysfrzppdcto)"
echo -e "  3. Compare with Main Platform data (if configured)"
echo -e "  4. Proceed to Phase 2 (Edge Functions) & Phase 3 (Frontend)"

echo -e "\n${YELLOW}═══════════════════════════════════════════════${NC}"

