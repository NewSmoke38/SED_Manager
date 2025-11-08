# System Architecture

This document explains the architecture and design of the Secure Edge Device Manager.

## 🏗️ High-Level Overview

```
┌─────────────────┐
│   Web Browser   │
│   (Port 3000)   │
└────────┬────────┘
         │
         │ HTTP/REST
         ├──────────────────┐
         │                  │
         │                  │ WebSocket
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  Frontend       │  │  WebSocket SSH   │
│  (React/Vite)   │  │  Server          │
│  Port 3000      │  │  Port 3001       │
└─────────────────┘  └────────┬─────────┘
         │                     │
         │ API Proxy           │ SSH2
         ▼                     │
┌─────────────────┐           │
│  Backend API    │           │
│  (Express)      │───────────┘
│  Port 8000      │    SSH2
└────────┬────────┘
         │
         │ SSH (Port 2222, 2223, ...)
         ▼
┌─────────────────────────────┐
│  Edge Devices (Docker)      │
│  - Alpine Linux + OpenSSH   │
│  - Running on ports         │
│    2222, 2223, etc.         │
└─────────────────────────────┘
```

## 📦 Components

### 1. Frontend (React + Vite)

**Location**: `frontend/`

**Purpose**: User interface for monitoring and managing edge devices

**Key Technologies**:
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **XTerm.js**: Terminal emulator for SSH
- **Recharts**: Real-time charts and graphs
- **Axios**: HTTP client
- **Lucide React**: Icons

**Key Pages**:
1. **Dashboard** (`pages/Dashboard.jsx`)
   - Overview of all devices
   - Summary metrics (total devices, online/offline counts, avg CPU)
   - Device cards with basic metrics
   - Quick actions (view details, open terminal)

2. **Device Detail** (`pages/DeviceDetail.jsx`)
   - Detailed metrics view
   - Real-time CPU/Memory charts
   - Disk usage visualizations
   - Process table
   - System logs viewer

3. **Terminal** (`pages/Terminal.jsx`)
   - Interactive SSH terminal
   - WebSocket-based communication
   - Full terminal emulation with xterm.js

**Data Flow**:
```
Component → API Call → Backend → SSH Command → Device
                                               ↓
Component ← API Response ← Backend ← SSH Output ← Device
```

### 2. Backend API (Node.js + Express)

**Location**: `backend/src/`

**Purpose**: REST API server and SSH command orchestration

**Key Technologies**:
- **Express**: Web framework
- **SSH2**: SSH client library
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment configuration

**Key Modules**:

#### Controllers (`controllers/device.controller.js`)
Handles business logic for device operations:
- `getDevices()` - List all devices
- `getDevice()` - Get single device
- `getDeviceMetrics()` - Collect real-time metrics via SSH
- `getDeviceLogs()` - Fetch system logs via SSH
- `addDevice()` - Register new device
- `deleteDevice()` - Remove device

#### Routes (`routes/device.routes.js`)
API endpoint definitions:
- `GET /api/devices` - List devices
- `GET /api/devices/:id` - Device details
- `GET /api/devices/:id/metrics` - Device metrics
- `GET /api/devices/:id/logs` - Device logs
- `POST /api/devices` - Add device
- `DELETE /api/devices/:id` - Remove device

#### Services (`services/sshTerminal.service.js`)
WebSocket server for interactive SSH sessions:
- Manages WebSocket connections
- Creates SSH sessions using ssh2
- Handles terminal input/output
- Supports terminal resize

**Metrics Collection**:

The backend executes SSH commands to collect metrics:

```javascript
// CPU metrics
top -bn1 | head -20

// Memory metrics
free -m

// Load average
cat /proc/loadavg

// Disk usage
df -h

// Network stats
ifconfig || ip -s link

// System logs
dmesg | tail -50
```

**Response Format**:
```javascript
{
  statusCode: 200,
  data: { ... },
  message: "Success message",
  success: true
}
```

### 3. WebSocket SSH Server

**Location**: `backend/src/services/sshTerminal.service.js`

**Purpose**: Real-time SSH terminal sessions

