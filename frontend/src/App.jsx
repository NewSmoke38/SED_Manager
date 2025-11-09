import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DeviceDetail from './pages/DeviceDetail'
import Terminal from './pages/Terminal'
import './App.css'
import AuthModal from './components/AuthModal'
import { AuthProvider, useAuth } from './context/AuthContext'

function Header() {
  const { user, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const openAuth = (mode) => {
    setAuthMode(mode)
    setShowAuth(true)
  }

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">🔐</span>
            Secure Edge Device Manager
          </h1>
          <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/" className="nav-link">Dashboard</Link>
            {!user && (
              <>
                <button className="btn btn-secondary" onClick={() => openAuth('login')}>Login</button>
                <button className="btn btn-primary" onClick={() => openAuth('signup')}>Sign Up</button>
              </>
            )}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-online">
                  <span className="status-dot"></span>
                  Signed in: {user.fullName || user.username}
                </span>
                <button className="btn btn-secondary" onClick={logout}>Logout</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/device/:id" element={<DeviceDetail />} />
              <Route path="/device/:id/terminal" element={<Terminal />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App


