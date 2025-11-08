import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, HardDrive, Cpu, Server } from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [deviceMetrics, setDeviceMetrics] = useState({})

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      const data = await response.json()
      setDevices(data)
      
      // Fetch metrics for each device
      data.forEach(device => fetchDeviceMetrics(device.id))
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching devices:', error)
      setLoading(false)
    }
  }

  const fetchDeviceMetrics = async (deviceId) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/metrics`)
      const data = await response.json()
      setDeviceMetrics(prev => ({ ...prev, [deviceId]: data }))
    } catch (error) {
      console.error(`Error fetching metrics for device ${deviceId}:`, error)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Device Dashboard</h2>
        <p className="dashboard-subtitle">Monitor and manage your edge devices</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid grid grid-cols-4">
        <div className="summary-card card">
          <div className="summary-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
            <Server size={24} color="#3b82f6" />
          </div>
          <div className="summary-content">
            <div className="summary-value">{devices.length}</div>
            <div className="summary-label">Total Devices</div>
          </div>
        </div>

        <div className="summary-card card">
          <div className="summary-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <Activity size={24} color="#10b981" />
          </div>
          <div className="summary-content">
            <div className="summary-value">
              {Object.values(deviceMetrics).filter(m => m.status?.online).length}
            </div>
            <div className="summary-label">Online</div>
          </div>
        </div>

        <div className="summary-card card">
          <div className="summary-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <Activity size={24} color="#ef4444" />
          </div>
          <div className="summary-content">
            <div className="summary-value">
              {Object.values(deviceMetrics).filter(m => !m.status?.online).length}
            </div>
            <div className="summary-label">Offline</div>
          </div>
        </div>

        <div className="summary-card card">
          <div className="summary-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
            <Cpu size={24} color="#f59e0b" />
          </div>
          <div className="summary-content">
            <div className="summary-value">
              {Object.values(deviceMetrics).length > 0
                ? Math.round(
                    Object.values(deviceMetrics).reduce((sum, m) => {
                      const cpuPercent = parseInt(m.cpu?.usedPercent) || 0
                      return sum + cpuPercent
                    }, 0) / Object.values(deviceMetrics).length
                  )
                : 0}%
            </div>
            <div className="summary-label">Avg CPU</div>
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="devices-section">
        <h3>Devices</h3>
        <div className="grid grid-cols-1">
          {devices.map(device => {
            const metrics = deviceMetrics[device.id]
            const isOnline = metrics?.status?.online

            return (
              <div key={device.id} className="device-card card">
                <div className="device-card-header">
                  <div>
                    <h4 className="device-name">{device.name}</h4>
                    <p className="device-location">{device.host}:{device.port}</p>
                  </div>
                  <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                    <span className="status-dot"></span>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {metrics && isOnline && (
                  <div className="device-metrics">
                    <div className="metric">
                      <div className="metric-icon">
                        <Cpu size={18} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">CPU Usage</div>
                        <div className="metric-value">{metrics.cpu?.usedPercent || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-icon">
                        <Activity size={18} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">Memory</div>
                        <div className="metric-value">{metrics.memory?.usedPercent || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-icon">
                        <HardDrive size={18} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">Disk</div>
                        <div className="metric-value">
                          {metrics.disk?.filesystems?.[0]?.usedPercent || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="device-actions">
                  <Link to={`/device/${device.id}`} className="btn btn-primary">
                    View Details
                  </Link>
                  <Link to={`/device/${device.id}/terminal`} className="btn btn-secondary">
                    SSH Terminal
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard


