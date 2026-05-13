/**
 * ActivacionVoz — Wake word "Doña Rosa" + guía visual
 *
 * Estados:
 *  dormido    → escucha en background, burbuja pequeña en esquina
 *  escuchando → overlay central, ondas, espera comando
 *  procesando → Claude pensando
 *  guiando    → muestra flecha + botón iluminado
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useSintesisVoz } from '../hooks/useVoz'
import { getApiKey } from '../utils/storage'
import { t } from '../i18n/t'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

/* Patrones que activan a Rosa */
const WAKE_RE = /do[ñn]a\s+rosa|hey\s+rosa|oye\s+rosa|hola\s+rosa|wake\s+rosa/i

/* Mapa de IDs de botones */
const BTN_IDS = {
  llamar: 'btn-voz-llamar',
  fotos:  'btn-voz-fotos',
  pagar:  'btn-voz-pagar',
  ayuda:  'btn-voz-ayuda',
  rosa:   'btn-voz-rosa',
}

/* System prompt para modo guía */
function promptGuia(lang, idioma) {
  const nombres = { es:'español', en:'English', pt:'português', fr:'français', it:'italiano', de:'Deutsch' }
  return `You are Rosa, a warm voice assistant for elderly adults. Respond in ${nombres[lang] || idioma}.

The screen has 5 large buttons:
- GREEN (top-left): Call family → [GUIA:llamar]
- BLUE (top-right): View photos → [GUIA:fotos]
- ORANGE (bottom-left): Pay services → [GUIA:pagar]
- RED (bottom-right): I need help → [GUIA:ayuda]
- PURPLE (bottom-full): Talk to Rosa → [GUIA:rosa]

Rules:
- Keep responses SHORT (1-2 sentences max).
- Always describe the button by COLOR and POSITION.
- If user wants to navigate, add the [GUIA:X] marker on a new line at the end.
- If user says thanks or goodbye, respond warmly and end the conversation.
- If unclear, ask one simple question.`
}

/* Calcula posición del centro de la pantalla */
const centro = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

/* Calcula punto en la línea center→button, retrocedido 80px del botón */
function calcularFlecha(btnId) {
  const el = document.getElementById(btnId)
  if (!el) return null
  const r   = el.getBoundingClientRect()
  const c   = centro()
  const tx  = r.left + r.width  / 2
  const ty  = r.top  + r.height / 2
  const dx  = tx - c.x
  const dy  = ty - c.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return null
  const retroceso = 80
  const ex = tx - (dx / len) * retroceso
  const ey = ty - (dy / len) * retroceso
  // Punto de inicio: 100px desde el centro hacia el botón
  const sx = c.x + (dx / len) * 100
  const sy = c.y + (dy / len) * 100
  return { x1: sx, y1: sy, x2: ex, y2: ey }
}

