import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './supabaseClient'
import { generateCarnet } from './generateCarnet'
import './App.css'

const statusOptions = ['habilitado', 'suspendido', 'expulsado', 'baja']
const RED = '#c81e28'

const statusColors = {
  habilitado: '#16a34a',
  suspendido: '#eab308',
  expulsado: '#dc2626',
  baja: '#6b7280',
}

function App({ onLogout }) {
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

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

  async function deletePlayer(playerId, playerName) {
    if (!confirm(`¿Seguro que querés eliminar a ${playerName}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) { alert('Error: ' + error.message); return }
    loadPlayers()
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      dni: p.dni || '',
      birth_date: p.birth_date || '',
      team_id: p.team_id || '',
      jersey_number: p.jersey_number || '',
      position: p.position || ''
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function saveEdit(playerId) {
    const { error } = await supabase.from('players').update({
      ...editForm,
      jersey_number: editForm.jersey_number ? parseInt(editForm.jersey_number) : null
    }).eq('id', playerId)
    if (error) { alert('Error: ' + error.message); return }
    setEditingId(null)
    setEditForm({})
    loadPlayers()
  }

  const baseUrl = window.location.origin

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#0d0d0d',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      padding: '0 0 60px',
    },
    header: {
      background: RED,
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 800,
      fontStyle: 'italic',
      margin: 0,
      letterSpacing: 0.5,
    },
    logoutBtn: {
      background: 'rgba(0,0,0,0.25)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '8px 16px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 13,
    },
    container: {
      maxWidth: 760,
      margin: '0 auto',
      padding: '28px 20px 0',
    },
    section: {
      background: '#1a1a1a',
      borderRadius: 14,
      padding: 24,
      marginBottom: 24,
      border: '1px solid #2a2a2a',
    },
    sectionTitle: {
      color: '#fff',
      fontSize: 15,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      margin: '0 0 18px',
      borderLeft: `4px solid ${RED}`,
      paddingLeft: 10,
    },
    input: {
      width: '100%',
      padding: '11px 13px',
      borderRadius: 8,
      border: '1px solid #333',
      background: '#0d0d0d',
      color: '#fff',
      fontSize: 14,
      marginBottom: 10,
      boxSizing: 'border-box',
      outline: 'none',
    },
    button: {
      width: '100%',
      padding: 13,
      borderRadius: 8,
      border: 'none',
      background: RED,
      color: 'white',
      fontSize: 14,
      fontWeight: 800,
      cursor: 'pointer',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    playerCard: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      background: '#0d0d0d',
      border: '1px solid #2a2a2a',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    playerName: {
      color: '#fff',
      fontWeight: 700,
      fontSize: 15,
    },
    playerMeta: {
      color: '#888',
      fontSize: 12.5,
    },
    select: {
      background: '#1a1a1a',
      color: '#fff',
      border: '1px solid #333',
      borderRadius: 6,
      padding: '5px 8px',
      fontSize: 12,
    },
    smallBtn: {
      background: '#2a2a2a',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '5px 10px',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
    },
    statusBadge: (status) => ({
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: statusColors[status] || '#888',
      marginRight: 6,
    }),
    editInput: {
      width: '100%',
      padding: '8px 10px',
      borderRadius: 6,
      border: '1px solid #333',
      background: '#1a1a1a',
      color: '#fff',
      fontSize: 13,
      marginBottom: 8,
      boxSizing: 'border-box',
    },
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>PANEL DE ADMINISTRACIÓN</h1>
        <button style={styles.logoutBtn} onClick={onLogout}>CERRAR SESIÓN</button>
      </div>

      <div style={styles.container}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Cargar Equipo</h2>
          <form onSubmit={createTeam}>
            <input style={styles.input} placeholder="Nombre del equipo" value={teamForm.name}
              onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} required />
            <input style={styles.input} placeholder="Delegado" value={teamForm.delegate_name}
              onChange={e => setTeamForm({ ...teamForm, delegate_name: e.target.value })} />
            <input style={styles.input} placeholder="Contacto del delegado" value={teamForm.delegate_contact}
              onChange={e => setTeamForm({ ...teamForm, delegate_contact: e.target.value })} />
            <button style={styles.button} type="submit">Guardar Equipo</button>
          </form>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Cargar Jugador</h2>
          <form onSubmit={createPlayer}>
            <input style={styles.input} placeholder="Nombre" value={playerForm.first_name}
              onChange={e => setPlayerForm({ ...playerForm, first_name: e.target.value })} required />
            <input style={styles.input} placeholder="Apellido" value={playerForm.last_name}
              onChange={e => setPlayerForm({ ...playerForm, last_name: e.target.value })} required />
            <input style={styles.input} placeholder="DNI" value={playerForm.dni}
              onChange={e => setPlayerForm({ ...playerForm, dni: e.target.value })} required />
            <input style={styles.input} type="date" value={playerForm.birth_date}
              onChange={e => setPlayerForm({ ...playerForm, birth_date: e.target.value })} />
            <select style={styles.input} value={playerForm.team_id}
              onChange={e => setPlayerForm({ ...playerForm, team_id: e.target.value })} required>
              <option value="">Seleccionar equipo</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input style={styles.input} placeholder="Número de camiseta" type="number" value={playerForm.jersey_number}
              onChange={e => setPlayerForm({ ...playerForm, jersey_number: e.target.value })} />
            <input style={styles.input} placeholder="Posición" value={playerForm.position}
              onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} />
            <input style={{ ...styles.input, padding: '8px 0' }} type="file" accept="image/*"
              onChange={e => setPhotoFile(e.target.files[0])} />
            <button style={styles.button} type="submit">Guardar Jugador</button>
          </form>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Jugadores cargados ({players.length})</h2>
          {players.map(p => (
            <div key={p.id} style={styles.playerCard}>
              {editingId !== p.id && (
                <>
                  <QRCodeSVG value={`${baseUrl}/jugador/${p.short_id}`} size={56} />
                  {p.photo_url && (
                    <img src={p.photo_url} alt="Foto"
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                </>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === p.id ? (
                  <div>
                    <input style={styles.editInput} placeholder="Nombre" value={editForm.first_name}
                      onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                    <input style={styles.editInput} placeholder="Apellido" value={editForm.last_name}
                      onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                    <input style={styles.editInput} placeholder="DNI" value={editForm.dni}
                      onChange={e => setEditForm({ ...editForm, dni: e.target.value })} />
                    <input style={styles.editInput} type="date" value={editForm.birth_date}
                      onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })} />
                    <select style={styles.editInput} value={editForm.team_id}
                      onChange={e => setEditForm({ ...editForm, team_id: e.target.value })}>
                      <option value="">Seleccionar equipo</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input style={styles.editInput} placeholder="Número de camiseta" type="number" value={editForm.jersey_number}
                      onChange={e => setEditForm({ ...editForm, jersey_number: e.target.value })} />
                    <input style={styles.editInput} placeholder="Posición" value={editForm.position}
                      onChange={e => setEditForm({ ...editForm, position: e.target.value })} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button style={{ ...styles.smallBtn, background: '#16a34a', flex: 1 }} onClick={() => saveEdit(p.id)}>
                        Guardar
                      </button>
                      <button style={{ ...styles.smallBtn, flex: 1 }} onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={styles.playerName}>{p.first_name} {p.last_name}</div>
                    <div style={styles.playerMeta}>
                      {p.teams?.name} — #{p.jersey_number} — ID: {p.short_id}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={styles.statusBadge(p.status)} />
                      <select style={styles.select} value={p.status} onChange={e => updateStatus(p.id, e.target.value)}>
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button style={styles.smallBtn} onClick={() => generateCarnet(p, p.teams?.name)}>
                        Descargar carnet
                      </button>
                      <button style={styles.smallBtn} onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button style={{ ...styles.smallBtn, background: '#dc2626' }}
                        onClick={() => deletePlayer(p.id, `${p.first_name} ${p.last_name}`)}>
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App