**Protocol**: WebSocket (ws://)

**Message Types**:

1. **Client → Server**:
   - `connect` - Establish SSH connection
   - `input` - Send command input
   - `resize` - Resize terminal window

2. **Server → Client**:
   - `status` - Connection status updates
   - `data` - Command output
   - `error` - Error messages

**Connection Flow**:
```
1. Browser opens WebSocket → ws://localhost:3001
2. Client sends 'connect' message with SSH credentials
3. Server establishes SSH connection using ssh2
4. Server opens SSH shell
5. Server pipes SSH output to WebSocket
6. Client sends terminal input via WebSocket
7. Server forwards input to SSH shell
```

### 4. Edge Devices (Docker Containers)

**Location**: `Dockerfile`

**Purpose**: Simulated edge devices with SSH access

**Base Image**: Alpine Linux (lightweight)

**Key Components**:
- **OpenSSH Server**: Provides SSH access
- **Root Access**: Enabled with default password
- **Host Keys**: Generated on build

**Configuration**:
- Default user: `root`
- Default password: `toor`
- SSH port: 22 (mapped to host ports 2222+)

**Docker Build**:
```dockerfile
FROM alpine:latest
RUN apk add --no-cache openssh-server
RUN ssh-keygen -A
RUN mkdir -p /var/run/sshd
RUN echo 'root:toor' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
```

## 🔄 Data Flow Examples

### Example 1: Fetching Device Metrics

```
1. User opens Device Detail page
   ├─> Component mounted
   └─> useEffect triggers

2. Frontend sends GET request
   └─> /api/devices/1/metrics

3. Backend receives request
   ├─> Finds device by ID
   ├─> Checks device status (SSH ping)
   └─> If online, collects metrics in parallel:
       ├─> SSH: free -m (memory)
       ├─> SSH: top -bn1 (CPU & processes)
       ├─> SSH: df -h (disk)
       └─> SSH: ifconfig (network)

4. Backend parses command outputs
   ├─> Extracts CPU percentages
   ├─> Calculates memory usage
   ├─> Formats disk information
   └─> Aggregates network stats

5. Backend sends JSON response
   └─> { statusCode, data, message, success }

6. Frontend receives response
   ├─> Updates component state
   ├─> Renders charts with new data
   └─> Schedules next fetch (3s interval)
```

### Example 2: Opening SSH Terminal

```
1. User clicks "SSH Terminal" button
   └─> Navigate to /device/:id/terminal

2. Component initializes XTerm.js
   ├─> Creates terminal instance
   ├─> Loads FitAddon
   └─> Opens terminal in DOM

3. Component opens WebSocket
   └─> ws://localhost:3001

4. WebSocket connection established
   └─> Client sends 'connect' message
       {
         type: 'connect',
         host: 'localhost',
         port: 2222,
         username: 'root',
         password: 'toor'
       }

5. WebSocket server creates SSH client
   ├─> ssh2.Client.connect()
   └─> Opens shell stream

6. Server sends status update
   └─> { type: 'status', status: 'connected' }

7. Terminal shows: "Connected successfully!"

8. User types command: ls -la
   ├─> XTerm captures input
   ├─> Sends via WebSocket: { type: 'input', data: 'ls -la\n' }
   └─> Server forwards to SSH stream

9. SSH command executes
   └─> Output returned

10. Server sends output to client
    └─> { type: 'data', data: 'total 48\n...' }

11. XTerm renders output
    └─> User sees command result
```

## 🔐 Security Considerations

### Current Implementation (Development)

⚠️ **NOT PRODUCTION READY**

Current security features:
- ✅ CORS enabled (open)
- ✅ SSH password authentication
- ❌ No API authentication
- ❌ No HTTPS/WSS
- ❌ Hardcoded credentials
- ❌ No rate limiting
- ❌ No input validation

### Production Recommendations

For production deployment, implement:

1. **API Authentication**
   - JWT tokens
   - Session management
   - Role-based access control (RBAC)

2. **Transport Security**
   - HTTPS for API (TLS/SSL)
   - WSS for WebSocket (TLS/SSL)
   - Certificate management

3. **SSH Security**
   - SSH key authentication (replace passwords)
   - SSH key management system
   - Encrypted credential storage

4. **Input Validation**
   - Sanitize all user inputs
   - Validate SSH commands
   - Prevent command injection

5. **Rate Limiting**
   - API request throttling
   - WebSocket connection limits
   - Failed login attempt tracking

6. **Audit Logging**
   - Log all API requests
   - Track SSH sessions
   - Monitor for suspicious activity

7. **Network Security**
   - Firewall rules
   - VPN for device access
   - Network segmentation

## 📊 Database Design (Optional)

Currently using in-memory storage. For persistence, consider MongoDB:

```javascript
// Device Schema
{
  _id: ObjectId,
  name: String,
  host: String,
  port: Number,
  username: String,
  password: String (encrypted),
  description: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date,
  lastSeen: Date,
  status: {
    online: Boolean,
    lastCheck: Date
  }
}

// Metrics History Schema (optional)
{
  _id: ObjectId,
  deviceId: ObjectId,
  timestamp: Date,
  cpu: Object,
  memory: Object,
  disk: Object,
  network: Object
}

// Logs Schema (optional)
{
  _id: ObjectId,
  deviceId: ObjectId,
  timestamp: Date,
  level: String,
  message: String,
  source: String
}
```

## 🚀 Deployment Architecture

### Docker Compose Deployment

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - API_URL=http://backend:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/edgemanager
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db

  edge-device:
    build: .
    ports:
      - "2222:22"

volumes:
  mongo-data:
```

### Kubernetes Deployment (Advanced)

```yaml
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: edge-manager-frontend:latest
        ports:
        - containerPort: 80

---
# Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: edge-manager-backend:latest
        ports:
        - containerPort: 8000
        - containerPort: 3001
```

## 🔧 Configuration Management

### Environment Variables

**Backend** (`.env`):
```bash
PORT=8000                    # HTTP API port
WS_PORT=3001                 # WebSocket port
MONGODB_URI=...              # Database connection
CORS_ORIGIN=*                # CORS settings
ACCESS_TOKEN_SECRET=...      # JWT secret
```

**Frontend** (Vite proxy):
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

## 📈 Performance Considerations

### Frontend Optimization
- ✅ React.memo for expensive components
- ✅ Debounce API calls
- ✅ Lazy load routes
- ✅ Chart data windowing (keep last 20 points)

### Backend Optimization
- ✅ SSH connection pooling
- ✅ Parallel metric collection
- ✅ Response caching (optional)
- ✅ Keep-alive for SSH connections

### WebSocket Optimization
- ✅ Binary data for terminal output
- ✅ Compression for large outputs
- ✅ Connection timeout handling
- ✅ Reconnection logic

## 🔄 Scalability

### Horizontal Scaling

**Frontend**: Multiple instances behind load balancer
```
Load Balancer → Frontend 1
              → Frontend 2
              → Frontend 3
```

**Backend**: Stateless API servers
```
Load Balancer → Backend 1
              → Backend 2
              → Backend 3
```

**WebSocket**: Sticky sessions or Redis pub/sub
```
Load Balancer (sticky) → WS Server 1
                       → WS Server 2
                       → WS Server 3
```

### Vertical Scaling

- Increase container resources
- Optimize SSH connection pool size
- Tune Node.js event loop

## 🧪 Testing Strategy

### Unit Tests
- Controller functions
- Metric parsing logic
- SSH command builders

### Integration Tests
- API endpoint testing
- WebSocket connection flow
- SSH command execution

### E2E Tests
- Full user workflows
- Terminal interactions
- Multi-device scenarios

## 📚 Further Reading

- [SSH2 Library Documentation](https://github.com/mscdex/ssh2)
- [XTerm.js Guide](https://xtermjs.org/)
- [WebSocket Protocol RFC](https://tools.ietf.org/html/rfc6455)
- [Docker Networking](https://docs.docker.com/network/)
- [React Best Practices](https://react.dev/learn)

---

This architecture supports the current development needs while providing a clear path for production deployment and scaling.

