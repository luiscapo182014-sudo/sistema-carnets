import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { generateCarnet } from './generateCarnet'

function PlayerRegistration() {
  const [teams, setTeams] = useState([])
  const [tournament, setTournament] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', dni: '', birth_date: '',
    team_id: '', jersey_number: '', position: ''
  })

  useEffect(() => {
    loadTeams()
    loadTournament()
  }, [])

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').order('name')
    setTeams(data || [])
  }

  async function loadTournament() {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1).single()
    setTournament(data || null)
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
      await generateCarnet(inserted, teamName)
    } catch (e) {
      console.warn('No se pudo generar el carnet automáticamente', e)
    }

    setSubmitted(true)
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      padding: '40px 16px',
    },
    card: {
      maxWidth: 420,
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: 16,
      padding: 32,
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    },
    logo: {
      display: 'block',
      margin: '0 auto 16px',
      width: 80,
      height: 80,
      objectFit: 'contain',
    },
    title: {
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 700,
      color: '#0f172a',
      margin: '0 0 4px',
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 14,
      color: '#64748b',
      margin: '0 0 24px',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      fontSize: 15,
      marginBottom: 12,
      boxSizing: 'border-box',
      outline: 'none',
    },
    label: {
      fontSize: 13,
      color: '#475569',
      marginBottom: 6,
      display: 'block',
      fontWeight: 600,
    },
    button: {
      width: '100%',
      padding: 14,
      borderRadius: 8,
      border: 'none',
      background: '#0f172a',
      color: 'white',
      fontSize: 16,
      fontWeight: 700,
      cursor: 'pointer',
      marginTop: 8,
    },
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <h2 style={styles.title}>Registro enviado</h2>
          <p style={{ color: '#475569' }}>Tu carnet se descargó automáticamente. La organización va a revisar tu inscripción.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {tournament?.logo_url && (
          <img src={tournament.logo_url} alt="Logo del torneo" style={styles.logo} />
        )}
        <h2 style={styles.title}>{tournament?.name || 'Registro de Jugador'}</h2>
        <p style={styles.subtitle}>Completá tus datos para inscribirte</p>

        <form onSubmit={handleSubmit}>
          <input style={styles.input} placeholder="Nombre" value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })} required />
          <input style={styles.input} placeholder="Apellido" value={form.last_name}
            onChange={e => setForm({ ...form, last_name: e.target.value })} required />
          <input style={styles.input} placeholder="DNI" value={form.dni}
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

          <input style={styles.input} placeholder="Número de camiseta" type="number" value={form.jersey_number}
            onChange={e => setForm({ ...form, jersey_number: e.target.value })} />
          <input style={styles.input} placeholder="Posición" value={form.position}
            onChange={e => setForm({ ...form, position: e.target.value })} />

          <label style={styles.label}>Foto (obligatoria)</label>
          <input style={{ marginBottom: 16 }} type="file" accept="image/*" required
            onChange={e => setPhotoFile(e.target.files[0])} />

          <button style={styles.button} type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Enviar registro'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PlayerRegistration