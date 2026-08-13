import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './supabaseClient'
import { generateCarnet } from './generateCarnet'
import './App.css'

const statusOptions = ['habilitado', 'suspendido', 'expulsado', 'baja']

function App({ onLogout }) {
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])

  const [teamForm, setTeamForm] = useState({ name: '', delegate_name: '', delegate_contact: '' })
  const [playerForm, setPlayerForm] = useState({
    first_name: '', last_name: '', dni: '', birth_date: '',
    team_id: '', jersey_number: '', position: ''
  })
  const [photoFile, setPhotoFile] = useState(null)

  useEffect(() => {
    loadTeams()
    loadPlayers()
  }, [])

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').order('name')
    setTeams(data || [])
  }

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*, teams(name)').order('last_name')
    setPlayers(data || [])
  }

  async function createTeam(e) {
    e.preventDefault()
    const { error } = await supabase.from('teams').insert([teamForm])
    if (error) { alert('Error: ' + error.message); return }
    setTeamForm({ name: '', delegate_name: '', delegate_contact: '' })
    loadTeams()
  }

  async function createPlayer(e) {
    e.preventDefault()

    let photo_url = null

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, photoFile)

      if (uploadError) { alert('Error subiendo foto: ' + uploadError.message); return }

      const { data } = supabase.storage.from('player-photos').getPublicUrl(fileName)
      photo_url = data.publicUrl
    }

    const { error } = await supabase.from('players').insert([{
      ...playerForm,
      jersey_number: playerForm.jersey_number ? parseInt(playerForm.jersey_number) : null,
      photo_url
    }])
    if (error) { alert('Error: ' + error.message); return }
    setPlayerForm({ first_name: '', last_name: '', dni: '', birth_date: '', team_id: '', jersey_number: '', position: '' })
    setPhotoFile(null)
    loadPlayers()
  }

  async function updateStatus(playerId, newStatus) {
    const { error } = await supabase.from('players').update({ status: newStatus }).eq('id', playerId)
    if (error) { alert('Error: ' + error.message); return }
    loadPlayers()
  }

  const baseUrl = window.location.origin

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Sistema de Torneo</h1>
        <button onClick={onLogout}>Cerrar sesión</button>
      </div>

      <h2>Cargar Equipo</h2>
      <form onSubmit={createTeam} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
        <input placeholder="Nombre del equipo" value={teamForm.name}
          onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} required />
        <input placeholder="Delegado" value={teamForm.delegate_name}
          onChange={e => setTeamForm({ ...teamForm, delegate_name: e.target.value })} />
        <input placeholder="Contacto del delegado" value={teamForm.delegate_contact}
          onChange={e => setTeamForm({ ...teamForm, delegate_contact: e.target.value })} />
        <button type="submit">Guardar Equipo</button>
      </form>

      <h2>Cargar Jugador</h2>
      <form onSubmit={createPlayer} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
        <input placeholder="Nombre" value={playerForm.first_name}
          onChange={e => setPlayerForm({ ...playerForm, first_name: e.target.value })} required />
        <input placeholder="Apellido" value={playerForm.last_name}
          onChange={e => setPlayerForm({ ...playerForm, last_name: e.target.value })} required />
        <input placeholder="DNI" value={playerForm.dni}
          onChange={e => setPlayerForm({ ...playerForm, dni: e.target.value })} required />
        <input type="date" value={playerForm.birth_date}
          onChange={e => setPlayerForm({ ...playerForm, birth_date: e.target.value })} />
        <select value={playerForm.team_id}
          onChange={e => setPlayerForm({ ...playerForm, team_id: e.target.value })} required>
          <option value="">Seleccionar equipo</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input placeholder="Número de camiseta" type="number" value={playerForm.jersey_number}
          onChange={e => setPlayerForm({ ...playerForm, jersey_number: e.target.value })} />
        <input placeholder="Posición" value={playerForm.position}
          onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} />
        <input type="file" accept="image/*"
          onChange={e => setPhotoFile(e.target.files[0])} />
        <button type="submit">Guardar Jugador</button>
      </form>

      <h2>Jugadores cargados ({players.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {players.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            border: '1px solid #ddd', borderRadius: 8, padding: 12
          }}>
            <QRCodeSVG value={`${baseUrl}/jugador/${p.short_id}`} size={80} />
            {p.photo_url && (
              <img src={p.photo_url} alt="Foto"
                style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div style={{ flex: 1 }}>
              <strong>{p.first_name} {p.last_name}</strong><br />
              <span style={{ color: '#555', fontSize: 14 }}>
                {p.teams?.name} — #{p.jersey_number} — ID: {p.short_id}
              </span>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}>
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => generateCarnet(p, p.teams?.name)}>Descargar carnet</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App