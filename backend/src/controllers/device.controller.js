import { Client } from 'ssh2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Device from '../models/device.model.js';

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

const detectOS = async (device) => {
  try {
    const output = await executeSSHCommand(device, 'uname -s 2>/dev/null || echo Windows');
    const os = output.trim().toLowerCase();
    
    if (os.includes('linux')) return 'linux';
    if (os.includes('darwin')) return 'macos';
    if (os.includes('windows')) return 'windows';
    
    // Try Windows-specific command
    try {
      await executeSSHCommand(device, 'ver');
      return 'windows';
    } catch (e) {
      return 'linux'; // default to linux
    }
  } catch (error) {
    return 'linux';
  }
};

const checkDeviceStatus = async (device) => {
  try {
    await executeSSHCommand(device, 'echo "ping"');
    return { online: true, lastSeen: new Date().toISOString() };
  } catch (error) {
    return { online: false, lastSeen: null, error: error.message };
  }
};

// Windows-specific parsers
const parseWindowsMemory = (output) => {
  try {
    // Parse wmic /format:list output: Key=Value format
    let freeMemKB = 0;
    let totalMemKB = 0;
    
    const lines = output.split('\n');
    for (let line of lines) {
      if (line.includes('FreePhysicalMemory=')) {
        freeMemKB = parseInt(line.split('=')[1]);
      } else if (line.includes('TotalVisibleMemorySize=')) {
        totalMemKB = parseInt(line.split('=')[1]);
      }
    }
    
    if (totalMemKB > 0) {
      const freeMB = freeMemKB / 1024;
      const totalMB = totalMemKB / 1024;
      const usedMB = totalMB - freeMB;
      const usedPercent = Math.round((usedMB / totalMB) * 100);
      
      return {
        total: `${(totalMB / 1024).toFixed(2)} GB`,
        used: `${(usedMB / 1024).toFixed(2)} GB`,
        free: `${(freeMB / 1024).toFixed(2)} GB`,
        available: `${(freeMB / 1024).toFixed(2)} GB`,
        usedPercent: `${usedPercent}%`
      };
    }
  } catch (e) {
    console.error('Error parsing Windows memory:', e);
  }
  return { total: 'N/A', used: 'N/A', free: 'N/A', available: 'N/A', usedPercent: 'N/A' };
};

const parseWindowsCPU = (output) => {
  try {
    // Parse wmic /format:list output: LoadPercentage=value
    const lines = output.split('\n');
    for (let line of lines) {
      if (line.includes('LoadPercentage=')) {
        const load = parseInt(line.split('=')[1]);
        if (!isNaN(load)) {
          return {
            usedPercent: `${load}%`,
            userPercent: `${Math.round(load * 0.7)}%`,
            systemPercent: `${Math.round(load * 0.3)}%`,
            loadAverage: { '1min': 'N/A', '5min': 'N/A', '15min': 'N/A' },
            processes: []
          };
        }
      }
    }
  } catch (e) {
    console.error('Error parsing Windows CPU:', e);
  }
  return {
    usedPercent: 'N/A',
    userPercent: 'N/A',
    systemPercent: 'N/A',
    loadAverage: { '1min': 'N/A', '5min': 'N/A', '15min': 'N/A' },
    processes: []
  };
};

const parseWindowsProcesses = (output) => {
  try {
    const lines = output.split('\n').filter(l => l.trim()).slice(1); // Skip header
    const processes = [];
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          processes.push({
            pid: parts[1],
            user: 'N/A',
            cpu: 'N/A',
            memory: parts[0],
            command: parts.slice(2).join(' ') || parts[0]
          });
        }
      }
    }
    
    return processes;
  } catch (e) {
    return [];
  }
};

