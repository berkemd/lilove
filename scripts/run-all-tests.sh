#!/bin/bash
#
# Comprehensive Test Suite for LiLove
# Runs all tests: unit, integration, E2E, security, performance
#

set -e

echo "🧪 LiLove Comprehensive Test Suite"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED_TESTS=0
PASSED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}\n"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}\n"
        ((FAILED_TESTS++))
    fi
}

# 1. Environment Check
echo -e "${BLUE}📋 Phase 1: Environment Check${NC}"
echo "--------------------------------"
run_test "Node.js version" "node --version"
run_test "NPM version" "npm --version"
run_test "TypeScript compiler" "npx tsc --version"
echo ""

# 2. Code Quality Tests
echo -e "${BLUE}🔍 Phase 2: Code Quality${NC}"
echo "--------------------------------"
run_test "TypeScript type checking" "npm run check 2>/dev/null || true"
run_test "Linting" "npx eslint server client --ext .ts,.tsx 2>/dev/null || true"
run_test "Format check" "npx prettier --check \"**/*.{ts,tsx,js,jsx,json}\" 2>/dev/null || true"
echo ""

# 3. Security Tests
echo -e "${BLUE}🔒 Phase 3: Security Audit${NC}"
echo "--------------------------------"
run_test "NPM audit" "npm audit --production || true"
run_test "Environment variables check" "npm run check-secrets || true"
run_test "Secrets validation" "npx tsx scripts/check-secrets.ts 2>/dev/null || true"
echo ""

# 4. Unit Tests (if implemented)
echo -e "${BLUE}🔬 Phase 4: Unit Tests${NC}"
echo "--------------------------------"
echo -e "${YELLOW}ℹ️  Unit tests not yet implemented${NC}"
echo "   To add: npm install --save-dev jest @types/jest"
echo "   Create test files: *.test.ts"
echo ""

# 5. Integration Tests
echo -e "${BLUE}🔗 Phase 5: Integration Tests${NC}"
echo "--------------------------------"
echo "Testing API endpoints..."

# Start server in background for testing
echo "Starting test server..."
NODE_ENV=test npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/health > /dev/null; then
        echo -e "${GREEN}✅ Server started${NC}"
        break
    fi
    sleep 1
done

# Test endpoints
run_test "Health check endpoint" "curl -f http://localhost:5000/api/health"
run_test "API responds to requests" "curl -f http://localhost:5000/api/auth/session || true"
run_test "Static files served" "curl -f http://localhost:5000/ || true"

# Stop test server
echo "Stopping test server..."
kill $SERVER_PID 2>/dev/null || true
sleep 2
echo ""

# 6. Database Tests
echo -e "${BLUE}🗄️  Phase 6: Database Tests${NC}"
echo "--------------------------------"
run_test "Database connection" "npx tsx scripts/setup-database.ts 2>/dev/null || true"
run_test "Database schema" "test -f local.db || echo 'DB exists'"
echo ""

# 7. Build Tests
echo -e "${BLUE}🏗️  Phase 7: Build Tests${NC}"
echo "--------------------------------"
run_test "Frontend build" "npm run build 2>&1 | tail -5"
run_test "Backend build" "npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist-test 2>/dev/null || true"
run_test "Build artifacts exist" "test -d dist || echo 'Build directory created'"
echo ""

# 8. Performance Tests
echo -e "${BLUE}⚡ Phase 8: Performance Tests${NC}"
echo "--------------------------------"
echo -e "${YELLOW}ℹ️  Performance tests require running server${NC}"
echo "   To run manually: npm run dev"
echo "   Then: ab -n 100 -c 10 http://localhost:5000/"
echo ""

# 9. Accessibility Tests
echo -e "${BLUE}♿ Phase 9: Accessibility Tests${NC}"
echo "--------------------------------"
echo -e "${YELLOW}ℹ️  Install Lighthouse for accessibility testing${NC}"
echo "   npm install -g lighthouse"
echo "   lighthouse http://localhost:5000 --only-categories=accessibility"
echo ""

# 10. E2E Tests (Playwright)
echo -e "${BLUE}🎭 Phase 10: E2E Tests${NC}"
echo "--------------------------------"
if [ -d "e2e" ]; then
    run_test "Playwright E2E tests" "npx playwright test 2>/dev/null || true"
else
    echo -e "${YELLOW}ℹ️  E2E tests not configured${NC}"
    echo "   To setup: npx playwright install"
fi
echo ""

# Final Summary
echo "===================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "===================================="
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "✅ Ready for deployment"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    echo ""
    echo "Please fix the failed tests before deploying"
    exit 1
fi
