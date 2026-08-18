import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

const statusConfig = {
  habilitado: { emoji: '🟢', label: 'HABILITADO', color: '#16a34a' },
  suspendido: { emoji: '🟡', label: 'SUSPENDIDO', color: '#eab308' },
  expulsado: { emoji: '🔴', label: 'EXPULSADO', color: '#dc2626' },
  baja: { emoji: '⚫', label: 'DADO DE BAJA', color: '#6b7280' },
}

function PlayerVerification() {
  const { shortId } = useParams()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [scanInfo, setScanInfo] = useState(null)

  useEffect(() => {
    loadPlayer()
  }, [shortId])

  async function loadPlayer() {
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*, teams(name)')
      .eq('short_id', shortId)
      .single()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setPlayer(data)
    setLoading(false)

    // Buscar el último escaneo ANTES de registrar este
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentScans } = await supabase
      .from('scans')
      .select('scanned_at')
      .eq('player_id', data.id)
      .gte('scanned_at', oneDayAgo)
      .order('scanned_at', { ascending: false })

    if (recentScans && recentScans.length > 0) {
      const lastScan = new Date(recentScans[0].scanned_at)
      const minutesAgo = Math.round((Date.now() - lastScan.getTime()) / 60000)
      setScanInfo({ count: recentScans.length, minutesAgo })
    }

    // Registrar este escaneo
    supabase.from('scans').insert([{ player_id: data.id }]).then(({ error: scanError }) => {
      if (scanError) console.warn('No se pudo registrar el escaneo', scanError)
    })
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: 60 }}>Cargando...</div>

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', marginTop: 60, fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: 28 }}>⚠️ JUGADOR NO ENCONTRADO</h1>
        <p>No pertenece al registro del torneo</p>
      </div>
    )
  }

  const status = statusConfig[player.status]
  const isSuspicious = scanInfo && scanInfo.count >= 3 && scanInfo.minutesAgo < 120

  return (
    <div style={{
      maxWidth: 380, margin: '40px auto', padding: 24,
      fontFamily: 'sans-serif', textAlign: 'center',
      border: '1px solid #ddd', borderRadius: 12
    }}>
      <h2 style={{ marginBottom: 4 }}>VERIFICACIÓN DE JUGADOR</h2>

      <div style={{
        display: 'inline-block', padding: '8px 20px', borderRadius: 20,
        background: status.color, color: 'white', fontWeight: 'bold',
        margin: '16px 0'
      }}>
        {status.emoji} {status.label}
      </div>

      {player.photo_url && (
        <div>
          <img src={player.photo_url} alt="Foto"
            style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', margin: '12px 0' }} />
        </div>
      )}

      <h3 style={{ margin: '8px 0' }}>{player.first_name} {player.last_name}</h3>
      <p style={{ margin: 4, color: '#555' }}>{player.teams?.name}</p>
      <p style={{ margin: 4, color: '#555' }}>N.º {player.jersey_number}</p>
      <p style={{ margin: 4, color: '#999', fontSize: 13 }}>Jugador ID: {player.short_id}</p>

      {scanInfo && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 8,
          background: isSuspicious ? '#fef2f2' : '#f8fafc',
          border: `1px solid ${isSuspicious ? '#fca5a5' : '#e2e8f0'}`,
          fontSize: 13, color: isSuspicious ? '#b91c1c' : '#64748b'
        }}>
          {isSuspicious && <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Verificar identidad</div>}
          Escaneado {scanInfo.count} {scanInfo.count === 1 ? 'vez' : 'veces'} en las últimas 24hs
          {scanInfo.minutesAgo < 60
            ? ` — último hace ${scanInfo.minutesAgo} min`
            : ` — último hace ${Math.round(scanInfo.minutesAgo / 60)}hs`}
        </div>
      )}
    </div>
  )
}

export default PlayerVerification