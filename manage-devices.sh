#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000/api/devices"

show_menu() {
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        Device Management Menu              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo "1. List all devices"
    echo "2. View device details"
    echo "3. Get device metrics"
    echo "4. View device logs"
    echo "5. Add new device"
    echo "6. Remove device"
    echo "7. Test SSH connection"
    echo "8. Start new Docker device"
    echo "9. Exit"
    echo ""
    echo -n "Select an option (1-9): "
}

list_devices() {
    echo -e "${YELLOW}Fetching devices...${NC}"
    echo ""
    
    response=$(curl -s "$API_URL")
    
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.data[] | "ID: \(.id)\nName: \(.name)\nHost: \(.host):\(.port)\nDescription: \(.description)\n---"'
    else
        echo "$response"
    fi
    echo ""
}

view_device() {
    echo -n "Enter device ID: "
    read device_id
    
    echo -e "${YELLOW}Fetching device details...${NC}"
    echo ""
    
    response=$(curl -s "$API_URL/$device_id")
    
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi
    echo ""
}

get_metrics() {
    echo -n "Enter device ID: "
    read device_id
    
    echo -e "${YELLOW}Fetching device metrics...${NC}"
    echo ""
    
    response=$(curl -s "$API_URL/$device_id/metrics")
    
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '
            if .data then
                "Status: " + (.data.status.online | if . then "🟢 ONLINE" else "🔴 OFFLINE" end) + "\n" +
                "Last Seen: " + (.data.status.lastSeen // "N/A") + "\n\n" +
                "=== CPU ===\n" +
                "Usage: " + (.data.cpu.usedPercent // "N/A") + "\n" +
                "User: " + (.data.cpu.userPercent // "N/A") + "\n" +
                "System: " + (.data.cpu.systemPercent // "N/A") + "\n" +
                "Load Avg (1m): " + (.data.cpu.loadAverage."1min" // "N/A") + "\n\n" +
                "=== Memory ===\n" +
                "Usage: " + (.data.memory.usedPercent // "N/A") + "\n" +
                "Total: " + (.data.memory.total // "N/A") + "\n" +
                "Used: " + (.data.memory.used // "N/A") + "\n" +
                "Free: " + (.data.memory.free // "N/A") + "\n\n" +
                "=== Disk ===\n" +
                (.data.disk.filesystems[]? | "  " + .filesystem + ": " + .usedPercent + " used (" + .used + " / " + .size + ")\n") +
                "\n=== Network ===\n" +
                (.data.network.interfaces[]? | "  " + .name + " - RX: " + .rx + ", TX: " + .tx + "\n") +
                "\n=== Top Processes ===\n" +
                (.data.cpu.processes[]? | "  PID " + .pid + " - " + .command + " (CPU: " + .cpu + ", MEM: " + .memory + ")\n")
            else
                "Unable to fetch metrics: " + .message
            end
        '
    else
        echo "$response"
    fi
    echo ""
}

view_logs() {
    echo -n "Enter device ID: "
    read device_id
    
    echo -n "Number of log lines to show (default 20): "
    read num_lines
    num_lines=${num_lines:-20}
    
    echo -e "${YELLOW}Fetching device logs...${NC}"
    echo ""
    
    response=$(curl -s "$API_URL/$device_id/logs")
    
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r ".data.logs[-$num_lines:][] | \"[\(.level | ascii_upcase)] \(.message)\""
    else
        echo "$response"
    fi
    echo ""
}

add_device() {
    echo -e "${YELLOW}Add New Device${NC}"
    echo ""
    
    echo -n "Device name: "
    read name
    
    echo -n "Host (e.g., localhost): "
    read host
    
    echo -n "Port (e.g., 2223): "
    read port
    
    echo -n "Username (default: root): "
    read username
    username=${username:-root}
    
    echo -n "Password (default: toor): "
    read -s password
    password=${password:-toor}
    echo ""
    
    echo -n "Description: "
    read description
    
    echo ""
    echo -e "${YELLOW}Adding device...${NC}"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"host\": \"$host\",
            \"port\": $port,
            \"username\": \"$username\",
            \"password\": \"$password\",
            \"description\": \"$description\"
        }")
    
    if command -v jq &> /dev/null; then
        if echo "$response" | jq -e '.success' > /dev/null; then
            echo -e "${GREEN}✓ Device added successfully!${NC}"
            echo "$response" | jq -r '.data | "ID: \(.id)\nName: \(.name)"'
        else
            echo -e "${RED}✗ Failed to add device${NC}"
            echo "$response" | jq -r '.message'
        fi
    else
        echo "$response"
    fi
    echo ""
}

remove_device() {
    echo -n "Enter device ID to remove: "
    read device_id
    
    echo -n "Are you sure? (y/N): "
    read confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo -e "${YELLOW}Removing device...${NC}"
        
        response=$(curl -s -X DELETE "$API_URL/$device_id")
        
        if command -v jq &> /dev/null; then
            if echo "$response" | jq -e '.success' > /dev/null; then
                echo -e "${GREEN}✓ Device removed successfully!${NC}"
            else
                echo -e "${RED}✗ Failed to remove device${NC}"
                echo "$response" | jq -r '.message'
            fi
        else
            echo "$response"
        fi
    else
        echo "Cancelled."
    fi
    echo ""
}

test_ssh() {
    echo -n "Enter device ID: "
    read device_id
    
    echo -e "${YELLOW}Fetching device details...${NC}"
    
    device=$(curl -s "$API_URL/$device_id")
    
    if command -v jq &> /dev/null; then
        host=$(echo "$device" | jq -r '.data.host')
        port=$(echo "$device" | jq -r '.data.port')
        username=$(echo "$device" | jq -r '.data.username')
        
        echo -e "${YELLOW}Testing SSH connection to $username@$host:$port...${NC}"
        echo ""
        
        ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$username@$host" -p "$port" "echo 'SSH connection successful!'; hostname; uptime"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓ SSH connection test passed${NC}"
        else
            echo ""
            echo -e "${RED}✗ SSH connection test failed${NC}"
        fi
    else
        echo "jq is required for this feature"
    fi
    echo ""
}

start_docker_device() {
    echo -e "${YELLOW}Start New Docker Device${NC}"
    echo ""
    
    # Find next available port
    next_port=2222
    while docker ps --format "{{.Ports}}" | grep -q "$next_port->22"; do
        ((next_port++))
    done
    
    echo "Next available port: $next_port"
    echo -n "Use this port? (Y/n): "
    read use_port
    
    if [ "$use_port" = "n" ] || [ "$use_port" = "N" ]; then
        echo -n "Enter custom port: "
        read next_port
    fi
    
    device_name="edge-device-$next_port"
    
    echo ""
    echo -e "${YELLOW}Starting Docker container...${NC}"
    
    docker run -d -p "$next_port:22" --name "$device_name" edge-device
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Docker container started: $device_name${NC}"
        echo ""
        echo "Container details:"
        echo "  Name: $device_name"
        echo "  Port: $next_port"
        echo "  SSH: ssh root@localhost -p $next_port"
        echo "  Password: toor"
        echo ""
        
        echo -n "Add this device to the system? (Y/n): "
        read add_to_system
        
        if [ "$add_to_system" != "n" ] && [ "$add_to_system" != "N" ]; then
            response=$(curl -s -X POST "$API_URL" \
                -H "Content-Type: application/json" \
                -d "{
                    \"name\": \"$device_name\",
                    \"host\": \"localhost\",
                    \"port\": $next_port,
                    \"username\": \"root\",
                    \"password\": \"toor\",
                    \"description\": \"Docker edge device on port $next_port\"
                }")
            
            echo -e "${GREEN}✓ Device added to system${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to start Docker container${NC}"
    fi
    echo ""
}

# Main loop
while true; do
    show_menu
    read choice
    echo ""
    
    case $choice in
        1) list_devices ;;
        2) view_device ;;
        3) get_metrics ;;
        4) view_logs ;;
        5) add_device ;;
        6) remove_device ;;
        7) test_ssh ;;
        8) start_docker_device ;;
        9)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            echo ""
            ;;
    esac
    
    echo -n "Press Enter to continue..."
    read
    clear
done

