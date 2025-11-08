# Quick Start Guide

Get up and running in 5 minutes! 🚀

## Step 1: Start the Edge Device (Docker)

```bash
# Build the Docker image
docker build -t edge-device .

# Run the container
docker run -d -p 2222:22 --name edge-device-1 edge-device

# Verify it's running
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE         COMMAND                  CREATED          STATUS          PORTS                  NAMES
xxxxxxxxxxxxx  edge-device   "/usr/sbin/sshd -D"      5 seconds ago    Up 4 seconds    0.0.0.0:2222->22/tcp   edge-device-1
```

## Step 2: Start the Backend

```bash
cd backend

# Install dependencies (first time only)
npm install

# Start the server
npm run dev
```

Expected output:
```
MongoDB connection skipped - using in-memory storage
🚀 HTTP Server is running at port: 8000
   API: http://localhost:8000/api/devices
🔌 WebSocket Server running on port: 3001
```

## Step 3: Start the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

Expected output:
```
  VITE v5.1.4  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Step 4: Access the Dashboard

Open your browser and go to: **http://localhost:3000**

You should see:
- ✅ Edge Device 1 listed
- ✅ Online status (green badge)
- ✅ Real-time CPU, Memory, and Disk metrics
- ✅ Buttons for "View Details" and "SSH Terminal"

## Step 5: Test Features

### View Device Details
1. Click **"View Details"** on the device card
2. See real-time charts updating every 3 seconds
3. Check CPU & Memory graphs
4. View disk usage, top processes, and system logs

### Open SSH Terminal
1. Click **"SSH Terminal"** button
2. Wait for "Connected successfully!" message
3. Try commands:
   ```bash
   ls -la
   top
   free -m
   df -h
   ```
4. Type `exit` to close the SSH session

## 🎉 Success!

You now have a fully functional edge device monitoring system!

## 🔧 Common Issues

### Issue: Docker container won't start
**Solution**: Make sure Docker is running:
```bash
docker ps
# If error, start Docker Desktop
```

### Issue: Backend shows MongoDB error
**Solution**: This is normal! The app works fine without MongoDB. It uses in-memory storage.

### Issue: Frontend shows "Device is offline"
**Solution**: 
1. Check Docker container is running: `docker ps`
2. Test SSH manually: `ssh root@localhost -p 2222` (password: toor)
3. Restart backend: `Ctrl+C` then `npm run dev`

### Issue: SSH Terminal not connecting
**Solution**:
1. Verify WebSocket server is running (port 3001)
2. Check browser console for errors (F12)
3. Restart both frontend and backend

## 🚀 Next Steps

1. **Add more devices**: Run another Docker container on a different port
   ```bash
   docker run -d -p 2223:22 --name edge-device-2 edge-device
   ```

2. **Customize device info**: Edit the device in backend code
   - File: `backend/src/controllers/device.controller.js`
   - Look for the `devices` array

3. **Explore the code**:
   - Frontend: `frontend/src/pages/`
   - Backend: `backend/src/controllers/`
   - Docker: `Dockerfile`

## 📚 Need More Help?

Check the full [README.md](README.md) for:
- Detailed API documentation
- Architecture overview
- Troubleshooting guide
- Production deployment tips

---

Happy monitoring! 🎯
