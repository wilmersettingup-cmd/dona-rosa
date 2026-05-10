import { useState } from 'react'

const SERVICIOS = [
  { id: 1, icono: '💡', nombre: 'Luz (CFE)', monto: '$380.00', vence: '15 mayo' },
  { id: 2, icono: '💧', nombre: 'Agua', monto: '$210.00', vence: '20 mayo' },
  { id: 3, icono: '📺', nombre: 'Televisión / Internet', monto: '$549.00', vence: '10 mayo' },
  { id: 4, icono: '📱', nombre: 'Teléfono', monto: '$299.00', vence: '18 mayo' },
  { id: 5, icono: '🏠', nombre: 'Predial', monto: '$1,200.00', vence: '30 junio' },
]

export default function PantallaPagarServicios() {
  const [confirmando, setConfirmando] = useState(null)
  const [pagados, setPagados] = useState(new Set())

  function confirmarPago(servicio) {
    setConfirmando(servicio)
  }

  function realizarPago() {
    setPagados((prev) => new Set([...prev, confirmando.id]))
    setConfirmando(null)
  }

  return (
    <>
      <div className="lista-servicios">
        {SERVICIOS.map((s) => {
          const estaPagado = pagados.has(s.id)
          return (
            <div key={s.id} className="tarjeta-servicio" style={{ opacity: estaPagado ? 0.6 : 1 }}>
              <div className="info-servicio">
                <span className="icono-servicio">{s.icono}</span>
                <div>
                  <div className="nombre-servicio">{s.nombre}</div>
                  <div className="monto-servicio">
                    {estaPagado ? '✅ Pagado' : `${s.monto} — Vence: ${s.vence}`}
                  </div>
                </div>
              </div>
              <button
                className="btn-pagar"
                onClick={() => confirmarPago(s)}
                disabled={estaPagado}
                style={estaPagado ? { background: '#9ca3af', cursor: 'default' } : {}}
              >
                {estaPagado ? 'Pagado' : 'Pagar'}
              </button>
            </div>
          )
        })}
      </div>

      {confirmando && (
        <div className="overlay-modal">
          <div className="modal">
            <div className="icono-modal">💳</div>
            <h3>Confirmar pago</h3>
            <p>
              {confirmando.icono} {confirmando.nombre}
            </p>
            <p style={{ fontSize: '26px', fontWeight: '700', color: '#333', marginBottom: '28px' }}>
              {confirmando.monto}
            </p>
            <div className="modal-botones">
              <button className="btn-modal-confirmar" onClick={realizarPago}>
                ✅ Confirmar
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
