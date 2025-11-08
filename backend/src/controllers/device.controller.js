import { Client } from 'ssh2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory device storage (you can replace this with MongoDB if needed)
let devices = [
  {
    id: '1',
    name: 'Edge Device 1',
    host: 'localhost',
    port: 2222,
    username: 'root',
    password: 'toor',
    description: 'Primary edge device',
    createdAt: new Date().toISOString()
  }
];

// Helper function to execute SSH command
const executeSSHCommand = (device, command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        stream.on('close', () => {
          conn.end();
          resolve(output);
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          output += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).on('timeout', () => {
      conn.end();
      reject(new Error('SSH connection timeout'));
    }).connect({
      host: device.host,
      port: device.port,
      username: device.username,
      password: device.password,
      readyTimeout: 10000,
      keepaliveInterval: 5000
    });
  });
};

// Helper function to check device online status
const checkDeviceStatus = async (device) => {
  try {
    await executeSSHCommand(device, 'echo "ping"');
    return { online: true, lastSeen: new Date().toISOString() };
  } catch (error) {
    return { online: false, lastSeen: null, error: error.message };
  }
};

// Helper function to parse metrics
const parseMemoryInfo = (output) => {
  const lines = output.split('\n');
  const memLine = lines.find(l => l.includes('Mem:'));
  
  if (memLine) {
    const parts = memLine.trim().split(/\s+/);
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const free = parseInt(parts[3]);
    const available = parseInt(parts[6] || parts[3]);
    const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
    
    return {
      total: `${(total / 1024).toFixed(2)} GB`,
      used: `${(used / 1024).toFixed(2)} GB`,
      free: `${(free / 1024).toFixed(2)} GB`,
      available: `${(available / 1024).toFixed(2)} GB`,
      usedPercent: `${usedPercent}%`
    };
  }
  
  return { total: 'N/A', used: 'N/A', free: 'N/A', available: 'N/A', usedPercent: 'N/A' };
};

const parseCPUInfo = (topOutput, loadAvgOutput) => {
  try {
    // Parse CPU usage from top
    const cpuLine = topOutput.split('\n').find(l => l.includes('CPU:') || l.includes('Cpu(s)'));
    let userPercent = '0%', systemPercent = '0%', usedPercent = '0%';
    
    if (cpuLine) {
      const userMatch = cpuLine.match(/(\d+\.?\d*)%?\s*us/i) || cpuLine.match(/(\d+\.?\d*)%?\s*user/i);
      const sysMatch = cpuLine.match(/(\d+\.?\d*)%?\s*sy/i) || cpuLine.match(/(\d+\.?\d*)%?\s*system/i);
      const idleMatch = cpuLine.match(/(\d+\.?\d*)%?\s*id/i) || cpuLine.match(/(\d+\.?\d*)%?\s*idle/i);
      
      if (userMatch) userPercent = `${parseFloat(userMatch[1]).toFixed(1)}%`;
      if (sysMatch) systemPercent = `${parseFloat(sysMatch[1]).toFixed(1)}%`;
      
      if (idleMatch) {
        const idle = parseFloat(idleMatch[1]);
        const used = 100 - idle;
        usedPercent = `${used.toFixed(1)}%`;
      } else if (userMatch || sysMatch) {
        const user = userMatch ? parseFloat(userMatch[1]) : 0;
        const sys = sysMatch ? parseFloat(sysMatch[1]) : 0;
        usedPercent = `${(user + sys).toFixed(1)}%`;
      }
    }
    
    // Parse load average
    const loadParts = loadAvgOutput.trim().split(/\s+/);
    const loadAverage = {
      '1min': loadParts[0] || 'N/A',
      '5min': loadParts[1] || 'N/A',
      '15min': loadParts[2] || 'N/A'
    };
    
    // Parse top processes
    const lines = topOutput.split('\n');
    const processes = [];
    let processSection = false;
    
    for (let line of lines) {
      if (line.includes('PID') && (line.includes('USER') || line.includes('COMMAND'))) {
        processSection = true;
        continue;
      }
      
      if (processSection && line.trim()) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 8 && !isNaN(parts[0])) {
          processes.push({
            pid: parts[0],
            user: parts[1],
            cpu: `${parts[6]}%`,
            memory: `${parts[7]}%`,
            command: parts.slice(8).join(' ')
          });
        }
        
        if (processes.length >= 5) break;
      }
    }
    
    return {
      usedPercent,
      userPercent,
      systemPercent,
      loadAverage,
      processes
    };
  } catch (error) {
    console.error('Error parsing CPU info:', error);
    return {
      usedPercent: 'N/A',
      userPercent: 'N/A',
      systemPercent: 'N/A',
      loadAverage: { '1min': 'N/A', '5min': 'N/A', '15min': 'N/A' },
      processes: []
    };
  }
};

