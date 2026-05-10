import { useState } from 'react'
import ChatRosa from './ChatRosa'
import { useApp, LIMITE_FREE } from '../context/AppContext'
import { t } from '../i18n/t'

export default function BurbujaRosa({ onNavegar }) {
  const [abierta, setAbierta] = useState(false)
  const { lang, limiteAlcanzado, mensajesRestantes, esIlimitado } = useApp()

  function toggleBurbuja() { setAbierta(prev => !prev) }

  function cerrarYNavegar(pantalla) {
    setAbierta(false)
    onNavegar?.(pantalla)
  }

  return (
    <>
      {/* Panel del chat compacto */}
      {abierta && (
        <div className="panel-burbuja">
          <ChatRosa
            contexto="libre"
            compacto
            onCerrar={() => setAbierta(false)}
            onNavegar={cerrarYNavegar}
          />
        </div>
      )}

      {/* Botón flotante */}
      <button
        className={`burbuja-flotante ${abierta ? 'burbuja-abierta' : ''} ${limiteAlcanzado && !abierta ? 'burbuja-limite' : ''}`}
        onClick={toggleBurbuja}
        title={t('habla_conmigo', lang)}
        aria-label="Rosa — asistente virtual"
      >
        {abierta ? '+' : '🌸'}

        {/* Badge de mensajes restantes */}
        {!abierta && !esIlimitado && mensajesRestantes <= 3 && mensajesRestantes > 0 && (
          <span className="burbuja-badge">{mensajesRestantes}</span>
        )}
        {!abierta && limiteAlcanzado && (
          <span className="burbuja-badge">!</span>
        )}
      </button>
    </>
  )
}
