import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DeviceDetail from './pages/DeviceDetail'
import Terminal from './pages/Terminal'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="logo">
              <span className="logo-icon">🔐</span>
              Secure Edge Device Manager
            </h1>
            <nav className="nav">
              <Link to="/" className="nav-link">Dashboard</Link>
            </nav>
          </div>
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/device/:id" element={<DeviceDetail />} />
            <Route path="/device/:id/terminal" element={<Terminal />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App


