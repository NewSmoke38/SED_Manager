# Secure Edge Device Manager

A lightweight web platform to remotely monitor and manage simulated edge devices over SSH. Track real-time system metrics, online/offline health, network speeds, error logs, and enable live SSH sessions — all in one secure dashboard.

# Architecture 

This project operates on two primary communication flows to provide both a stable web interface and a real-time, interactive terminal.

- **The API Flow (HTTP/REST):** This is the "manager" for the application. When you load the web page, the React frontend makes standard HTTP requests to the Express API (Port 8000). This flow is used for stateless tasks like user authentication, fetching device lists, or updating settings. It's a classic "request-response" model.

- **The Terminal Flow (WebSocket + SSH):** This is the "live translator" for the interactive terminal. This flow does not use the main Express API. Instead, the browser opens a persistent WebSocket connection to a specialized server (Port 3001). This server acts as a bridge: it "translates" the WebSocket messages from your browser into the SSH2 protocol, forwarding your keystrokes to the edge device and streaming the terminal output right back to your browser.

# Features

- **Real-time Device Monitoring**: Track CPU, memory, disk usage etc
- **Live SSH Terminal**: Interactive terminal access to your edge devices
- **Multiple Device Management**: Manage and monitor multiple edge devices
- **Beautiful Dashboard**: Modern, responsive UI with charts and metrics
- **Authentication Required**: All APIs work only with login

## 📋 Prerequisites

- Node.js (v16 or higher)
- Docker (for simulated edge devices)
- npm 


## 🔧 Setup Instructions

### 1. Start the Simulated Edge Device (Docker)

First, build and run the Docker container that simulates an edge device:

```bash
# Build the Docker image
docker build -t edge-device .

# Run the container (exposing SSH on port 2222)
docker run -d -p 2222:22 --name edge-device-1 edge-device

# Test SSH connection (password: toor)
ssh root@localhost -p 2222
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# The .env file should already exist, but you can modify it if needed
# Default ports: HTTP=8000, WebSocket=3001

# Start the backend server
npm run dev
```

The backend will start on:
- **HTTP API**: http://localhost:8000
- **WebSocket SSH**: ws://localhost:3001

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on: http://localhost:3000

