const express = require('express');
const router = express.Router();
const deviceService = require('../services/deviceService');

// In-memory device storage (in production, use a database)
const devices = [
  {
    id: 1,
    name: 'Edge Device 1',
    host: process.env.DEFAULT_SSH_HOST || 'localhost',
    port: parseInt(process.env.DEFAULT_SSH_PORT) || 2222,
    username: process.env.DEFAULT_SSH_USER || 'root',
    password: process.env.DEFAULT_SSH_PASSWORD || 'toor',
    status: 'unknown'
  }
];

// Get all devices
router.get('/', (req, res) => {
  res.json(devices);
});

// Get device by ID
router.get('/:id', (req, res) => {
  const device = devices.find(d => d.id === parseInt(req.params.id));
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

// Add a new device
router.post('/', (req, res) => {
  const { name, host, port, username, password } = req.body;
  const newDevice = {
    id: devices.length + 1,
    name,
    host,
    port: parseInt(port),
    username,
    password,
    status: 'unknown'
  };
  devices.push(newDevice);
  res.status(201).json(newDevice);
});

// Get device status (online/offline)
router.get('/:id/status', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const status = await deviceService.checkDeviceStatus(device);
    device.status = status.online ? 'online' : 'offline';
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all metrics for a device
router.get('/:id/metrics', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const metrics = await deviceService.getAllMetrics(device);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get disk usage
router.get('/:id/disk', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const diskUsage = await deviceService.getDiskUsage(device);
    res.json(diskUsage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get memory usage
router.get('/:id/memory', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const memoryUsage = await deviceService.getMemoryUsage(device);
    res.json(memoryUsage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get CPU usage
router.get('/:id/cpu', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const cpuUsage = await deviceService.getCpuUsage(device);
    res.json(cpuUsage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system logs
router.get('/:id/logs', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const logs = await deviceService.getSystemLogs(device);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get network stats
router.get('/:id/network', async (req, res) => {
  try {
    const device = devices.find(d => d.id === parseInt(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const networkStats = await deviceService.getNetworkStats(device);
    res.json(networkStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


