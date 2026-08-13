import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function PlayerRegistration() {
  const [teams, setTeams] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', dni: '', birth_date: '',
    team_id: '', jersey_number: '', position: ''
  })

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').order('name')
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

    const { error } = await supabase.from('players').insert([{
      ...form,
      jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
      photo_url
    }])

    setSaving(false)

    if (error) { alert('Error: ' + error.message); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>✅ Registro enviado</h2>
        <p>Tus datos fueron cargados correctamente. La organización va a revisar tu inscripción.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Registro de Jugador</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input placeholder="Nombre" value={form.first_name}
          onChange={e => setForm({ ...form, first_name: e.target.value })} required />
        <input placeholder="Apellido" value={form.last_name}
          onChange={e => setForm({ ...form, last_name: e.target.value })} required />
        <input placeholder="DNI" value={form.dni}
          onChange={e => setForm({ ...form, dni: e.target.value })} required />
        <input type="date" value={form.birth_date}
          onChange={e => setForm({ ...form, birth_date: e.target.value })} required />
        <select value={form.team_id}
          onChange={e => setForm({ ...form, team_id: e.target.value })} required>
          <option value="">Seleccionar equipo</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input placeholder="Número de camiseta" type="number" value={form.jersey_number}
          onChange={e => setForm({ ...form, jersey_number: e.target.value })} />
        <input placeholder="Posición" value={form.position}
          onChange={e => setForm({ ...form, position: e.target.value })} />
        <label style={{ fontSize: 14, color: '#555' }}>Foto (obligatoria)</label>
        <input type="file" accept="image/*" required
          onChange={e => setPhotoFile(e.target.files[0])} />
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Enviar registro'}
        </button>
      </form>
    </div>
  )
}

export default PlayerRegistration