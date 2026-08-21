import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PlayerVerification from './PlayerVerification.jsx'
import Login from './Login.jsx'
import PlayerRegistration from './PlayerRegistration.jsx'
import DashboardADN from './DashboardADN.jsx'
import { supabase } from './supabaseClient.js'

function Root() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: 60 }}>Cargando...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          session ? <App onLogout={handleLogout} /> : <Login onLogin={setSession} />
        } />
        <Route path="/jugador/:shortId" element={<PlayerVerification />} />
        <Route path="/registro/:tournamentId" element={<PlayerRegistration />} />
        <Route path="/dashboard-adn" element={
          session ? <DashboardADN /> : <Login onLogin={setSession} />
        } />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)