import React, { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import './Terminal.css'

function Terminal() {
  const { id } = useParams()
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const wsRef = useRef(null)
  const fitAddonRef = useRef(null)
  const [device, setDevice] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDevice()
  }, [id])

  useEffect(() => {
    if (!device) return

    // Initialize XTerm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e293b',
        foreground: '#e2e8f0',
        cursor: '#3b82f6',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f1f5f9'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    term.open(terminalRef.current)
    fitAddon.fit()
    
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const handleResize = () => {
      fitAddon.fit()
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          rows: term.rows,
          cols: term.cols
        }))
      }
    }
    
    window.addEventListener('resize', handleResize)

    connectWebSocket(term, device)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (wsRef.current) {
        wsRef.current.close()
      }
      term.dispose()
    }
  }, [device])

  const fetchDevice = async () => {
    try {
      const response = await fetch(`/api/devices/${id}`)
      const data = await response.json()
      setDevice(data)
    } catch (error) {
      console.error('Error fetching device:', error)
      setError('Failed to load device information')
    }
  }

  const connectWebSocket = (term, device) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001`)
    
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      term.writeln('\x1b[1;32m>>> Connecting to device...\x1b[0m\r\n')
      
      // Send connection request
      ws.send(JSON.stringify({
        type: 'connect',
        host: device.host,
        port: device.port,
        username: device.username,
        password: device.password
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'status') {
        if (data.status === 'connected') {
          setConnected(true)
          setError(null)
          term.writeln('\x1b[1;32m>>> Connected successfully!\x1b[0m\r\n')
        } else if (data.status === 'disconnected') {
          setConnected(false)
          term.writeln('\r\n\x1b[1;31m>>> Disconnected from device\x1b[0m\r\n')
        }
      } else if (data.type === 'data') {
        term.write(data.data)
      } else if (data.type === 'error') {
        setError(data.error)
        term.writeln(`\r\n\x1b[1;31m>>> Error: ${data.error}\x1b[0m\r\n`)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('WebSocket connection error')
      term.writeln('\r\n\x1b[1;31m>>> Connection error\x1b[0m\r\n')
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setConnected(false)
      term.writeln('\r\n\x1b[1;31m>>> Connection closed\x1b[0m\r\n')
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }))
      }
    })
  }

  return (
    <div className="terminal-page">
      <div className="terminal-header">
        <Link to={`/device/${id}`} className="back-button">
          <ArrowLeft size={20} />
          Back to Device
        </Link>
        <div className="terminal-header-content">
          <div>
            <h2>SSH Terminal</h2>
            <p className="terminal-subtitle">{device?.name} - {device?.host}:{device?.port}</p>
          </div>
          <div className="terminal-status">
            <span className={`badge ${connected ? 'badge-online' : 'badge-offline'}`}>
              <span className="status-dot"></span>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="terminal-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="terminal-container card">
        <div ref={terminalRef} className="terminal"></div>
      </div>

      <div className="terminal-info card">
        <h3>Terminal Tips</h3>
        <ul>
          <li>Use <code>df -h</code> to check disk usage</li>
          <li>Use <code>free -m</code> to check memory usage</li>
          <li>Use <code>top</code> to view running processes (press 'q' to quit)</li>
          <li>Use <code>exit</code> to close the SSH connection</li>
        </ul>
      </div>
    </div>
  )
}

export default Terminal


