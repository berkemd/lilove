#!/bin/bash

# Test script to verify production routing fix
# This script tests that API routes return JSON and not HTML

echo "🧪 Testing Production Routing Fix"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL - change this to your deployment URL
BASE_URL="${1:-http://localhost:5000}"

echo "Testing against: $BASE_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_type=$2
    local description=$3
    
    echo -n "Testing $endpoint... "
    
    # Get content type with timeout
    content_type=$(curl -s -I --max-time 10 "$BASE_URL$endpoint" 2>/dev/null | grep -i "content-type" | head -1 | cut -d' ' -f2- | tr -d '\r')
    
    if [[ $content_type == *"$expected_type"* ]]; then
        echo -e "${GREEN}✓ PASS${NC} - Content-Type: $content_type"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} - Expected: $expected_type, Got: $content_type"
        return 1
    fi
}

# Track results
passed=0
failed=0

# Test API endpoints (should return JSON)
echo "Testing API Endpoints (should return JSON):"
echo "-------------------------------------------"

if test_endpoint "/healthz" "application/json" "Health check"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "/api/health" "application/json" "API health check"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "/api/pricing" "application/json" "Pricing endpoint"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "/api/auth/me" "application/json" "Auth endpoint"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "Testing SPA Routes (should return HTML):"
echo "-----------------------------------------"

if test_endpoint "/" "text/html" "Home page"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "/dashboard" "text/html" "Dashboard route"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "/goals" "text/html" "Goals route"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=================================="
echo "Test Results:"
echo "  Passed: $passed"
echo "  Failed: $failed"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