const parseWindowsDisk = (output) => {
  try {
    // Parse wmic /format:list output
    const lines = output.split('\n');
    const filesystems = [];
    let currentDisk = {};
    
    for (let line of lines) {
      line = line.trim();
      if (line.includes('Caption=')) {
        if (currentDisk.Caption) {
          // Process previous disk
          if (currentDisk.Size && currentDisk.FreeSpace) {
            const total = parseInt(currentDisk.Size) / (1024 * 1024 * 1024);
            const free = parseInt(currentDisk.FreeSpace) / (1024 * 1024 * 1024);
            const used = total - free;
            const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
            
            filesystems.push({
              filesystem: currentDisk.Caption,
              size: `${total.toFixed(2)}G`,
              used: `${used.toFixed(2)}G`,
              available: `${free.toFixed(2)}G`,
              usedPercent: `${usedPercent}%`,
              mountedOn: currentDisk.Caption
            });
          }
        }
        currentDisk = { Caption: line.split('=')[1] };
      } else if (line.includes('FreeSpace=')) {
        currentDisk.FreeSpace = line.split('=')[1];
      } else if (line.includes('Size=')) {
        currentDisk.Size = line.split('=')[1];
      }
    }
    
    // Process last disk
    if (currentDisk.Caption && currentDisk.Size && currentDisk.FreeSpace) {
      const total = parseInt(currentDisk.Size) / (1024 * 1024 * 1024);
      const free = parseInt(currentDisk.FreeSpace) / (1024 * 1024 * 1024);
      const used = total - free;
      const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
      
      filesystems.push({
        filesystem: currentDisk.Caption,
        size: `${total.toFixed(2)}G`,
        used: `${used.toFixed(2)}G`,
        available: `${free.toFixed(2)}G`,
        usedPercent: `${usedPercent}%`,
        mountedOn: currentDisk.Caption
      });
    }
    
    return { filesystems };
  } catch (e) {
    console.error('Error parsing Windows disk:', e);
    return { filesystems: [] };
  }
};

const parseWindowsFirewallStatus = (output) => {
  const result = {};
  const lines = output.split('\n');
  let currentProfile = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const profileMatch = line.match(/^(Domain|Private|Public)\s+Profile Settings/i);
    if (profileMatch) {
      currentProfile = profileMatch[1].toLowerCase();
      if (!result[currentProfile]) {
        result[currentProfile] = {};
      }
      continue;
    }

    if (currentProfile && line.toLowerCase().startsWith('state')) {
      const parts = line.split(/\s+/);
      const state = parts.slice(1).join(' ').toLowerCase();
      result[currentProfile].state = state;
    }
  }

  return result;
};

// Linux-specific parsers
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
  const devices = await Device.find().sort({ createdAt: -1 });
  
  // Transform to match frontend expectations
  const devicesData = devices.map(device => ({
    id: device._id.toString(),
    name: device.name,
    host: device.host,
    port: device.port,
    username: device.username,
    password: device.password,
    description: device.description,
    createdAt: device.createdAt,
    status: device.status,
    lastSeen: device.lastSeen
  }));
  
  res.status(200).json(new ApiResponse(200, devicesData, 'Devices retrieved successfully'));
});

// Get single device
export const getDevice = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  const deviceData = {
    id: device._id.toString(),
    name: device.name,
    host: device.host,
    port: device.port,
    username: device.username,
    password: device.password,
    description: device.description,
    createdAt: device.createdAt,
    status: device.status,
    lastSeen: device.lastSeen
  };
  
  res.status(200).json(new ApiResponse(200, deviceData, 'Device retrieved successfully'));
});