const parseDiskInfo = (output) => {
  const lines = output.split('\n').slice(1); // Skip header
  const filesystems = [];
  
  for (let line of lines) {
    if (line.trim()) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        filesystems.push({
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usedPercent: parts[4],
          mountedOn: parts[5]
        });
      }
    }
  }
  
  return { filesystems };
};

const parseNetworkInfo = (output) => {
  const lines = output.split('\n');
  const interfaces = [];
  let currentInterface = null;
  
  for (let line of lines) {
    if (line && !line.startsWith(' ')) {
      if (currentInterface) {
        interfaces.push(currentInterface);
      }
      
      const parts = line.split(':');
      currentInterface = {
        name: parts[0].trim(),
        rx: 'N/A',
        tx: 'N/A'
      };
    } else if (currentInterface && line.includes('RX packets')) {
      const match = line.match(/RX packets.*bytes\s+(\d+)/);
      if (match) {
        const bytes = parseInt(match[1]);
        currentInterface.rx = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
    } else if (currentInterface && line.includes('TX packets')) {
      const match = line.match(/TX packets.*bytes\s+(\d+)/);
      if (match) {
        const bytes = parseInt(match[1]);
        currentInterface.tx = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
    }
  }
  
  if (currentInterface) {
    interfaces.push(currentInterface);
  }
  
  return { interfaces: interfaces.filter(i => i.name !== 'lo') };
};

// Get all devices
export const getDevices = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, devices, 'Devices retrieved successfully'));
});

// Get single device
export const getDevice = asyncHandler(async (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  res.status(200).json(new ApiResponse(200, device, 'Device retrieved successfully'));
});

// Get device metrics
export const getDeviceMetrics = asyncHandler(async (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  try {
    // Check device status first
    const status = await checkDeviceStatus(device);
    
    if (!status.online) {
      return res.status(200).json(new ApiResponse(200, { status }, 'Device is offline'));
    }
    
    // Collect all metrics in parallel
    const [memoryOutput, topOutput, loadAvgOutput, diskOutput, networkOutput] = await Promise.all([
      executeSSHCommand(device, 'free -m'),
      executeSSHCommand(device, 'top -bn1 | head -20'),
      executeSSHCommand(device, 'cat /proc/loadavg | awk \'{print $1, $2, $3}\''),
      executeSSHCommand(device, 'df -h'),
      executeSSHCommand(device, 'ifconfig || ip -s link')
    ]);
    
    const metrics = {
      status,
      memory: parseMemoryInfo(memoryOutput),
      cpu: parseCPUInfo(topOutput, loadAvgOutput),
      disk: parseDiskInfo(diskOutput),
      network: parseNetworkInfo(networkOutput),
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(new ApiResponse(200, metrics, 'Metrics retrieved successfully'));
  } catch (error) {
    console.error('Error collecting metrics:', error);
    res.status(200).json(new ApiResponse(200, {
      status: { online: false, error: error.message },
      timestamp: new Date().toISOString()
    }, 'Failed to collect metrics'));
  }
});

// Get device logs
export const getDeviceLogs = asyncHandler(async (req, res) => {
  const device = devices.find(d => d.id === req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  try {
    // Try to get system logs (dmesg or syslog)
    let logOutput;
    try {
      logOutput = await executeSSHCommand(device, 'dmesg | tail -50');
    } catch (e) {
      // Fallback to checking /var/log
      try {
        logOutput = await executeSSHCommand(device, 'tail -50 /var/log/messages 2>/dev/null || tail -50 /var/log/syslog 2>/dev/null || echo "No logs available"');
      } catch (e2) {
        logOutput = 'No logs available';
      }
    }
    
    // Parse logs into structured format
    const logs = logOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        let level = 'info';
        if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
          level = 'error';
        } else if (line.toLowerCase().includes('warn')) {
          level = 'warning';
        }
        
        return {
          level,
          message: line.trim(),
          timestamp: new Date().toISOString()
        };
      });
    
    res.status(200).json(new ApiResponse(200, { logs }, 'Logs retrieved successfully'));
  } catch (error) {
    console.error('Error collecting logs:', error);
    res.status(200).json(new ApiResponse(200, { logs: [] }, 'Failed to collect logs'));
  }
});

// Add new device
export const addDevice = asyncHandler(async (req, res) => {
  const { name, host, port, username, password, description } = req.body;
  
  if (!name || !host || !port || !username || !password) {
    throw new ApiError(400, 'All fields are required');
  }
  
  const newDevice = {
    id: String(devices.length + 1),
    name,
    host,
    port: parseInt(port),
    username,
    password,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  
  devices.push(newDevice);
  
  res.status(201).json(new ApiResponse(201, newDevice, 'Device added successfully'));
});

// Delete device
export const deleteDevice = asyncHandler(async (req, res) => {
  const index = devices.findIndex(d => d.id === req.params.id);
  
  if (index === -1) {
    throw new ApiError(404, 'Device not found');
  }
  
  devices.splice(index, 1);
  
  res.status(200).json(new ApiResponse(200, null, 'Device deleted successfully'));
});

