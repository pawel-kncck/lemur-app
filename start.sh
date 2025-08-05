#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🦫 Starting Lemur Application...${NC}\n"

# Check if .env file exists for backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: backend/.env file not found!${NC}"
    echo -e "${YELLOW}Creating from .env.example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${RED}Please add your OPENAI_API_KEY to backend/.env before using the chat feature.${NC}\n"
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Port $1 is already in use!${NC}"
        echo "Please stop the process using port $1 and try again."
        return 1
    fi
    return 0
}

# Check if required ports are available
echo "Checking ports..."
if ! check_port 8000; then
    exit 1
fi
if ! check_port 5173; then
    exit 1
fi

echo -e "${GREEN}✓ Ports are available${NC}\n"

# Install dependencies if needed
echo "Checking dependencies..."

# Backend dependencies
if [ ! -d "backend/venv" ] && [ ! -f "backend/.deps_installed" ]; then
    echo "Installing backend dependencies..."
    cd backend
    pip install -r requirements.txt
    touch .deps_installed
    cd ..
fi

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✓ Dependencies ready${NC}\n"

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "Waiting for $name to start..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|000"; then
            echo -e "${GREEN}✓ $name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

# Function to open browser (cross-platform)
open_browser() {
    local url=$1
    echo -e "\n${BLUE}Opening browser at $url${NC}"
    
    if command -v xdg-open > /dev/null; then
        # Linux
        xdg-open "$url"
    elif command -v open > /dev/null; then
        # macOS
        open "$url"
    elif command -v start > /dev/null; then
        # Windows (Git Bash/WSL)
        start "$url"
    else
        echo -e "${YELLOW}Could not detect browser command. Please open $url manually.${NC}"
    fi
}

# Create a temp file for managing background processes
PIDFILE="/tmp/lemur-app-pids.txt"
> "$PIDFILE"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down Lemur...${NC}"
    
    # Read PIDs and kill processes
    if [ -f "$PIDFILE" ]; then
        while read pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
            fi
        done < "$PIDFILE"
        rm -f "$PIDFILE"
    fi
    
    echo -e "${GREEN}✓ Lemur stopped${NC}"
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
python main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PIDFILE"
cd ..

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev -- --host > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> "$PIDFILE"
cd ..

# Wait for servers to be ready
if wait_for_server "http://localhost:8000" "Backend"; then
    if wait_for_server "http://localhost:5173" "Frontend"; then
        # Both servers are ready, open browser
        open_browser "http://localhost:5173"
        
        echo -e "\n${GREEN}========================================${NC}"
        echo -e "${GREEN}✨ Lemur is running!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "\nFrontend: ${BLUE}http://localhost:5173${NC}"
        echo -e "Backend API: ${BLUE}http://localhost:8000${NC}"
        echo -e "API Docs: ${BLUE}http://localhost:8000/docs${NC}"
        echo -e "\n${YELLOW}Press Ctrl+C to stop all servers${NC}\n"
        
        # Show logs
        echo -e "${BLUE}Showing server logs (Press Ctrl+C to stop)...${NC}\n"
        tail -f backend.log frontend.log
    else
        echo -e "${RED}Frontend failed to start. Check frontend.log for details.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Backend failed to start. Check backend.log for details.${NC}"
    exit 1
fi