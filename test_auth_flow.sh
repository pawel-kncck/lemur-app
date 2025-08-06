#!/bin/bash

# Test authentication flow
API_URL="http://localhost:8000"

echo "Testing Authentication Flow"
echo "==========================="

# Test health check
echo -e "\n1. Testing health check..."
curl -s "$API_URL/" | python -m json.tool

# Test registration
echo -e "\n2. Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}')

echo "$REGISTER_RESPONSE" | python -m json.tool

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get access token. Registration may have failed."
  exit 1
fi

echo -e "\nAccess token obtained: ${ACCESS_TOKEN:0:20}..."

# Test getting current user
echo -e "\n3. Testing get current user..."
curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python -m json.tool

# Test creating a project
echo -e "\n4. Testing project creation..."
curl -s -X POST "$API_URL/api/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project"}' | python -m json.tool

# Test listing projects
echo -e "\n5. Testing list projects..."
curl -s -X GET "$API_URL/api/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python -m json.tool

echo -e "\nAuthentication flow test completed!"