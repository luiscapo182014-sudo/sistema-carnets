import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { generateCarnet } from './generateCarnet'

function PlayerRegistration() {
  const { tournamentId } = useParams()
  const [teams, setTeams] = useState([])
  const [tournament, setTournament] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', dni: '', birth_date: '',
    team_id: '', jersey_number: '', position: ''
  })

  useEffect(() => {
    loadTournament()
    loadTeams()
  }, [tournamentId])

  async function loadTournament() {
    const { data, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single()
    if (error || !data) { setNotFound(true); return }
    setTournament(data)
  }

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId).order('name')
    setTeams(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    let photo_url = null

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, photoFile)

      if (uploadError) {
        alert('Error subiendo foto: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data } = supabase.storage.from('player-photos').getPublicUrl(fileName)
      photo_url = data.publicUrl
    }

    const { data: inserted, error } = await supabase.from('players').insert([{
      ...form,
      jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
      photo_url
    }]).select().single()

    setSaving(false)

    if (error) { alert('Error: ' + error.message); return }

    const teamName = teams.find(t => t.id === form.team_id)?.name

    try {
      await generateCarnet(inserted, teamName, tournament)
    } catch (e) {
      console.warn('No se pudo generar el carnet automáticamente', e)
    }

    setSubmitted(true)
  }

  const RED = '#c81e28'

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0d0d0d',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      padding: '32px 16px',
      position: 'relative',
      overflow: 'hidden',
    },
    diagonalRed: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '140%',
      height: 180,
      background: `linear-gradient(135deg, transparent 45%, ${RED} 46%, ${RED} 60%, transparent 61%)`,
      pointerEvents: 'none',
    },
    card: {
      maxWidth: 420,
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: 18,
      padding: '32px 28px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      position: 'relative',
      zIndex: 1,
    },
    logo: {
      display: 'block',
      margin: '0 auto 12px',
      width: 84,
      height: 84,
      objectFit: 'contain',
    },
    banner: {
      background: RED,
      color: '#fff',
      textAlign: 'center',
      fontWeight: 800,
      fontStyle: 'italic',
      fontSize: 18,
      letterSpacing: 1,
      padding: '10px 0',
      margin: '18px -28px 24px',
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 13,
      color: '#6b6b6b',
      margin: '-16px 0 22px',
    },
    label: {
      fontSize: 12,
      fontWeight: 700,
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      display: 'block',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 8,
      border: '1.5px solid #e5e5e5',
      fontSize: 15,
      marginBottom: 14,
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.15s',
    },
    fileWrap: {
      marginBottom: 20,
    },
    button: {
      width: '100%',
      padding: 15,
      borderRadius: 10,
      border: 'none',
      background: '#111111',
      color: 'white',
      fontSize: 16,
      fontWeight: 800,
      cursor: 'pointer',
      letterSpacing: 0.5,
      boxShadow: `0 4px 0 ${RED}`,
    },
  }

  if (notFound) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <h2 style={{ color: '#111' }}>Torneo no encontrado</h2>
          <p style={{ color: '#666' }}>El link de registro no es válido.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.diagonalRed} />
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⚽</div>
          <h2 style={{ color: '#111', margin: '0 0 8px' }}>¡Registro enviado!</h2>
          <p style={{ color: '#666' }}>Tu carnet se descargó automáticamente. La organización va a revisar tu inscripción.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.diagonalRed} />
      <div style={styles.card}>
        {tournament?.logo_url && (
          <img src={tournament.logo_url} alt="Logo del torneo" style={styles.logo} />
        )}
        <div style={styles.banner}>JUGADOR — REGISTRO</div>
        <p style={styles.subtitle}>Completá tus datos para inscribirte en {tournament?.name}</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nombre</label>
          <input style={styles.input} value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })} required />

          <label style={styles.label}>Apellido</label>
          <input style={styles.input} value={form.last_name}
            onChange={e => setForm({ ...form, last_name: e.target.value })} required />

          <label style={styles.label}>DNI</label>
          <input style={styles.input} value={form.dni}
            onChange={e => setForm({ ...form, dni: e.target.value })} required />

          <label style={styles.label}>Fecha de nacimiento</label>
          <input style={styles.input} type="date" value={form.birth_date}
            onChange={e => setForm({ ...form, birth_date: e.target.value })} required />

          <label style={styles.label}>Equipo</label>
          <select style={styles.input} value={form.team_id}
            onChange={e => setForm({ ...form, team_id: e.target.value })} required>
            <option value="">Seleccionar equipo</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <label style={styles.label}>Número de camiseta</label>
          <input style={styles.input} type="number" value={form.jersey_number}
            onChange={e => setForm({ ...form, jersey_number: e.target.value })} />

          <label style={styles.label}>Posición</label>
          <input style={styles.input} value={form.position}
            onChange={e => setForm({ ...form, position: e.target.value })} />

          <label style={styles.label}>Foto (obligatoria)</label>
          <div style={styles.fileWrap}>
            <input type="file" accept="image/*" required
              onChange={e => setPhotoFile(e.target.files[0])} />
          </div>

          <button style={styles.button} type="submit" disabled={saving}>
            {saving ? 'GUARDANDO...' : 'ENVIAR REGISTRO'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PlayerRegistration