export default function ActivacionVoz({ idioma, lang, onGuia, onDismiss }) {
  const [estado, setEstado]           = useState('dormido')
  const [transcripcion, setTranscripcion] = useState('')
  const [textoRosa, setTextoRosa]     = useState('')
  const [flechaPos, setFlechaPos]     = useState(null)
  const [permisoOk, setPermisoOk]     = useState(false)

  const estadoRef   = useRef('dormido')
  const wakeRecRef  = useRef(null)   // recognizer siempre escuchando
  const cmdRecRef   = useRef(null)   // recognizer del comando activo
  const timeoutRef  = useRef(null)
  const activadoPorRef = useRef(false)

  const { hablar, detener: detenerVoz } = useSintesisVoz(idioma)

  /* Sync estado → ref */
  useEffect(() => { estadoRef.current = estado }, [estado])

  /* ── Wake word listener (auto-restart) ── */
  const iniciarWake = useCallback(() => {
    if (!SR || estadoRef.current !== 'dormido') return
    try {
      const rec = new SR()
      rec.lang            = idioma
      rec.continuous      = false
      rec.interimResults  = true
      rec.maxAlternatives = 1

      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = e.results[i][0].transcript
          if (WAKE_RE.test(txt)) {
            rec.abort()
            activar()
            return
          }
        }
      }

      rec.onend = () => {
        wakeRecRef.current = null
        if (estadoRef.current === 'dormido') {
          setTimeout(iniciarWake, 600)
        }
      }

      rec.onerror = (e) => {
        wakeRecRef.current = null
        if (e.error !== 'aborted' && estadoRef.current === 'dormido') {
          setTimeout(iniciarWake, 1500)
        }
        if (e.error === 'not-allowed') setPermisoOk(false)
        else setPermisoOk(true)
      }

      rec.onstart = () => setPermisoOk(true)

      wakeRecRef.current = rec
      rec.start()
    } catch {}
  }, [idioma])

  /* Arrancar wake word al montar */
  useEffect(() => {
    const delay = setTimeout(iniciarWake, 800)
    return () => {
      clearTimeout(delay)
      clearTimeout(timeoutRef.current)
      wakeRecRef.current?.abort()
      cmdRecRef.current?.abort()
    }
  }, [iniciarWake])

  /* ── Activar overlay ── */
  function activar() {
    if (estadoRef.current !== 'dormido') return
    detenerVoz()
    setEstado('escuchando')
    setTranscripcion('')
    setTextoRosa('')
    setFlechaPos(null)
    onGuia(null)
    escucharComando()
  }

  /* ── Escuchar comando del usuario ── */
  function escucharComando() {
    if (!SR) return
    const rec = new SR()
    rec.lang            = idioma
    rec.continuous      = false
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let texto = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        texto += e.results[i][0].transcript
      }
      setTranscripcion(texto)
      if (e.results[e.resultIndex]?.isFinal && texto.trim()) {
        rec.abort()
        procesarComando(texto.trim())
      }
    }

    rec.onend = () => {
      cmdRecRef.current = null
      // Si terminó sin resultado final → cerrar
      if (estadoRef.current === 'escuchando') {
        cerrar()
      }
    }

    rec.onerror = () => { cmdRecRef.current = null; cerrar() }

    cmdRecRef.current = rec
    rec.start()

    // Timeout de seguridad: 12s sin hablar → cerrar
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (estadoRef.current === 'escuchando') cerrar()
    }, 12_000)
  }

  /* ── Llamar a Claude ── */
  async function procesarComando(texto) {
    clearTimeout(timeoutRef.current)
    setEstado('procesando')
    setTranscripcion(texto)

    const apiKey = getApiKey()
    if (!apiKey) {
      hablar(t('error_api_key', lang).replace('⚙️ ', ''))
      setTimeout(cerrar, 3000)
      return
    }

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
      const stream = client.messages.stream({
        model:     'claude-haiku-4-5',
        max_tokens: 200,
        system:    promptGuia(lang, idioma),
        messages:  [{ role: 'user', content: texto }],
      })

      let acumulado = ''
      setEstado('guiando')

      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          acumulado += ev.delta.text
          const limpio = acumulado.replace(/\[GUIA:\w+\]\n?/gi, '').trim()
          setTextoRosa(limpio)
        }
      }

      // Detectar guia visual
      const match = acumulado.match(/\[GUIA:(\w+)\]/i)
      const textoLimpio = acumulado.replace(/\[GUIA:\w+\]\n?/gi, '').trim()
      setTextoRosa(textoLimpio)

      if (match) {
        const target = match[1].toLowerCase()
        onGuia(target)
        // Calcular posición de la flecha con un pequeño delay (DOM necesita renderizar)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const pos = calcularFlecha(BTN_IDS[target])
            setFlechaPos(pos)
          })
        })
      }

      hablar(textoLimpio)

      // Detectar despedida
      const despedida = /gracias|adios|adiós|bye|thanks|merci|danke|ciao/i.test(texto)
      const autoClose  = despedida ? 3000 : match ? 8000 : 5000
      timeoutRef.current = setTimeout(cerrar, autoClose)

    } catch {
      cerrar()
    }
  }

  /* ── Cerrar overlay ── */
  function cerrar() {
    clearTimeout(timeoutRef.current)
    cmdRecRef.current?.abort()
    cmdRecRef.current = null
    detenerVoz()
    onGuia(null)
    setFlechaPos(null)
    setEstado('dormido')
    onDismiss?.()
    setTimeout(iniciarWake, 500)
  }

  /* ── Textos de estado ── */
  const TEXTOS = {
    es: { escucha:'Escuchando…', procesa:'Rosa está pensando…', guia:'Rosa te guía', toca:'Di "Doña Rosa" para activarme' },
    en: { escucha:'Listening…',  procesa:'Rosa is thinking…',   guia:'Rosa guides you', toca:'Say "Doña Rosa" to activate me' },
    pt: { escucha:'Ouvindo…',    procesa:'Rosa está pensando…', guia:'Rosa te guia',    toca:'Diga "Doña Rosa" para me ativar' },
    fr: { escucha:'Écoute…',     procesa:'Rosa réfléchit…',     guia:'Rosa vous guide', toca:'Dites "Doña Rosa" pour m\'activer' },
    it: { escucha:'Ascolto…',    procesa:'Rosa sta pensando…',  guia:'Rosa ti guida',   toca:'Di "Doña Rosa" per attivarmi' },
    de: { escucha:'Zuhören…',    procesa:'Rosa denkt nach…',    guia:'Rosa führt dich', toca:'Sag "Doña Rosa" um mich zu aktivieren' },
  }
  const tx = TEXTOS[lang] || TEXTOS.en
  const estadoTexto = estado === 'procesando' ? tx.procesa : estado === 'guiando' ? tx.guia : tx.escucha

  /* ─────────── RENDER ─────────── */

  /* Modo dormido: solo el indicador mic en la burbuja flotante */
  if (estado === 'dormido') {
    return (
      <div
        className={`voz-mic-indicador ${permisoOk ? '' : 'inactivo'}`}
        title={permisoOk ? tx.toca : 'Micrófono no disponible'}
      >
        🎙
      </div>
    )
  }

  /* Modo activo: overlay completo */
  return (
    <>
      {/* Overlay */}
      <div className="voz-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
        {/* Botón cerrar */}
        <button className="voz-btn-cerrar" onClick={cerrar} aria-label="Cerrar">✕</button>

        {/* Contenedor de la burbuja central */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Ondas de sonido (solo en modo escucha) */}
          {estado === 'escuchando' && (
            <div className="voz-ondas">
              {[1,2,3,4].map(i => <div key={i} className="voz-onda" />)}
            </div>
          )}

          {/* Burbuja central */}
          <div
            className={`voz-burbuja-central ${estado === 'escuchando' ? 'voz-escuchando' : ''} ${estado === 'procesando' ? 'voz-procesando' : ''}`}
            onClick={cerrar}
          >
            🌸
          </div>

          {/* Texto de estado */}
          <div className="voz-estado-texto">{estadoTexto}</div>

          {/* Transcripción del usuario */}
          {(transcripcion || textoRosa) && (
            <div className="voz-transcripcion">
              {textoRosa || transcripcion}
            </div>
          )}
        </div>
      </div>

      {/* Flecha SVG animada (fuera del overlay para ir encima de los botones) */}
      {flechaPos && (
        <svg className="voz-flecha-svg" aria-hidden="true">
          <defs>
            <marker id="punta-flecha" viewBox="0 0 12 12" refX="11" refY="6"
              markerWidth="10" markerHeight="10" orient="auto">
              <path d="M 0 1 L 11 6 L 0 11 z" fill="#facc15"
                style={{ filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.9))' }} />
            </marker>
          </defs>
          <line
            className="voz-flecha-linea"
            x1={flechaPos.x1} y1={flechaPos.y1}
            x2={flechaPos.x2} y2={flechaPos.y2}
            markerEnd="url(#punta-flecha)"
          />
        </svg>
      )}
    </>
  )
}
