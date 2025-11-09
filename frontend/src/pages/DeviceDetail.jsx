import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Activity, HardDrive, Cpu, FileText, Terminal, Shield } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './DeviceDetail.css'

function DeviceDetail() {
  const { id } = useParams()
  const [device, setDevice] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyData, setHistoryData] = useState([])
  const [firewallLoading, setFirewallLoading] = useState(null)
  const [firewallStatus, setFirewallStatus] = useState(null)
  const [firewallMessage, setFirewallMessage] = useState(null)
  const [firewallError, setFirewallError] = useState(null)

  const isWindowsDevice = useMemo(() => {
    if (!metrics?.disk?.filesystems) return false
    return metrics.disk.filesystems.some(fs => typeof fs.filesystem === 'string' && fs.filesystem.includes(':'))
  }, [metrics])

  useEffect(() => {
    fetchDevice()
    fetchMetrics()
    fetchLogs()
    
    const interval = setInterval(() => {
      fetchMetrics()
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [id])

  const fetchDevice = async () => {
    try {
      const response = await fetch(`/api/devices/${id}`)
      const result = await response.json()
      setDevice(result.data || null)
    } catch (error) {
      console.error('Error fetching device:', error)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/devices/${id}/metrics`)
      const result = await response.json()
      const metricsData = result.data || {}
      setMetrics(metricsData)
      
      // Add to history for charts
      setHistoryData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: parseInt(metricsData.cpu?.usedPercent) || 0,
          memory: parseInt(metricsData.memory?.usedPercent) || 0,
        }]
        // Keep only last 20 data points
        return newData.slice(-20)
      })
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/devices/${id}/logs`)
      const result = await response.json()
      setLogs(result.data?.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const handleFirewallAction = async (action) => {
    if (!device) return
    setFirewallLoading(action)
    setFirewallError(null)
    setFirewallMessage(null)

    try {
      const response = await fetch(`/api/devices/${id}/windows/firewall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          profile: 'all'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to update firewall')
      }

      setFirewallStatus(result?.data?.parsedStatus || null)
      setFirewallMessage(result?.message || `Firewall ${action}d successfully`)
    } catch (error) {
      setFirewallError(error.message)
    } finally {
      setFirewallLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  const isOnline = metrics?.status?.online

  const renderFirewallProfiles = () => {
    if (!firewallStatus) return null

    const profiles = Object.entries(firewallStatus)
    if (!profiles.length) return null

    return (
      <div className="firewall-status">
        {profiles.map(([profile, info]) => (
          <div key={profile} className="firewall-status-row">
            <span className="firewall-profile">{profile}</span>
            <span className={`firewall-state firewall-state-${info?.state === 'on' ? 'on' : 'off'}`}>
              {info?.state || 'unknown'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="device-detail">
      <div className="detail-header">
        <Link to="/" className="back-button">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <div className="detail-header-content">
          <div>
            <h2>{device?.name}</h2>
            <p className="device-connection">{device?.host}:{device?.port}</p>
          </div>
          <div className="detail-header-actions">
            <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
              <span className="status-dot"></span>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <Link to={`/device/${id}/terminal`} className="btn btn-primary">
              <Terminal size={18} />
              Open Terminal
            </Link>
            {isWindowsDevice && (
              <div className="firewall-controls">
                <button
                  className="btn btn-secondary"
                  disabled={!isOnline || firewallLoading === 'enable'}
                  onClick={() => handleFirewallAction('enable')}
                >
                  <Shield size={16} />
                  {firewallLoading === 'enable' ? 'Enabling...' : 'Enable Firewall'}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!isOnline || firewallLoading === 'disable'}
                  onClick={() => handleFirewallAction('disable')}
                >
                  <Shield size={16} />
                  {firewallLoading === 'disable' ? 'Disabling...' : 'Disable Firewall'}
                </button>
              </div>
            )}
          </div>
        </div>
        {(firewallMessage || firewallError || firewallStatus) && (
          <div className="firewall-feedback">
            {firewallMessage && <div className="firewall-message success">{firewallMessage}</div>}
            {firewallError && <div className="firewall-message error">{firewallError}</div>}
            {renderFirewallProfiles()}
          </div>
        )}
      </div>

      {isOnline && metrics && (
        <>
          {/* Real-time Charts */}
          <div className="charts-section">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Cpu size={20} />
                  CPU & Memory Usage
                </h3>
              </div>
              <div className="card-content">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="CPU %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Memory %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2">
            {/* CPU Details */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Cpu size={20} />
                  CPU Information
                </h3>
              </div>
              <div className="card-content">
                <div className="metric-details">
                  <div className="metric-row">
                    <span className="metric-label">Usage</span>
                    <span className="metric-value">{metrics.cpu?.usedPercent}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">User</span>
                    <span className="metric-value">{metrics.cpu?.userPercent}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">System</span>
                    <span className="metric-value">{metrics.cpu?.systemPercent}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Load Average (1m)</span>
                    <span className="metric-value">{metrics.cpu?.loadAverage?.['1min']}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Load Average (5m)</span>
                    <span className="metric-value">{metrics.cpu?.loadAverage?.['5min']}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Details */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Activity size={20} />
                  Memory Information
                </h3>
              </div>
              <div className="card-content">
                <div className="metric-details">
                  <div className="metric-row">
                    <span className="metric-label">Usage</span>
                    <span className="metric-value">{metrics.memory?.usedPercent}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Total</span>
                    <span className="metric-value">{metrics.memory?.total}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Used</span>
                    <span className="metric-value">{metrics.memory?.used}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Free</span>
                    <span className="metric-value">{metrics.memory?.free}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Available</span>
                    <span className="metric-value">{metrics.memory?.available}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <HardDrive size={20} />
                Disk Usage
              </h3>
            </div>
            <div className="card-content">
              <div className="disk-list">
                {metrics.disk?.filesystems?.map((fs, index) => (
                  <div key={index} className="disk-item">
                    <div className="disk-info">
                      <div className="disk-name">{fs.filesystem}</div>
                      <div className="disk-mount">{fs.mountedOn}</div>
                    </div>
                    <div className="disk-stats">
                      <div className="disk-bar">
                        <div 
                          className="disk-bar-fill" 
                          style={{ width: fs.usedPercent }}
                        ></div>
                      </div>
                      <div className="disk-values">
                        <span>{fs.used} / {fs.size}</span>
                        <span className="disk-percent">{fs.usedPercent}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Processes */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Activity size={20} />
                Top Processes
              </h3>
            </div>
            <div className="card-content">
              <div className="process-table">
                <table>
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>User</th>
                      <th>CPU %</th>
                      <th>Memory %</th>
                      <th>Command</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.cpu?.processes?.map((proc, index) => (
                      <tr key={index}>
                        <td>{proc.pid}</td>
                        <td>{proc.user}</td>
                        <td>{proc.cpu}</td>
                        <td>{proc.memory}</td>
                        <td className="process-command">{proc.command}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* System Logs */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={20} />
                System Logs
              </h3>
            </div>
            <div className="card-content">
              <div className="logs-container">
                {logs.slice(-20).reverse().map((log, index) => (
                  <div key={index} className={`log-entry log-${log.level}`}>
                    <span className="log-level">{log.level}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!isOnline && (
        <div className="offline-message card">
          <Activity size={48} color="#ef4444" />
          <h3>Device Offline</h3>
          <p>Unable to connect to this device. Please check if the device is running.</p>
        </div>
      )}
    </div>
  )
}

export default DeviceDetail