// Get device metrics
export const getDeviceMetrics = asyncHandler(async (req, res) => {
  const dbDevice = await Device.findById(req.params.id);
  
  if (!dbDevice) {
    throw new ApiError(404, 'Device not found');
  }
  
  // Transform to plain object for SSH operations
  const device = {
    id: dbDevice._id.toString(),
    name: dbDevice.name,
    host: dbDevice.host,
    port: dbDevice.port,
    username: dbDevice.username,
    password: dbDevice.password,
    description: dbDevice.description
  };
  
  try {
    // Check device status first
    const status = await checkDeviceStatus(device);
    
    if (!status.online) {
      return res.status(200).json(new ApiResponse(200, { status }, 'Device is offline'));
    }
    
    // Detect OS type
    const osType = await detectOS(device);
    console.log(`Device ${device.name} OS: ${osType}`);
    
    let metrics;
    
    if (osType === 'windows') {
      // Windows-specific commands
      const [memoryOutput, cpuOutput, processOutput, diskOutput] = await Promise.all([
        executeSSHCommand(device, 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:list').catch(() => ''),
        executeSSHCommand(device, 'wmic cpu get loadpercentage /format:list').catch(() => ''),
        executeSSHCommand(device, 'tasklist').catch(() => ''),
        executeSSHCommand(device, 'wmic logicaldisk get caption,freespace,size /format:list').catch(() => '')
      ]);
      
      const cpuData = parseWindowsCPU(cpuOutput);
      cpuData.processes = parseWindowsProcesses(processOutput);
      
      metrics = {
        status,
        memory: parseWindowsMemory(memoryOutput),
        cpu: cpuData,
        disk: parseWindowsDisk(diskOutput),
        network: { interfaces: [] }, // Network metrics for Windows need different approach
        timestamp: new Date().toISOString()
      };
    } else {
      // Linux/Unix commands
      const [memoryOutput, topOutput, loadAvgOutput, diskOutput, networkOutput] = await Promise.all([
        executeSSHCommand(device, 'free -m'),
        executeSSHCommand(device, 'top -bn1 | head -20'),
        executeSSHCommand(device, 'cat /proc/loadavg | awk \'{print $1, $2, $3}\''),
        executeSSHCommand(device, 'df -h'),
        executeSSHCommand(device, 'ifconfig || ip -s link')
      ]);
      
      metrics = {
        status,
        memory: parseMemoryInfo(memoryOutput),
        cpu: parseCPUInfo(topOutput, loadAvgOutput),
        disk: parseDiskInfo(diskOutput),
        network: parseNetworkInfo(networkOutput),
        timestamp: new Date().toISOString()
      };
    }
    
    // Update device status in database
    await Device.findByIdAndUpdate(req.params.id, {
      status: metrics.status.online ? 'online' : 'offline',
      lastSeen: metrics.status.lastSeen
    });
    
    res.status(200).json(new ApiResponse(200, metrics, 'Metrics retrieved successfully'));
  } catch (error) {
    console.error('Error collecting metrics:', error);
    
    // Update device status as offline
    await Device.findByIdAndUpdate(req.params.id, {
      status: 'offline'
    });
    
    res.status(200).json(new ApiResponse(200, {
      status: { online: false, error: error.message },
      timestamp: new Date().toISOString()
    }, 'Failed to collect metrics'));
  }
});

// Get device logs
export const getDeviceLogs = asyncHandler(async (req, res) => {
  const dbDevice = await Device.findById(req.params.id);
  
  if (!dbDevice) {
    throw new ApiError(404, 'Device not found');
  }
  
  // Transform to plain object for SSH operations
  const device = {
    host: dbDevice.host,
    port: dbDevice.port,
    username: dbDevice.username,
    password: dbDevice.password
  };
  
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

export const updateWindowsFirewall = asyncHandler(async (req, res) => {
  const { action, profile } = req.body;

  if (!action) {
    throw new ApiError(400, 'Action is required (enable or disable)');
  }

  const normalizedAction = action.toLowerCase();

  if (!['enable', 'disable'].includes(normalizedAction)) {
    throw new ApiError(400, 'Invalid action. Use "enable" or "disable".');
  }

  const profileKey = (profile || 'all').toLowerCase();
  const profileMap = {
    all: 'allprofiles',
    domain: 'domainprofile',
    private: 'privateprofile',
    public: 'publicprofile'
  };

  if (!profileMap[profileKey]) {
    throw new ApiError(400, 'Invalid profile. Use all, domain, private, or public.');
  }

  const dbDevice = await Device.findById(req.params.id);

  if (!dbDevice) {
    throw new ApiError(404, 'Device not found');
  }

  const device = {
    host: dbDevice.host,
    port: dbDevice.port,
    username: dbDevice.username,
    password: dbDevice.password
  };

  const osType = await detectOS(device);

  if (osType !== 'windows') {
    throw new ApiError(400, 'Firewall management is only supported for Windows devices.');
  }

  const desiredState = normalizedAction === 'enable' ? 'on' : 'off';
  const targetProfile = profileMap[profileKey];

  let commandOutput = '';
  try {
    commandOutput = await executeSSHCommand(device, `netsh advfirewall set ${targetProfile} state ${desiredState}`);
  } catch (error) {
    throw new ApiError(500, `Failed to update Windows Firewall: ${error.message}`);
  }

  let statusOutput = '';
  let parsedStatus = null;
  try {
    statusOutput = await executeSSHCommand(device, 'netsh advfirewall show allprofiles');
    parsedStatus = parseWindowsFirewallStatus(statusOutput);
  } catch (error) {
    statusOutput = '';
  }

  res.status(200).json(new ApiResponse(200, {
    action: normalizedAction,
    profile: profileKey,
    commandOutput: commandOutput.trim(),
    statusOutput: statusOutput.trim(),
    parsedStatus
  }, `Windows Firewall ${normalizedAction}d successfully`));
});

export const addDevice = asyncHandler(async (req, res) => {
  const { name, host, port, username, password, description } = req.body;
  
  if (!name || !host || !port || !username || !password) {
    throw new ApiError(400, 'All required fields must be provided');
  }
  
  const device = await Device.create({
    name,
    host,
    port: parseInt(port),
    username,
    password,
    description: description || '',
    status: 'unknown'
  });
  
  const deviceData = {
    id: device._id.toString(),
    name: device.name,
    host: device.host,
    port: device.port,
    username: device.username,
    password: device.password,
    description: device.description,
    createdAt: device.createdAt,
    status: device.status
  };
  
  res.status(201).json(new ApiResponse(201, deviceData, 'Device added successfully'));
});

// Delete device
export const deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findByIdAndDelete(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  res.status(200).json(new ApiResponse(200, null, 'Device deleted successfully'));
});

