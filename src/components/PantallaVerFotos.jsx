import { useState } from 'react'

const ALBUMS = [
  { id: 1, icono: '🎂', etiqueta: 'Cumpleaños', fondo: '#fef9c3' },
  { id: 2, icono: '🎄', etiqueta: 'Navidad', fondo: '#dcfce7' },
  { id: 3, icono: '👶', etiqueta: 'Los nietos', fondo: '#dbeafe' },
  { id: 4, icono: '🌻', etiqueta: 'El jardín', fondo: '#fef3c7' },
  { id: 5, icono: '🏖️', etiqueta: 'Vacaciones', fondo: '#e0f2fe' },
  { id: 6, icono: '👨‍👩‍👧', etiqueta: 'Familia', fondo: '#fce7f3' },
]

export default function PantallaVerFotos() {
  const [albumSeleccionado, setAlbumSeleccionado] = useState(null)

  if (albumSeleccionado) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <button
          className="btn-volver"
          style={{ background: '#6b3fa0', color: 'white', marginBottom: '24px' }}
          onClick={() => setAlbumSeleccionado(null)}
        >
          ← Álbumes
        </button>
        <h3 style={{ fontSize: '28px', color: '#333', marginBottom: '24px', textAlign: 'center' }}>
          {albumSeleccionado.icono} {albumSeleccionado.etiqueta}
        </h3>
        <div
          style={{
            background: '#f9fafb',
            borderRadius: '20px',
            padding: '48px',
            textAlign: 'center',
            fontSize: '22px',
            color: '#888',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>📷</div>
          <p>Aquí aparecerán las fotos del álbum</p>
          <p style={{ fontSize: '18px', marginTop: '12px', color: '#aaa' }}>
            Pide a tu familia que agregue fotos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="galeria-fotos">
      {ALBUMS.map((a) => (
        <div
          key={a.id}
          className="tarjeta-foto"
          onClick={() => setAlbumSeleccionado(a)}
        >
          <div className="foto-imagen" style={{ background: a.fondo }}>
            {a.icono}
          </div>
          <div className="foto-etiqueta">{a.etiqueta}</div>
        </div>
      ))}
    </div>
  )
}
