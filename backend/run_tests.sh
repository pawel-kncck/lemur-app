#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Installing test dependencies..."
pip install -r requirements.txt -r requirements-test.txt

echo -e "\n${GREEN}Running backend tests...${NC}"
pytest tests/ -v --cov=main --cov-report=term-missing

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All backend tests passed!${NC}"
else
    echo -e "\n${RED}Some backend tests failed!${NC}"
    exit 1
fi