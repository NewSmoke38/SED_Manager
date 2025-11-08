const { Client } = require('ssh2');

/**
 * Execute a command on a remote device via SSH
 */
async function executeCommand(device, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('close', (code, signal) => {
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
    }).connect({
      host: device.host,
      port: device.port,
      username: device.username,
      password: device.password,
      readyTimeout: 5000
    });
  });
}

/**
 * Check if device is online
 */
async function checkDeviceStatus(device) {
  try {
    await executeCommand(device, 'echo "alive"');
    return {
      online: true,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      online: false,
      lastChecked: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Parse disk usage from df -h output
 */
function parseDiskUsage(output) {
  const lines = output.trim().split('\n');
  const filesystems = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
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

  return { filesystems, timestamp: new Date().toISOString() };
}

/**
 * Parse memory usage from free -m output
 */
function parseMemoryUsage(output) {
  const lines = output.trim().split('\n');
  
  // Find the Mem: line
  const memLine = lines.find(line => line.startsWith('Mem:'));
  if (!memLine) {
    throw new Error('Could not parse memory output');
  }

  const parts = memLine.split(/\s+/);
  
  return {
    total: parts[1] + 'MB',
    used: parts[2] + 'MB',
    free: parts[3] + 'MB',
    shared: parts[4] + 'MB',
    buffCache: parts[5] + 'MB',
    available: parts[6] + 'MB',
    usedPercent: ((parseInt(parts[2]) / parseInt(parts[1])) * 100).toFixed(1) + '%',
    timestamp: new Date().toISOString()
  };
}

/**
 * Parse CPU usage from top -n 1 output
 */
function parseCpuUsage(output) {
  const lines = output.trim().split('\n');
  
  // Find CPU line
  const cpuLine = lines.find(line => line.startsWith('CPU:'));
  if (!cpuLine) {
    throw new Error('Could not parse CPU output');
  }

  // Parse: "CPU:   0% usr   0% sys   0% nic 100% idle   0% io   0% irq   0% sirq"
  const match = cpuLine.match(/(\d+)%\s+usr\s+(\d+)%\s+sys\s+(\d+)%\s+nic\s+(\d+)%\s+idle/);
  
  if (!match) {
    throw new Error('Could not parse CPU percentages');
  }

  const usr = parseInt(match[1]);
  const sys = parseInt(match[2]);
  const idle = parseInt(match[4]);
  const used = 100 - idle;

  // Get load average
  const loadLine = lines.find(line => line.includes('Load average:'));
  let loadAverage = { '1min': 0, '5min': 0, '15min': 0 };
  
  if (loadLine) {
    const loadMatch = loadLine.match(/Load average:\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (loadMatch) {
      loadAverage = {
        '1min': parseFloat(loadMatch[1]),
        '5min': parseFloat(loadMatch[2]),
        '15min': parseFloat(loadMatch[3])
      };
    }
  }

  // Get process list
  const processes = [];
  let processStarted = false;
  
  for (const line of lines) {
    if (line.includes('PID') && line.includes('COMMAND')) {
      processStarted = true;
      continue;
    }
    
    if (processStarted && line.trim()) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 8) {
        processes.push({
          pid: parts[0],
          user: parts[2],
          cpu: parts[7],
          memory: parts[5],
          command: parts.slice(8).join(' ')
        });
      }
    }
  }

  return {
    usedPercent: used + '%',
    userPercent: usr + '%',
    systemPercent: sys + '%',
    idlePercent: idle + '%',
    loadAverage,
    processes: processes.slice(0, 10), // Top 10 processes
    timestamp: new Date().toISOString()
  };
}

/**
 * Get disk usage
 */
async function getDiskUsage(device) {
  const output = await executeCommand(device, 'df -h');
  return parseDiskUsage(output);
}

/**
 * Get memory usage
 */
async function getMemoryUsage(device) {
  const output = await executeCommand(device, 'free -m');
  return parseMemoryUsage(output);
}

/**
 * Get CPU usage
 */
async function getCpuUsage(device) {
  const output = await executeCommand(device, 'top -b -n 1');
  return parseCpuUsage(output);
}

/**
 * Get all metrics at once
 */
async function getAllMetrics(device) {
  try {
    const [disk, memory, cpu, status] = await Promise.all([
      getDiskUsage(device),
      getMemoryUsage(device),
      getCpuUsage(device),
      checkDeviceStatus(device)
    ]);

    return {
      status,
      disk,
      memory,
      cpu,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get metrics: ${error.message}`);
  }
}

/**
 * Get system logs
 */
async function getSystemLogs(device) {
  try {
    // Get dmesg logs (last 50 lines)
    const output = await executeCommand(device, 'dmesg | tail -n 50');
    const lines = output.trim().split('\n');
    
    const logs = lines.map((line, index) => ({
      id: index + 1,
      timestamp: new Date().toISOString(),
      message: line,
      level: line.toLowerCase().includes('error') ? 'error' : 
             line.toLowerCase().includes('warn') ? 'warning' : 'info'
    }));

    return { logs, timestamp: new Date().toISOString() };
  } catch (error) {
    throw new Error(`Failed to get logs: ${error.message}`);
  }
}

/**
 * Get network statistics
 */
async function getNetworkStats(device) {
  try {
    const output = await executeCommand(device, 'cat /proc/net/dev');
    const lines = output.trim().split('\n');
    
    const interfaces = [];
    
    // Skip first two header lines
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/\s+/);
      const ifaceName = parts[0].replace(':', '');
      
      if (ifaceName === 'lo') continue; // Skip loopback
      
      interfaces.push({
        name: ifaceName,
        rxBytes: parseInt(parts[1]) || 0,
        rxPackets: parseInt(parts[2]) || 0,
        txBytes: parseInt(parts[9]) || 0,
        txPackets: parseInt(parts[10]) || 0
      });
    }

    return { interfaces, timestamp: new Date().toISOString() };
  } catch (error) {
    throw new Error(`Failed to get network stats: ${error.message}`);
  }
}

module.exports = {
  executeCommand,
  checkDeviceStatus,
  getDiskUsage,
  getMemoryUsage,
  getCpuUsage,
  getAllMetrics,
  getSystemLogs,
  getNetworkStats
};


