#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Secure Edge Device Manager - Shutdown   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Stop Backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    echo -e "${YELLOW}Stopping Backend Server (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null
    rm backend.pid
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}Backend PID file not found${NC}"
fi

# Stop Frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    echo -e "${YELLOW}Stopping Frontend Server (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID 2>/dev/null
    rm frontend.pid
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}Frontend PID file not found${NC}"
fi

# Stop Docker containers
echo -e "${YELLOW}Stopping Docker containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Docker containers stopped${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         All Services Stopped! 🛑           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Clean up log files
if [ -f backend.log ]; then
    echo -e "${YELLOW}Backend logs saved to: backend.log${NC}"
fi

if [ -f frontend.log ]; then
    echo -e "${YELLOW}Frontend logs saved to: frontend.log${NC}"
fi

echo ""
echo -e "${BLUE}To restart all services:${NC}"
echo -e "  ./start-all.sh"

