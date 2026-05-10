import { useState } from 'react'

const CONTACTOS = [
  { id: 1, nombre: 'María (hija)', inicial: 'M', color: '#e07b10', telefono: '55 1234 5678' },
  { id: 2, nombre: 'Carlos (hijo)', inicial: 'C', color: '#2563eb', telefono: '55 9876 5432' },
  { id: 3, nombre: 'Ana (nieta)', inicial: 'A', color: '#2e9e5b', telefono: '55 5555 1234' },
  { id: 4, nombre: 'Dr. Ramírez', inicial: 'R', color: '#6b3fa0', telefono: '55 4321 8765' },
]

export default function PantallaLlamarFamilia() {
  const [llamando, setLlamando] = useState(null)

  function iniciarLlamada(contacto) {
    setLlamando(contacto)
  }

  function cancelarLlamada() {
    setLlamando(null)
  }

  return (
    <>
      <div className="lista-contactos">
        {CONTACTOS.map((c) => (
          <div key={c.id} className="tarjeta-contacto">
            <div className="info-contacto">
              <div
                className="avatar-contacto"
                style={{ background: c.color }}
              >
                {c.inicial}
              </div>
              <div>
                <div className="nombre-contacto">{c.nombre}</div>
                <div className="relacion-contacto">{c.telefono}</div>
              </div>
            </div>
            <button
              className="btn-llamar"
              onClick={() => iniciarLlamada(c)}
            >
              📞 Llamar
            </button>
          </div>
        ))}
      </div>

      {llamando && (
        <div className="overlay-modal">
          <div className="modal">
            <div className="icono-modal">📞</div>
            <h3>Llamando a...</h3>
            <p>{llamando.nombre}</p>
            <p style={{ fontSize: '20px', color: '#888', marginBottom: '28px' }}>
              {llamando.telefono}
            </p>
            <div className="modal-botones">
              <button className="btn-modal-confirmar" onClick={cancelarLlamada}>
                ✅ Llamar
              </button>
              <button className="btn-modal-cancelar" onClick={cancelarLlamada}>
                ✖ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
