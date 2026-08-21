import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';

const TOURNAMENT_ID = 2; // Torneo Amigos del Norte (ADN)

function DashboardADN() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalUnicos, setTotalUnicos] = useState(0);
  const [totalEscaneos, setTotalEscaneos] = useState(0);
  const [listaJugadores, setListaJugadores] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      // 1. Traer los equipos del torneo ADN
      const { data: equipos, error: errEquipos } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tournament_id', TOURNAMENT_ID);

      if (errEquipos) throw errEquipos;

      const equipoIds = (equipos || []).map((e) => e.id);
      const nombreEquipoPorId = {};
      (equipos || []).forEach((e) => {
        nombreEquipoPorId[e.id] = e.name;
      });

      if (equipoIds.length === 0) {
        setTotalUnicos(0);
        setTotalEscaneos(0);
        setListaJugadores([]);
        setUltimaActualizacion(new Date());
        setLoading(false);
        return;
      }

      // 2. Traer los jugadores de esos equipos
      const { data: jugadores, error: errJugadores } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_id')
        .in('team_id', equipoIds);

      if (errJugadores) throw errJugadores;

      const jugadorPorId = {};
      (jugadores || []).forEach((j) => {
        jugadorPorId[j.id] = j;
      });

      const jugadorIds = (jugadores || []).map((j) => j.id);

      if (jugadorIds.length === 0) {
        setTotalUnicos(0);
        setTotalEscaneos(0);
        setListaJugadores([]);
        setUltimaActualizacion(new Date());
        setLoading(false);
        return;
      }

      // 3. Calcular el inicio del día de hoy (hora local del navegador)
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);

      // 4. Traer los escaneos de hoy para esos jugadores
      const { data: escaneos, error: errEscaneos } = await supabase
        .from('scans')
        .select('player_id, scanned_at')
        .in('player_id', jugadorIds)
        .gte('scanned_at', inicioHoy.toISOString())
        .order('scanned_at', { ascending: true });

      if (errEscaneos) throw errEscaneos;

      setTotalEscaneos((escaneos || []).length);

      // 5. Quedarnos con la PRIMERA vez que se escaneó cada jugador hoy
      const primerEscaneoPorJugador = {};
      (escaneos || []).forEach((s) => {
        if (!primerEscaneoPorJugador[s.player_id]) {
          primerEscaneoPorJugador[s.player_id] = s.scanned_at;
        }
      });

      const idsUnicos = Object.keys(primerEscaneoPorJugador);
      setTotalUnicos(idsUnicos.length);

      // 6. Armar la lista para mostrar en la tabla
      const lista = idsUnicos.map((id) => {
        const jugador = jugadorPorId[id];
        return {
          id,
          nombre: jugador
            ? `${jugador.first_name} ${jugador.last_name}`
            : 'Jugador desconocido',
          equipo: jugador ? nombreEquipoPorId[jugador.team_id] || '-' : '-',
          hora: new Date(primerEscaneoPorJugador[id]).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          horaOrden: primerEscaneoPorJugador[id],
        };
      });

      lista.sort((a, b) => new Date(b.horaOrden) - new Date(a.horaOrden));

      setListaJugadores(lista);
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al cargar los datos. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d0d0d',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <Link
            to="/"
            style={{
              color: '#e63946',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            ← Volver al panel
          </Link>
          <button
            onClick={cargarDatos}
            style={{
              backgroundColor: '#e63946',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Actualizar
          </button>
        </div>

        <h1 style={{ marginBottom: '5px' }}>Ingresos - Torneo ADN</h1>
        <p style={{ color: '#999', marginBottom: '25px' }}>
          Hoy, {new Date().toLocaleDateString('es-AR')}
        </p>

        {loading && <p>Cargando datos...</p>}
        {error && <p style={{ color: '#e63946' }}>{error}</p>}

        {!loading && !error && (
          <>
            <div
              style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '30px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  flex: '1',
                  minWidth: '150px',
                  backgroundColor: '#1a1a1a',
                  border: '2px solid #e63946',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#e63946' }}>
                  {totalUnicos}
                </div>
                <div style={{ color: '#ccc', marginTop: '5px' }}>
                  Personas dentro (únicas)
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  minWidth: '150px',
                  backgroundColor: '#1a1a1a',
                  border: '2px solid #444',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '42px', fontWeight: 'bold' }}>
                  {totalEscaneos}
                </div>
                <div style={{ color: '#ccc', marginTop: '5px' }}>
                  Escaneos totales hoy
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#e63946' }}>
              Detalle de ingresos de hoy
            </h2>

            {listaJugadores.length === 0 && (
              <p style={{ color: '#999' }}>Todavía no hay escaneos registrados hoy.</p>
            )}

            {listaJugadores.length > 0 && (
              <div
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {listaJugadores.map((j, idx) => (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom:
                        idx === listaJugadores.length - 1 ? 'none' : '1px solid #2a2a2a',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{j.nombre}</div>
                      <div style={{ color: '#999', fontSize: '13px' }}>{j.equipo}</div>
                    </div>
                    <div style={{ color: '#e63946', fontWeight: 'bold' }}>{j.hora}</div>
                  </div>
                ))}
              </div>
            )}

            {ultimaActualizacion && (
              <p style={{ color: '#666', fontSize: '12px', marginTop: '15px' }}>
                Última actualización: {ultimaActualizacion.toLocaleTimeString('es-AR')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardADN;