#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      System Health Check & Testing        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

SUCCESS=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -e "${YELLOW}Testing: $name${NC}"
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected, got $response)"
        ((FAILED++))
    fi
    echo ""
}

# Function to test JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    
    echo -e "${YELLOW}Testing: $name${NC}"
    response=$(curl -s "$url")
    
    if [ -n "$response" ] && echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "$response" | jq -r '.message // .status // "Response OK"' | sed 's/^/  /'
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAILED${NC} (Invalid or empty JSON response)"
        ((FAILED++))
    fi
    echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠ jq not found. Installing basic JSON parsing...${NC}"
    echo -e "${YELLOW}For better output, install jq: brew install jq (macOS) or apt install jq (Linux)${NC}"
    echo ""
fi

echo -e "${BLUE}=== Docker Containers ===${NC}"
echo ""

# Check Docker containers
if docker ps --format "{{.Names}}" | grep -q "edge-device"; then
    CONTAINER_COUNT=$(docker ps --format "{{.Names}}" | grep "edge-device" | wc -l)
    echo -e "${GREEN}✓ Docker containers running: $CONTAINER_COUNT${NC}"
    docker ps --filter "name=edge-device" --format "  - {{.Names}} ({{.Status}})"
    ((SUCCESS++))
else
    echo -e "${RED}✗ No Docker containers found${NC}"
    echo -e "${YELLOW}  Run: docker-compose up -d${NC}"
    ((FAILED++))
fi
echo ""

# Test SSH connection to container
echo -e "${YELLOW}Testing SSH connection to edge-device...${NC}"
if timeout 5 ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 root@localhost -p 2222 "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo -e "${YELLOW}  Try: ssh root@localhost -p 2222 (password: toor)${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}=== Backend API Tests ===${NC}"
echo ""

# Test health endpoint
test_json_endpoint "Health Check" "http://localhost:8000/api/health"

# Test devices list
test_json_endpoint "List Devices" "http://localhost:8000/api/devices"

# Test device details
test_json_endpoint "Get Device #1" "http://localhost:8000/api/devices/1"

# Test device metrics
test_json_endpoint "Get Device #1 Metrics" "http://localhost:8000/api/devices/1/metrics"

# Test device logs
test_json_endpoint "Get Device #1 Logs" "http://localhost:8000/api/devices/1/logs"

echo -e "${BLUE}=== WebSocket Server ===${NC}"
echo ""

# Check if WebSocket port is open
if nc -z localhost 3001 2>/dev/null; then
    echo -e "${GREEN}✓ WebSocket server is running on port 3001${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ WebSocket server not responding on port 3001${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}=== Frontend Server ===${NC}"
echo ""

# Check if frontend is running
if nc -z localhost 3000 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend server is running on port 3000${NC}"
    ((SUCCESS++))
    
    # Test if frontend serves content
    if curl -s http://localhost:3000 | grep -q "Secure Edge Device Manager"; then
        echo -e "${GREEN}✓ Frontend content is being served${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠ Frontend is running but content check failed${NC}"
    fi
else
    echo -e "${RED}✗ Frontend server not responding on port 3000${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}=== Detailed Metrics Sample ===${NC}"
echo ""

# Get and display sample metrics
if command -v jq &> /dev/null; then
    echo -e "${YELLOW}Sample Device Metrics:${NC}"
    metrics=$(curl -s http://localhost:8000/api/devices/1/metrics)
    
    if [ -n "$metrics" ]; then
        echo "$metrics" | jq -r '
            if .data then
                "  Status: " + (.data.status.online | if . then "🟢 Online" else "🔴 Offline" end) + "\n" +
                "  CPU Usage: " + (.data.cpu.usedPercent // "N/A") + "\n" +
                "  Memory Usage: " + (.data.memory.usedPercent // "N/A") + "\n" +
                "  Load Average: " + (.data.cpu.loadAverage."1min" // "N/A") + "\n" +
                "  Disk Usage: " + (.data.disk.filesystems[0].usedPercent // "N/A")
            else
                "  Unable to fetch metrics"
            end
        '
    fi
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Test Summary                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Passed: $SUCCESS${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is healthy.${NC}"
    echo ""
    echo -e "${BLUE}Access your dashboard at: http://localhost:3000${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please check the output above.${NC}"
    echo ""
    echo -e "${YELLOW}Common fixes:${NC}"
    echo -e "  1. Start Docker: ${BLUE}docker-compose up -d${NC}"
    echo -e "  2. Start backend: ${BLUE}cd backend && npm run dev${NC}"
    echo -e "  3. Start frontend: ${BLUE}cd frontend && npm run dev${NC}"
    echo -e "  4. Or use: ${BLUE}./start-all.sh${NC}"
    exit 1
fi

