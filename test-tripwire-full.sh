#!/bin/bash

# ============================================
# TRIPWIRE FULL TESTING SCRIPT
# Автоматизированное тестирование Direct DB v2
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
API_URL="${API_URL:-http://localhost:8080}"
TOKEN="${TRIPWIRE_AUTH_TOKEN:-}"
MANAGER_UUID="${SALES_MANAGER_UUID:-}"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Error: TRIPWIRE_AUTH_TOKEN not set${NC}"
  echo "Set it: export TRIPWIRE_AUTH_TOKEN='your-token'"
  exit 1
fi

if [ -z "$MANAGER_UUID" ]; then
  echo -e "${RED}❌ Error: SALES_MANAGER_UUID not set${NC}"
  echo "Set it: export SALES_MANAGER_UUID='uuid-here'"
  exit 1
fi

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
function test_start() {
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  echo ""
  echo -e "${YELLOW}▶️  TEST $TESTS_TOTAL: $1${NC}"
}

function test_pass() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo -e "${GREEN}✅ PASSED${NC}"
}

function test_fail() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo -e "${RED}❌ FAILED: $1${NC}"
}

# ============================================
# TEST 1: CREATE STUDENT
# ============================================

test_start "Create Tripwire Student"

RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"test-$(date +%s)@example.com\",
    \"full_name\": \"Test Student\",
    \"password\": \"test123456\",
    \"granted_by\": \"$MANAGER_UUID\",
    \"manager_name\": \"Test Manager\"
  }")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  USER_ID=$(echo "$RESPONSE" | jq -r '.user_id')
  USER_EMAIL=$(echo "$RESPONSE" | jq -r '.email')
  echo "User created: $USER_ID"
  echo "Email: $USER_EMAIL"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Failed to create student"
  exit 1
fi

# ============================================
# TEST 2: VIDEO TRACKING (50%)
# ============================================

test_start "Update video tracking to 50%"

RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/lessons/67/video-tracking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"watched_segments\": [{\"start\": 0, \"end\": 300}],
    \"video_duration\": 600,
    \"current_position\": 300
  }")

if echo "$RESPONSE" | jq -e '.watch_percentage == 50' > /dev/null; then
  echo "Watch percentage: 50%"
  echo "Qualified: $(echo "$RESPONSE" | jq -r '.is_qualified')"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Wrong watch percentage"
fi

# ============================================
# TEST 3: VIDEO TRACKING (80%+)
# ============================================

test_start "Update video tracking to 80%+"

RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/lessons/67/video-tracking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"watched_segments\": [{\"start\": 0, \"end\": 500}],
    \"video_duration\": 600,
    \"current_position\": 500
  }")

WATCH_PCT=$(echo "$RESPONSE" | jq -r '.watch_percentage')
IS_QUALIFIED=$(echo "$RESPONSE" | jq -r '.is_qualified')

if [ "$IS_QUALIFIED" = "true" ] && [ "$WATCH_PCT" -ge 80 ]; then
  echo "Watch percentage: $WATCH_PCT%"
  echo "Qualified: $IS_QUALIFIED"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Not qualified for completion"
fi

# ============================================
# TEST 4: COMPLETE LESSON 67 (Module 16)
# ============================================

test_start "Complete Lesson 67 (Module 16)"

RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/lessons/67/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"module_id\": 16
  }")

MODULES_COMPLETED=$(echo "$RESPONSE" | jq -r '.modules_completed')
NEXT_UNLOCKED=$(echo "$RESPONSE" | jq -r '.next_module_unlocked')

if [ "$MODULES_COMPLETED" = "1" ] && [ "$NEXT_UNLOCKED" = "true" ]; then
  echo "Modules completed: $MODULES_COMPLETED"
  echo "Module 17 unlocked: $NEXT_UNLOCKED"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Module completion failed"
fi

# ============================================
# TEST 5: COMPLETE MODULE 17
# ============================================

test_start "Complete Module 17 (full flow)"

# Video tracking for Lesson 68
curl -s -X POST "$API_URL/api/tripwire/lessons/68/video-tracking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"watched_segments\": [{\"start\": 0, \"end\": 500}],
    \"video_duration\": 600,
    \"current_position\": 500
  }" > /dev/null

# Complete Lesson 68
RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/lessons/68/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"module_id\": 17
  }")

MODULES_COMPLETED=$(echo "$RESPONSE" | jq -r '.modules_completed')
NEXT_UNLOCKED=$(echo "$RESPONSE" | jq -r '.next_module_unlocked')

if [ "$MODULES_COMPLETED" = "2" ] && [ "$NEXT_UNLOCKED" = "true" ]; then
  echo "Modules completed: $MODULES_COMPLETED"
  echo "Module 18 unlocked: $NEXT_UNLOCKED"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Module 17 completion failed"
fi

# ============================================
# TEST 6: COMPLETE MODULE 18 + CERTIFICATE
# ============================================

test_start "Complete Module 18 + Certificate"

# Video tracking for Lesson 69
curl -s -X POST "$API_URL/api/tripwire/lessons/69/video-tracking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"watched_segments\": [{\"start\": 0, \"end\": 500}],
    \"video_duration\": 600,
    \"current_position\": 500
  }" > /dev/null

# Complete Lesson 69
RESPONSE=$(curl -s -X POST "$API_URL/api/tripwire/lessons/69/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"module_id\": 18
  }")

MODULES_COMPLETED=$(echo "$RESPONSE" | jq -r '.modules_completed')
CERT_ISSUED=$(echo "$RESPONSE" | jq -r '.certificate_issued')

if [ "$MODULES_COMPLETED" = "3" ] && [ "$CERT_ISSUED" = "true" ]; then
  echo "Modules completed: $MODULES_COMPLETED"
  echo "Certificate issued: $CERT_ISSUED"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Certificate not issued"
fi

# ============================================
# TEST 7: SALES STATS
# ============================================

test_start "Check Sales Manager Stats"

RESPONSE=$(curl -s "$API_URL/api/tripwire/sales/stats?managerId=$MANAGER_UUID" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_STUDENTS=$(echo "$RESPONSE" | jq -r '.total_students')

if [ "$TOTAL_STUDENTS" -gt 0 ]; then
  echo "Total students: $TOTAL_STUDENTS"
  echo "Completed: $(echo "$RESPONSE" | jq -r '.completed_students')"
  echo "Revenue: $(echo "$RESPONSE" | jq -r '.total_revenue')"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "No students in stats"
fi

# ============================================
# TEST 8: LEADERBOARD
# ============================================

test_start "Check Sales Leaderboard"

RESPONSE=$(curl -s "$API_URL/api/tripwire/sales/leaderboard?limit=10" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo "$RESPONSE" | jq '. | length')

if [ "$COUNT" -gt 0 ]; then
  echo "Managers in leaderboard: $COUNT"
  echo "Top manager: $(echo "$RESPONSE" | jq -r '.[0].manager_name')"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Empty leaderboard"
fi

# ============================================
# FINAL RESULTS
# ============================================

echo ""
echo "========================================"
echo "TESTING COMPLETE"
echo "========================================"
echo -e "Total tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo -e "${GREEN}🎉 Tripwire Direct DB v2 is working correctly!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo "Check the output above for details"
  exit 1
fi
