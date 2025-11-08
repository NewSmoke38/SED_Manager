# 🔐 Secure Edge Device Manager

A lightweight web platform to remotely monitor and manage simulated edge devices over SSH. Track real-time system metrics, online/offline health, network speeds, error logs, and enable live SSH sessions — all in one secure dashboard.

## 🌟 Features

- **📊 Real-time Monitoring**: View CPU, Memory, and Disk usage in real-time
- **📈 Interactive Charts**: Beautiful visualizations of system metrics over time
- **💻 Live SSH Terminal**: Full terminal access directly from your browser
- **📝 System Logs**: Monitor error logs and system events
- **🔄 Auto-refresh**: Metrics update automatically every 3-5 seconds
- **🎨 Modern UI**: Beautiful dark theme with responsive design
- **🐳 Docker-based**: Easy deployment with containerized edge devices

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  (Port 3000)
│   - Dashboard   │
│   - Charts      │
│   - Terminal    │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  Node.js API    │  (Port 3001)
│  - Express      │
│  - SSH2         │
│  - WebSocket    │
└────────┬────────┘
         │
         │ SSH (Port 2222)
         │
┌────────▼────────┐
│ Docker Container│
│  Alpine Linux   │
│  + SSH Server   │
└─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop
- Terminal/Command Line access

### 1. Start Your Simulated Edge Device

First, make sure your Docker container is running (you've already done this!):

```bash
docker ps
```

You should see your container `my-edge-device-1` running on port 2222.

### 2. Install Dependencies

Install all dependencies for both backend and frontend:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Configure Backend

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

The default configuration should work with your existing Docker container:

```env
PORT=3001
NODE_ENV=development

DEFAULT_SSH_HOST=localhost
DEFAULT_SSH_PORT=2222
DEFAULT_SSH_USER=root
DEFAULT_SSH_PASSWORD=toor
```

### 4. Start the Application

From the root directory, run:

```bash
# Start both backend and frontend
npm run dev
```

This will start:
- **Backend API** at `http://localhost:3001`
- **Frontend** at `http://localhost:3000`

### 5. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

You should see your edge device dashboard with real-time metrics!

## 📱 Usage

### Dashboard

The main dashboard shows:
- **Summary Cards**: Total devices, online/offline status, average CPU usage
- **Device Cards**: Individual device information with metrics
- **Quick Actions**: Access device details or open SSH terminal

### Device Details

Click "View Details" on any device to see:
- **Real-time Charts**: CPU and memory usage over time
- **System Information**: Detailed CPU, memory, and disk metrics
- **Top Processes**: Currently running processes
- **System Logs**: Recent system events and errors

### SSH Terminal

Click "SSH Terminal" to open a live terminal session:
- Full interactive terminal in your browser
- Execute commands directly on the edge device
- Real-time command output
- Use `exit` to close the SSH session

## 🐳 Adding More Devices

To add more simulated edge devices:

```bash
# Build the image if you haven't already
docker build -t sim-device .

# Run additional containers on different ports
docker run -d --name my-edge-device-2 -p 2223:22 sim-device:latest
docker run -d --name my-edge-device-3 -p 2224:22 sim-device:latest
```

Then add them through the API or modify `backend/routes/devices.js` to include them.

## 🛠️ Development

### Backend Structure

```
backend/
├── server.js              # Express server & WebSocket setup
├── routes/
│   └── devices.js         # API endpoints for devices
├── services/
│   ├── deviceService.js   # SSH commands & metric parsing
│   └── sshTerminal.js     # WebSocket SSH terminal handler
└── .env                   # Configuration
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.jsx            # Main app component & routing
│   ├── pages/
│   │   ├── Dashboard.jsx  # Device dashboard
│   │   ├── DeviceDetail.jsx  # Detailed metrics view
│   │   └── Terminal.jsx   # SSH terminal interface
│   └── index.css          # Global styles
└── vite.config.js         # Vite configuration
```

### API Endpoints

- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device info
- `GET /api/devices/:id/status` - Check if device is online
- `GET /api/devices/:id/metrics` - Get all metrics
- `GET /api/devices/:id/disk` - Get disk usage
- `GET /api/devices/:id/memory` - Get memory usage
- `GET /api/devices/:id/cpu` - Get CPU usage
- `GET /api/devices/:id/logs` - Get system logs
- `GET /api/devices/:id/network` - Get network stats
- `POST /api/devices` - Add new device

### WebSocket

- Connect to `ws://localhost:3001` for live SSH terminal
- Send `{"type": "connect", "host": "...", "port": 2222, ...}` to establish SSH
- Send `{"type": "input", "data": "command"}` to execute commands

## 🎨 Customization

### Change Theme Colors

Edit `frontend/src/index.css` to customize colors:

```css
:root {
  --primary: #3b82f6;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  /* ... */
}
```

### Add More Metrics

1. Add a new function in `backend/services/deviceService.js`
2. Create an API endpoint in `backend/routes/devices.js`
3. Fetch and display in the frontend

## 📦 Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd ../backend
NODE_ENV=production node server.js
```

The built frontend files will be in `frontend/dist/`.

## 🔒 Security Notes

**⚠️ This is a development/demo application!**

For production use, consider:
- Store SSH credentials securely (not in plain text)
- Use environment variables or a secrets manager
- Implement authentication for the web interface
- Use HTTPS/WSS for encrypted connections
- Validate and sanitize all inputs
- Implement rate limiting
- Use SSH keys instead of passwords

## 🐛 Troubleshooting

### Can't connect to device

- Ensure Docker container is running: `docker ps`
- Check SSH is accessible: `ssh root@localhost -p 2222`
- Verify credentials in `.env` file

### WebSocket connection fails

- Check backend is running on port 3001
- Ensure no firewall blocking WebSocket connections
- Check browser console for errors

### Metrics not updating

- Verify device is online
- Check network connectivity
- Look at backend logs for SSH errors

## 📝 License

MIT

## 🙏 Credits

Built with:
- [React](https://reactjs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend API
- [ssh2](https://github.com/mscdex/ssh2) - SSH client
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Recharts](https://recharts.org/) - Charts library
- [Lucide Icons](https://lucide.dev/) - Icon library

---

**Happy Monitoring! 🚀**


