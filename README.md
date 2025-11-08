# Secure Edge Device Manager

A lightweight web platform to remotely monitor and manage simulated edge devices over SSH. Track real-time system metrics, online/offline health, network speeds, error logs, and enable live SSH sessions — all in one secure dashboard.

## 🚀 Features

- **Real-time Device Monitoring**: Track CPU, memory, disk usage, and network stats
- **Live SSH Terminal**: Interactive terminal access to your edge devices
- **System Logs**: View and analyze system logs in real-time
- **Process Monitoring**: See top running processes with resource usage
- **Multiple Device Management**: Manage and monitor multiple edge devices
- **Beautiful Dashboard**: Modern, responsive UI with charts and metrics
- **No Authentication Required**: All APIs work without login (as requested)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Docker (for simulated edge devices)
- npm or yarn

## 🏗️ Project Structure

```
sim-device/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── pages/     # Dashboard, DeviceDetail, Terminal pages
│   │   └── components/
│   └── package.json
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── Dockerfile         # Simulated edge device
└── README.md
```

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

## 🎯 Usage

### Access the Dashboard

1. Open your browser and go to http://localhost:3000
2. You'll see the main dashboard with your edge devices
3. Click **"View Details"** to see detailed metrics, charts, and logs
4. Click **"SSH Terminal"** to open an interactive terminal session

### Device Management

The default device configuration:
- **Name**: Edge Device 1
- **Host**: localhost
- **Port**: 2222
- **Username**: root
- **Password**: toor

### Adding More Devices

You can add more devices via API:

```bash
curl -X POST http://localhost:8000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Edge Device 2",
    "host": "localhost",
    "port": 2223,
    "username": "root",
    "password": "toor",
    "description": "Secondary edge device"
  }'
```

Or run another Docker container:

```bash
docker run -d -p 2223:22 --name edge-device-2 edge-device
```

## 📡 API Endpoints

All endpoints are **unprotected** and work without authentication:

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Add new device
- `DELETE /api/devices/:id` - Remove device

### Metrics
- `GET /api/devices/:id/metrics` - Get real-time metrics
  - CPU usage (user, system, load average)
  - Memory usage (total, used, free, available)
  - Disk usage (filesystems, mount points)
  - Network statistics (RX/TX)
  - Top processes

### Logs
- `GET /api/devices/:id/logs` - Get system logs

### Health
- `GET /api/health` - API health check

## 🔌 WebSocket Terminal

The SSH terminal uses WebSocket for real-time communication:

**Connection**: `ws://localhost:3001`

**Message Types**:
```javascript
// Connect to device
{
  "type": "connect",
  "host": "localhost",
  "port": 2222,
  "username": "root",
  "password": "toor"
}

// Send input
{
  "type": "input",
  "data": "ls -la\n"
}

// Resize terminal
{
  "type": "resize",
  "rows": 24,
  "cols": 80
}
```

## 🎨 Features Showcase

### Dashboard
- Total devices count
- Online/offline status
- Average CPU usage across all devices
- Device cards with real-time metrics

### Device Details
- Real-time CPU & Memory charts
- Detailed metrics breakdown
- Disk usage with progress bars
- Top processes table
- System logs viewer

### SSH Terminal
- Full interactive terminal
- Color-coded output
- Auto-resizing
- Real-time command execution

## 🛠️ Technologies Used

### Frontend
- React 18
- Vite
- React Router
- Recharts (for graphs)
- XTerm.js (for terminal)
- Lucide React (icons)
- Axios

### Backend
- Node.js
- Express
- SSH2 (SSH client)
- WebSocket (ws)
- CORS

### DevOps
- Docker
- Alpine Linux
- OpenSSH Server

## 🔒 Security Notes

⚠️ **Important**: This setup is for **development and testing only**:

- APIs are unprotected (no authentication required)
- SSH credentials are hardcoded
- Default passwords are used
- Not suitable for production use

For production:
1. Add proper authentication and authorization
2. Use SSH keys instead of passwords
3. Implement rate limiting
4. Add input validation and sanitization
5. Use environment variables for sensitive data
6. Enable HTTPS/WSS

## 🐛 Troubleshooting

### Docker container not starting
```bash
# Check container status
docker ps -a

# View container logs
docker logs edge-device-1

# Restart container
docker restart edge-device-1
```

### SSH connection fails
```bash
# Test SSH manually
ssh root@localhost -p 2222

# Check if port is open
nc -zv localhost 2222
```

### Backend errors
```bash
# Check backend logs
cd backend
npm run dev

# Verify dependencies
npm install
```

### Frontend not loading
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📝 Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload with nodemon
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend (no build needed, runs directly)
cd backend
npm start
```

## 🤝 Contributing

Feel free to:
- Add more device metrics
- Improve the UI/UX
- Add authentication features
- Implement persistent storage (MongoDB)
- Add device grouping and tagging
- Create alerts and notifications

## 📄 License

MIT License - feel free to use this project for learning and development purposes.

## 🎓 Learning Resources

- [SSH2 Documentation](https://github.com/mscdex/ssh2)
- [XTerm.js Guide](https://xtermjs.org/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Docker SSH Setup](https://docs.docker.com/engine/reference/builder/)

---

Built with ❤️ for edge computing enthusiasts!
