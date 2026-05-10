import { useState } from 'react'

const OPCIONES_AYUDA = [
  { id: 1, icono: '🏥', etiqueta: 'Emergencia\nmédica', color: '#dc2626' },
  { id: 2, icono: '👨‍👩‍👧', etiqueta: 'Avisar a\nmi familia', color: '#2563eb' },
  { id: 3, icono: '🚒', etiqueta: 'Bomberos\n/ Incendio', color: '#e07b10' },
  { id: 4, icono: '🚔', etiqueta: 'Policía\n/ Seguridad', color: '#4a2d7a' },
]

export default function PantallaNecesitoAyuda() {
  const [confirmando, setConfirmando] = useState(null)
  const [ayudaEnviada, setAyudaEnviada] = useState(false)

  function confirmarOpcion(opcion) {
    setConfirmando(opcion)
  }

  function enviarAyuda() {
    setAyudaEnviada(true)
    setConfirmando(null)
  }

  if (ayudaEnviada) {
    return (
      <div className="pantalla-ayuda">
        <div
          style={{
            background: '#f0fdf4',
            border: '3px solid #2e9e5b',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>✅</div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#166534' }}>
            ¡Aviso enviado!
          </p>
          <p style={{ fontSize: '22px', color: '#4b7c5e', marginTop: '12px' }}>
            Alguien llegará a ayudarte pronto.
          </p>
          <p style={{ fontSize: '20px', color: '#6b7280', marginTop: '16px' }}>
            Mantén la calma. Estás segura.
          </p>
        </div>
        <button
          className="btn-modal-cancelar"
          style={{ fontSize: '22px', padding: '18px 36px', borderRadius: '14px', width: '100%' }}
          onClick={() => setAyudaEnviada(false)}
        >
          ← Regresar
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="pantalla-ayuda">
        <div className="aviso-emergencia">
          <p>⚠️ Presiona el botón que describe tu situación</p>
        </div>

        <button
          className="btn-emergencia-grande"
          onClick={() => confirmarOpcion({ id: 0, icono: '🆘', etiqueta: 'Auxilio — Emergencia general' })}
        >
          🆘 ¡Auxilio! Emergencia general
        </button>

        <div className="opciones-ayuda">
          {OPCIONES_AYUDA.map((o) => (
            <button
              key={o.id}
              className="btn-ayuda-opcion"
              onClick={() => confirmarOpcion(o)}
            >
              <span className="icono">{o.icono}</span>
              {o.etiqueta.split('\n').map((linea, i) => (
                <span key={i} style={{ display: 'block' }}>{linea}</span>
              ))}
            </button>
          ))}
        </div>
      </div>

      {confirmando && (
        <div className="overlay-modal">
          <div className="modal">
            <div className="icono-modal">{confirmando.icono}</div>
            <h3>¿Confirmar ayuda?</h3>
            <p>{confirmando.etiqueta.replace('\n', ' ')}</p>
            <div className="modal-botones">
              <button className="btn-modal-confirmar" onClick={enviarAyuda}>
                ✅ Sí, pedir ayuda
              </button>
              <button className="btn-modal-cancelar" onClick={() => setConfirmando(null)}>
                ✖ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
