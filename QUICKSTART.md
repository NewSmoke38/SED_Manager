# 🚀 Quick Start Guide

Get your Edge Device Manager running in 3 minutes!

## Step 1: Verify Docker Container is Running

Make sure your simulated edge device container is running:

```bash
docker ps
```

You should see something like:

```
CONTAINER ID   IMAGE               PORTS                     NAMES
04d6fd5f92b2   sim-device:latest   0.0.0.0:2222->22/tcp      my-edge-device-1
```

If not running, start it:

```bash
docker run -d --name my-edge-device-1 -p 2222:22 sim-device:latest
```

## Step 2: Run Setup Script

From the project root directory:

```bash
./setup.sh
```

This will:
- Create the backend `.env` configuration file
- Install all dependencies for backend and frontend
- Set up the project structure

**OR** do it manually:

```bash
# Create .env file
cd backend
cp .env.example .env
cd ..

# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Step 3: Start the Application

```bash
npm run dev
```

This starts both:
- **Backend API** on `http://localhost:3001`
- **Frontend** on `http://localhost:3000`

## Step 4: Access the Dashboard

Open your browser to:

```
http://localhost:3000
```

You should see:
- ✅ Your edge device showing as "Online"
- 📊 Real-time metrics (CPU, Memory, Disk)
- 📈 Live charts updating every few seconds

## Step 5: Try the Features

### View Device Details
Click **"View Details"** to see:
- Interactive CPU/Memory charts
- Detailed system metrics
- Top running processes
- System logs

### Open SSH Terminal
Click **"SSH Terminal"** to:
- Get a live terminal in your browser
- Run commands like `df -h`, `free -m`, `top`
- Full interactive shell access

## 🎯 Test Commands in Terminal

Once you open the SSH terminal, try these:

```bash
# Check disk usage
df -h

# Check memory
free -m

# View processes
top -n 1

# Check network interfaces
ip addr

# View system info
uname -a

# Exit when done
exit
```

## 🔧 Troubleshooting

### Port 3000 already in use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change frontend port in frontend/vite.config.js
```

### Port 3001 already in use?
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change backend port in backend/.env
```

### Can't connect to device?
```bash
# Test SSH connection manually
ssh root@localhost -p 2222
# Password: toor

# Check container logs
docker logs my-edge-device-1
```

### Dependencies installation failed?
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

## 📚 What's Next?

1. **Add More Devices**: Run more Docker containers on different ports (2223, 2224, etc.)
2. **Customize**: Change colors and themes in `frontend/src/index.css`
3. **Extend**: Add more metrics or features
4. **Deploy**: Build for production with `npm run build`

## 🎉 You're All Set!

Your secure edge device manager is now running. Monitor your devices, view metrics, and access terminals—all from one beautiful dashboard.

Need help? Check the full [README.md](./README.md) for detailed documentation.


