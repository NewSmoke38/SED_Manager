#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Secure Edge Device Manager - Startup    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found${NC}"

echo ""

# Start Docker containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker containers started${NC}"
else
    echo -e "${RED}✗ Failed to start Docker containers${NC}"
    exit 1
fi

# Wait for containers to be ready
echo -e "${YELLOW}Waiting for containers to be ready...${NC}"
sleep 3

# Check container status
RUNNING=$(docker ps --filter "name=edge-device" --format "{{.Names}}" | wc -l)
echo -e "${GREEN}✓ $RUNNING edge device(s) running${NC}"

echo ""

# Start Backend
echo -e "${YELLOW}Starting Backend Server...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Start backend in background
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait for backend to start
sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}  API: http://localhost:8000${NC}"
    echo -e "${BLUE}  WebSocket: ws://localhost:3001${NC}"
else
    echo -e "${RED}✗ Failed to start backend server${NC}"
    echo -e "${YELLOW}Check backend.log for errors${NC}"
    exit 1
fi

cd ..
echo ""

# Start Frontend
echo -e "${YELLOW}Starting Frontend Server...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid

# Wait for frontend to start
sleep 3

if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"
    echo -e "${BLUE}  Dashboard: http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Failed to start frontend server${NC}"
    echo -e "${YELLOW}Check frontend.log for errors${NC}"
    exit 1
fi

cd ..
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All Services Started! 🚀          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard:${NC}     http://localhost:3000"
echo -e "${BLUE}🔌 API:${NC}           http://localhost:8000/api/devices"
echo -e "${BLUE}🐳 Docker:${NC}        $RUNNING edge device(s) running"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  ./stop-all.sh"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  tail -f backend.log"
echo -e "  tail -f frontend.log"
echo ""
echo -e "${GREEN}Opening dashboard in browser...${NC}"

# Open browser (cross-platform)
if command_exists xdg-open; then
    xdg-open http://localhost:3000 2>/dev/null
elif command_exists open; then
    open http://localhost:3000 2>/dev/null
elif command_exists start; then
    start http://localhost:3000 2>/dev/null
fi

echo -e "${GREEN}✨ Enjoy monitoring your edge devices!${NC}"

