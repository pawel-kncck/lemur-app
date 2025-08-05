#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running All Tests for Lemur Application${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Track overall success
ALL_TESTS_PASSED=true

# Backend Tests
echo -e "${BLUE}1. Running Backend Tests...${NC}"
cd backend
if ./run_tests.sh; then
    echo -e "${GREEN}✓ Backend tests passed${NC}\n"
else
    echo -e "${RED}✗ Backend tests failed${NC}\n"
    ALL_TESTS_PASSED=false
fi
cd ..

# Frontend Tests
echo -e "${BLUE}2. Running Frontend Tests...${NC}"
cd frontend
echo "Installing dependencies..."
npm install --silent

echo "Running tests..."
if npm test -- --run; then
    echo -e "${GREEN}✓ Frontend tests passed${NC}\n"
else
    echo -e "${RED}✗ Frontend tests failed${NC}\n"
    ALL_TESTS_PASSED=false
fi

# Frontend Test Coverage
echo -e "${BLUE}3. Generating Frontend Test Coverage...${NC}"
npm test -- --run --coverage
cd ..

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$ALL_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please check the output above.${NC}"
    exit 1
fi