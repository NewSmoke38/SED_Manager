import React, { useState } from 'react'
import { X, Plus, Server, Monitor } from 'lucide-react'
import './AddDeviceModal.css'

function AddDeviceModal({ isOpen, onClose, onDeviceAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          port: parseInt(formData.port)
        })
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          host: '',
          port: '',
          username: '',
          password: '',
          description: ''
        })
        onDeviceAdded()
        onClose()
      } else {
        setError(result.message || 'Failed to add device')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Test data helpers
  const fillLinuxTest = () => {
    setFormData({
      name: 'Test Linux Device',
      host: 'localhost',
      port: '2222',
      username: 'root',
      password: 'toor',
      description: 'Docker Linux edge device for testing'
    })
  }

  const fillWindowsTest = () => {
    setFormData({
      name: 'Test Windows Device',
      host: '192.168.0.142',
      port: '22',
      username: 'Gaurav Sharma',
      password: 'ReynaSage11@',
      description: 'Windows laptop with OpenSSH for testing'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Plus size={24} />
            Add New Device
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Test Buttons */}
        <div className="test-buttons">
          <button 
            type="button" 
            className="test-btn test-btn-linux"
            onClick={fillLinuxTest}
          >
            <Server size={18} />
            Fill Linux Test Data
          </button>
          <button 
            type="button" 
            className="test-btn test-btn-windows"
            onClick={fillWindowsTest}
          >
            <Monitor size={18} />
            Fill Windows Test Data
          </button>
        </div>

        <form onSubmit={handleSubmit} className="device-form">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Device Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Production Server 1"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="host">Host / IP Address *</label>
              <input
                type="text"
                id="host"
                name="host"
                value={formData.host}
                onChange={handleChange}
                placeholder="e.g., 192.168.1.100 or localhost"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="port">SSH Port *</label>
              <input
                type="number"
                id="port"
                name="port"
                value={formData.port}
                onChange={handleChange}
                placeholder="22"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g., root, admin"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter SSH password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description of this device"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDeviceModal

