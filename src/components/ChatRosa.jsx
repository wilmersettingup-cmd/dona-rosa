import { useState, useEffect, useRef, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from './PantallaAjustes'
import {
  detectarIdioma, hayReconocimiento,
  useReconocimientoVoz, useSintesisVoz,
} from '../hooks/useVoz'
import { useApp, PLANES, LIMITE_FREE } from '../context/AppContext'
import { t } from '../i18n/t'

/* ─── Contextos ─── */
const SALUDOS = {
  llamar: { es:'Hola, soy Rosa. ¿A quién de tu familia deseas llamar?', en:"Hi, I'm Rosa. Who would you like to call?", pt:'Olá, sou Rosa. A quem deseja ligar?', fr:'Bonjour, je suis Rosa. Qui voulez-vous appeler?', it:'Ciao, sono Rosa. Chi vuoi chiamare?', de:'Hallo, ich bin Rosa. Wen möchten Sie anrufen?' },
  fotos:  { es:'Hola, soy Rosa. ¿Qué álbum de fotos te gustaría ver?', en:"Hi! Which photo album would you like to see?", pt:'Olá! Qual álbum de fotos gostaria de ver?', fr:'Bonjour! Quel album photo souhaitez-vous voir?', it:'Ciao! Quale album fotografico vorresti vedere?', de:'Hallo! Welches Fotoalbum möchten Sie sehen?' },
  pagar:  { es:'Hola, soy Rosa. ¿Qué servicio deseas pagar hoy?', en:"Hi! Which service would you like to pay today?", pt:'Olá! Qual serviço deseja pagar hoje?', fr:'Bonjour! Quel service souhaitez-vous payer?', it:'Ciao! Quale servizio vuoi pagare oggi?', de:'Hallo! Welchen Dienst möchten Sie heute bezahlen?' },
  ayuda:  { es:'Hola, estoy aquí contigo. ¿Qué está pasando?', en:"Hi, I'm here with you. What's happening?", pt:'Olá, estou aqui com você. O que está acontecendo?', fr:"Bonjour, je suis là avec vous. Que se passe-t-il?", it:'Ciao, sono qui con te. Cosa sta succedendo?', de:'Hallo, ich bin bei Ihnen. Was ist los?' },
  libre:  { es:'Hola, soy Rosa. ¿En qué puedo ayudarte?', en:"Hi, I'm Rosa! How can I help you today?", pt:'Olá, sou Rosa! Como posso ajudá-lo?', fr:'Bonjour, je suis Rosa! Comment puis-je vous aider?', it:'Ciao, sono Rosa! Come posso aiutarti?', de:'Hallo, ich bin Rosa! Wie kann ich Ihnen helfen?' },
}

const COLORES = { llamar:'#2e9e5b', fotos:'#2563eb', pagar:'#e07b10', ayuda:'#dc2626', libre:'#6b3fa0' }
const TITULOS = { llamar:'📞', fotos:'🖼️', pagar:'💳', ayuda:'🆘', libre:'🌸' }

function getSaludo(contexto, lang) {
  return (SALUDOS[contexto] || SALUDOS.libre)[lang] || SALUDOS[contexto]?.['en'] || ''
}

/* ─── System prompt multiidioma ─── */
const NOMBRES_IDIOMA = { es:'español', en:'English', pt:'português', fr:'français', it:'italiano', de:'Deutsch' }

function crearPrompt(lang, idioma) {
  const nombre = NOMBRES_IDIOMA[lang] || idioma
  return `You are Rosa, a warm and patient virtual assistant for elderly adults ("Doña Rosa" app).

CRITICAL: Always respond in ${nombre} (${idioma}). Never switch languages.

Main screen has 4 large buttons:
- GREEN (top-left): Call family
- BLUE (top-right): View photos
- ORANGE (bottom-left): Pay services
- RED (bottom-right): I need help

Rules: Short sentences only (max 3). Be warm and encouraging. Describe buttons by color + position.

ACTION DETECTION — When user clearly wants to navigate to a section, add EXACTLY ONE marker on a new blank line at the end:
[ACCION:llamar] → wants to call family
[ACCION:fotos]  → wants to see photos
[ACCION:pagar]  → wants to pay a service
[ACCION:ayuda]  → needs emergency help

Ask for confirmation in your text, then add the marker. Example:
"Would you like me to open the family calls screen?"
[ACCION:llamar]

Only add a marker when the user clearly wants to navigate. Never add it for general chat.`
}

/* ─── Pantalla Upgrade (inline) ─── */
function PantallaUpgrade({ lang, onCerrar }) {
  const { activarTrial, activarPlus, plan } = useApp()
  const yaTieneTrialOPlus = plan !== PLANES.FREE

  return (
    <div className="pantalla-upgrade">
      <p className="upgrade-titulo">⚠️ {t('upgrade_titulo', lang)}</p>
      <p className="upgrade-desc">{t('upgrade_desc', lang)}</p>

      {!yaTieneTrialOPlus && (
        <div className="upgrade-card">
          <h3>⭐ {t('plan_trial', lang)}</h3>
          <ul className="upgrade-features">
            {['feature_1','feature_2','feature_3','feature_4'].map(k =>
              <li key={k}>{t(k, lang)}</li>
            )}
          </ul>
          <button className="btn-upgrade-trial" onClick={activarTrial}>
            {t('activar_trial', lang)}
          </button>
          <p className="trial-nota">{t('trial_sin_tarjeta', lang)}</p>
        </div>
      )}

      <div className="upgrade-card upgrade-card-plus">
        <h3>✨ {t('plan_plus_precio', lang)}</h3>
        <p style={{ fontSize:'17px', color:'#5b21b6', margin:0 }}>{t('plan_plus_desc', lang)}</p>
        <button className="btn-upgrade-plus" onClick={activarPlus}>
          {t('plan_plus_precio', lang)}
        </button>
      </div>

      <button className="btn-quedar-gratis" onClick={onCerrar}>
        {t('quedar_gratis', lang)}
      </button>
    </div>
  )
}

/* ─── Chat principal ─── */
export default function ChatRosa({ contexto = 'libre', onCerrar, compacto = false, onNavegar }) {
  const { idioma, lang, limiteAlcanzado, consumirMensaje, esPlanPlus } = useApp()

  const color  = COLORES[contexto] || COLORES.libre
  const icono  = TITULOS[contexto] || '🌸'
  const saludo = getSaludo(contexto, lang)

  const [mensajes, setMensajes] = useState([
    { id: 1, rol: 'rosa', texto: saludo, completo: true },
  ])
  const [entrada, setEntrada]           = useState('')
  const [cargando, setCargando]         = useState(false)
  const [error, setError]               = useState('')
  const [mostrarUpgrade, setMostrarUpgrade] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const enviarRef  = useRef(null)

  const { hablando, hablar, detener: detenerVoz } = useSintesisVoz(idioma)

  const manejarTranscripcion = useCallback((texto) => {
    setEntrada(texto)
    setTimeout(() => enviarRef.current?.(texto), 350)
  }, [])

  const { escuchando, errorVoz, iniciar: iniciarMic, detener: detenerMic } =
    useReconocimientoVoz(idioma, manejarTranscripcion)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

  // Saludo en voz (solo en modo completo, no en burbuja compacta)
  useEffect(() => {
    if (compacto) return
    const id = setTimeout(() => hablar(saludo), 700)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line

  /* ─── Limpiar acción de confirmación ─── */
  function limpiarAccion(id) {
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, accion: null } : m))
  }

  /* ─── Navegar desde confirmación ─── */
  function navegarDesde(accion) {
    detenerVoz()
    onNavegar?.(accion)
    if (compacto) onCerrar?.()
  }

  /* ─── Enviar mensaje ─── */
  const enviarMensaje = useCallback(async (textoDirecto) => {
    const texto = (textoDirecto ?? entrada).trim()
    if (!texto || cargando) return

    // Verificar plan
    if (limiteAlcanzado) { setMostrarUpgrade(true); return }

    const apiKey = getApiKey()
    if (!apiKey) { setError(t('error_api_key', lang)); return }

    detenerVoz()
    setMostrarUpgrade(false)

    const nuevoMsg = { id: Date.now(), rol: 'usuario', texto, completo: true }
    const historialActual = [...mensajes, nuevoMsg]
    setMensajes(historialActual)
    setEntrada('')
    setCargando(true)
    setError('')

    const idRosa = Date.now() + 1
    setMensajes(prev => [...prev, { id: idRosa, rol: 'rosa', texto: '', completo: false }])

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const historialApi = historialActual.slice(1).map(m => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      }))

      const stream = client.messages.stream({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: crearPrompt(lang, idioma),
        messages: historialApi,
      })

      let acumulado = ''
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          acumulado += ev.delta.text
          setMensajes(prev =>
            prev.map(m => m.id === idRosa ? { ...m, texto: acumulado } : m)
          )
        }
      }

      // Detectar acción de navegación
      const matchAccion = acumulado.match(/\[ACCION:(\w+)\]/i)
      const textoLimpio = acumulado.replace(/\[ACCION:\w+\]\n?/gi, '').trim()
      const accionDetectada = matchAccion ? matchAccion[1].toLowerCase() : null

      if (accionDetectada && esPlanPlus && onNavegar) {
        // Plan Plus: navegar automáticamente
        setMensajes(prev => prev.map(m => m.id === idRosa ? { ...m, texto: textoLimpio, completo: true } : m))
        hablar(textoLimpio)
        setTimeout(() => navegarDesde(accionDetectada), 1500)
      } else {
        setMensajes(prev => prev.map(m =>
          m.id === idRosa
            ? { ...m, texto: textoLimpio, accion: accionDetectada, completo: true }
            : m
        ))
        hablar(textoLimpio)
      }

      consumirMensaje()

    } catch (err) {
      const msg = err.status === 401 ? t('error_api_invalida', lang) : t('error_conexion', lang)
      setMensajes(prev => prev.map(m =>
        m.id === idRosa ? { ...m, texto: msg, completo: true, esError: true } : m
      ))
    } finally {
      setCargando(false)
    }
  }, [entrada, cargando, mensajes, idioma, lang, hablar, detenerVoz, limiteAlcanzado, consumirMensaje, esPlanPlus, onNavegar])

  useEffect(() => { enviarRef.current = enviarMensaje }, [enviarMensaje])

  function toggleMic() {
    if (escuchando) { detenerMic(); return }
    detenerVoz(); setEntrada(''); iniciarMic()
  }

  const tieneVoz = hayReconocimiento()

  // ─ Modo compacto (burbuja flotante) ─
  if (compacto) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {/* Header compacto */}
        <div style={{ background:'#6b3fa0', color:'white', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
          <span style={{ fontSize:22, fontWeight:800 }}>🌸 Rosa</span>
          <span style={{ flex:1, fontSize:14, opacity:0.8 }}>{idioma}</span>
          <button onClick={() => { detenerVoz(); onCerrar?.() }}
            style={{ background:'rgba(255,255,255,0.2)', color:'white', border:'none', borderRadius:8, padding:'6px 10px', fontSize:18, cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {/* Mensajes compactos */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px', background:'#f5f0eb', display:'flex', flexDirection:'column', gap:10 }}>
          {mensajes.map(m => (
            <div key={m.id} style={{ display:'flex', flexDirection: m.rol==='usuario' ? 'row-reverse' : 'row', gap:8, alignItems:'flex-end' }}>
              {m.rol === 'rosa' && (
                <button onClick={() => hablando ? detenerVoz() : m.completo && hablar(m.texto)}
                  style={{ width:34, height:34, borderRadius:'50%', background: hablando ? '#2563eb' : '#6b3fa0', color:'white', border:'none', cursor:'pointer', fontSize:16, flexShrink:0 }}>
                  {hablando ? '🔊' : '🌸'}
                </button>
              )}
              <div style={{
                maxWidth:'80%', padding:'10px 14px', borderRadius:16, fontSize:18,
                background: m.rol==='usuario' ? '#6b3fa0' : 'white',
                color: m.rol==='usuario' ? 'white' : '#222',
                borderBottomLeftRadius: m.rol==='rosa' ? 4 : 16,
                borderBottomRightRadius: m.rol==='usuario' ? 4 : 16,
                boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
              }}>
                {m.texto || <span style={{ color:'#aaa' }}>…</span>}
              </div>
              {m.accion && (
                <div style={{ display:'flex', gap:8, padding:'4px 0' }}>
                  <button className="btn-si" style={{ fontSize:18, padding:'12px' }} onClick={() => navegarDesde(m.accion)}>{t('si', lang)}</button>
                  <button className="btn-no" style={{ fontSize:18, padding:'12px' }} onClick={() => limpiarAccion(m.id)}>{t('no', lang)}</button>
                </div>
              )}
            </div>
          ))}
          {mostrarUpgrade && (
            <PantallaUpgrade lang={lang} onCerrar={() => setMostrarUpgrade(false)} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input compacto */}
        <div style={{ padding:'10px 12px', background:'white', borderTop:'1px solid #e5e7eb', flexShrink:0 }}>
          {tieneVoz && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
              <button onClick={toggleMic} disabled={cargando}
                className={`btn-mic-grande ${escuchando ? 'mic-activo' : ''} ${cargando ? 'mic-deshabilitado' : ''}`}
                style={{ width:64, height:64, fontSize:28 }}>
                {escuchando ? '⏹' : '🎙️'}
              </button>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <input value={entrada} onChange={e => setEntrada(e.target.value)}
              onKeyDown={e => e.key==='Enter' && enviarMensaje()}
              disabled={cargando || escuchando}
              placeholder={t('escribe_aqui', lang)}
              style={{ flex:1, fontSize:17, padding:'10px 12px', borderRadius:10, border:'2px solid #d1d5db', outline:'none', fontFamily:'inherit' }} />
            <button onClick={() => enviarMensaje()} disabled={!entrada.trim() || cargando}
              style={{ width:44, height:44, borderRadius:'50%', background: entrada.trim() && !cargando ? '#6b3fa0' : '#9ca3af', color:'white', border:'none', fontSize:20, cursor: entrada.trim() && !cargando ? 'pointer' : 'default' }}>
              ➤
            </button>
          </div>
          <p style={{ textAlign:'center', fontSize:14, color:'#9ca3af', margin:'4px 0 0' }}>
            {escuchando ? t('escuchando', lang) : cargando ? t('pensando', lang) : tieneVoz ? t('toca_hablar', lang) : ''}
          </p>
        </div>
      </div>
    )
  }

  // ─ Modo completo (pantalla entera) ─
  return (
    <div className="chat-rosa-contenedor">
      <div className="chat-rosa-header" style={{ borderBottom: `4px solid ${color}` }}>
        <button className="btn-volver" onClick={() => { detenerVoz(); onCerrar?.() }}>
          ← {t('inicio', lang)}
        </button>
        <div className="chat-rosa-titulo">
          <div style={{ fontSize:28, fontWeight:800 }}>Rosa 🌸</div>
          <div style={{ fontSize:16, opacity:0.85 }}>
            {icono} · <span style={{ fontSize:13, opacity:0.7 }}>{idioma}</span>
          </div>
        </div>
        <button
          className={`avatar-rosa ${hablando ? 'avatar-hablando' : ''}`}
          onClick={() => hablando ? detenerVoz() : mensajes.at(-1)?.completo && hablar(mensajes.at(-1).texto)}
          title={hablando ? 'Detener voz' : 'Escuchar último mensaje'}
        >
          {hablando ? '🔊' : '🌸'}
        </button>
      </div>

      <div className="chat-rosa-mensajes">
        {mensajes.map(m => (
          <div key={m.id}>
            <div className={`burbuja-chat ${m.rol==='usuario' ? 'burbuja-usuario' : 'burbuja-rosa'} ${m.esError ? 'burbuja-error' : ''}`}>
              {m.rol === 'rosa' && (
                <button className={`avatar-rosa ${hablando ? 'avatar-hablando' : ''}`}
                  onClick={() => hablando ? detenerVoz() : m.completo && hablar(m.texto)}
                  title="Escuchar este mensaje">
                  {hablando ? '🔊' : '🌸'}
                </button>
              )}
              <div className="texto-burbuja">
                {m.texto || (
                  <span className="puntos-cargando"><span>.</span><span>.</span><span>.</span></span>
                )}
              </div>
            </div>
            {m.accion && (
              <div className="bloque-confirmacion">
                <button className="btn-si" onClick={() => navegarDesde(m.accion)}>{t('si', lang)}</button>
                <button className="btn-no" onClick={() => limpiarAccion(m.id)}>{t('no', lang)}</button>
              </div>
            )}
          </div>
        ))}

        {mostrarUpgrade && (
          <PantallaUpgrade lang={lang} onCerrar={() => setMostrarUpgrade(false)} />
        )}
        {error && <div className="error-chat">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-rosa-input-area">
        {tieneVoz && (
          <div className="mic-area">
            <button
              className={`btn-mic-grande ${escuchando ? 'mic-activo' : ''} ${cargando ? 'mic-deshabilitado' : ''}`}
              onClick={toggleMic} disabled={cargando}
              aria-label={escuchando ? 'Detener' : 'Hablar'}>
              {escuchando ? '⏹' : '🎙️'}
            </button>
            <p className="mic-sugerencia">
              {escuchando ? t('escuchando', lang)
                : cargando ? t('pensando', lang)
                : hablando ? t('hablando', lang)
                : t('toca_hablar', lang)}
            </p>
            {errorVoz && <p style={{ color:'#dc2626', fontSize:16, textAlign:'center' }}>⚠️ {errorVoz}</p>}
          </div>
        )}
        <div className="chat-rosa-input-fila">
          <input ref={inputRef} type="text" value={entrada}
            onChange={e => setEntrada(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && enviarMensaje()}
            placeholder={t('escribe_aqui', lang)}
            disabled={cargando || escuchando}
            className="chat-rosa-input" />
          <button onClick={() => enviarMensaje()} disabled={!entrada.trim() || cargando}
            className="btn-enviar"
            style={{ background: entrada.trim() && !cargando ? color : '#9ca3af' }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
