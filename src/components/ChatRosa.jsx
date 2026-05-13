import { useState, useEffect, useRef, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '../utils/storage'
import {
  hayReconocimiento,
  useReconocimientoVoz, useSintesisVoz,
} from '../hooks/useVoz'
import { useApp, PLANES, LIMITE_FREE } from '../context/AppContext'
import { t } from '../i18n/t'

/* ─── Saludos contextuales ─── */
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

/* ─── System prompt con flujo diagnóstico ─── */
const NOMBRES_IDIOMA = { es:'español', en:'English', pt:'português', fr:'français', it:'italiano', de:'Deutsch' }

function crearPrompt(lang, idioma) {
  const nombre = NOMBRES_IDIOMA[lang] || idioma
  return `You are Rosa, a warm and patient virtual assistant for elderly adults ("Doña Rosa" app).

CRITICAL: Always respond in ${nombre} (${idioma}). Never switch languages. Keep ALL responses SHORT — maximum 2 sentences before any marker.

Main screen has 4 large buttons:
- GREEN (top-left): Call family
- BLUE (top-right): View photos
- ORANGE (bottom-left): Pay services
- RED (bottom-right): I need help

Known contacts (use exact URLs):
- María (hija): tel:+525512340001  |  WhatsApp: https://wa.me/525512340001
- Carlos (hijo): tel:+525512340002  |  WhatsApp: https://wa.me/525512340002
- Ana (nieta): tel:+525512340003  |  WhatsApp: https://wa.me/525512340003
- Dr. Ramírez (doctor): tel:+525512340004  |  WhatsApp: https://wa.me/525512340004

═══ DIAGNOSTIC FLOW ═══

When user wants to DO something (call, navigate, open app, use a service):

STEP 1 — Ask clarifying questions ONE at a time using EXACTLY this format:
[PREGUNTA]
¿Your question here in ${nombre}?
emoji Option label | internal_value
emoji Option label | internal_value
[/PREGUNTA]

STEP 2 — When you have ALL needed info, confirm with EXACTLY this format:
[CONFIRMAR]
texto: Full action description in ${nombre} (e.g. "Voy a llamar a Ana (tu nieta) por teléfono")
url: the_url_to_open
[/CONFIRMAR]

URL formats:
- Regular call: tel:+52XXXXXXXXXX
- WhatsApp: https://wa.me/52XXXXXXXXXX  (no + sign, no spaces in number)
- App navigation: leave url empty and use [ACCION:X] instead

Rules for questions:
- Ask ONE question at a time, never two.
- Skip questions if the user already answered in their message.
- Always use button options [PREGUNTA], never ask for free text.
- 2-4 options maximum per question.

Example question flow for "quiero llamar a mi nieta":
→ No ambiguity (only one nieta: Ana) → skip to CONFIRMAR directly
→ "¿Cómo quieres llamar a Ana?" with options: 📞 Por teléfono | telefono  💬 Por WhatsApp | whatsapp

IN-APP NAVIGATION — Only when user wants to go to a screen (not execute an action):
[ACCION:llamar] → go to family calls screen
[ACCION:fotos]  → go to photos screen
[ACCION:pagar]  → go to pay services screen
[ACCION:ayuda]  → go to help screen

IMPORTANT: Use only ONE marker per response: either [PREGUNTA] or [CONFIRMAR] or [ACCION:X]. Never combine them.`
}

/* ─── Parser de marcadores en la respuesta ─── */
function parsearRespuesta(texto) {
  // PREGUNTA block
  const pregMatch = texto.match(/\[PREGUNTA\]([\s\S]*?)\[\/PREGUNTA\]/i)
  if (pregMatch) {
    const contenido = pregMatch[1].trim()
    const lineas = contenido.split('\n').map(l => l.trim()).filter(Boolean)
    const pregunta = lineas[0] || ''
    const items = lineas.slice(1).map(linea => {
      const partes = linea.split('|')
      const valor = partes[1]?.trim() || ''
      const labelCompleto = partes[0]?.trim() || ''
      const emojiMatch = labelCompleto.match(/^(\p{Emoji_Presentation}|\p{Emoji}️|[\u{1F300}-\u{1FAFF}]|\p{Emoji})\s*/u)
      const emoji = emojiMatch ? emojiMatch[0].trim() : ''
      const label = emoji ? labelCompleto.slice(emojiMatch[0].length).trim() : labelCompleto
      return { emoji, label, valor: valor || label.toLowerCase() }
    }).filter(o => o.label)
    const textoLimpio = texto.replace(/\[PREGUNTA\][\s\S]*?\[\/PREGUNTA\]/gi, '').trim()
    return { tipo: 'pregunta', textoLimpio, pregunta, items }
  }

  // CONFIRMAR block
  const confMatch = texto.match(/\[CONFIRMAR\]([\s\S]*?)\[\/CONFIRMAR\]/i)
  if (confMatch) {
    const contenido = confMatch[1].trim()
    const textoMatch = contenido.match(/texto:\s*(.+)/i)
    const urlMatch   = contenido.match(/url:\s*(.+)/i)
    const confirmTexto = textoMatch ? textoMatch[1].trim() : ''
    const confirmUrl   = urlMatch   ? urlMatch[1].trim()   : ''
    const textoLimpio = texto.replace(/\[CONFIRMAR\][\s\S]*?\[\/CONFIRMAR\]/gi, '').trim()
    return { tipo: 'confirmacion', textoLimpio, confirmTexto, confirmUrl }
  }

  // ACCION inline
  const accionMatch = texto.match(/\[ACCION:(\w+)\]/i)
  const textoLimpio = texto.replace(/\[ACCION:\w+\]\n?/gi, '').trim()
  return { tipo: 'accion', textoLimpio, accion: accionMatch ? accionMatch[1].toLowerCase() : null }
}

/* ─── Tarjeta de opciones ─── */
function OpcionesCard({ pregunta, items, onSeleccionar }) {
  return (
    <div className="opciones-card">
      <p className="opciones-pregunta">{pregunta}</p>
      <div className="opciones-lista">
        {items.map(op => (
          <button key={op.valor} className="btn-opcion" onClick={() => onSeleccionar(op)}>
            {op.emoji && <span className="btn-opcion-emoji">{op.emoji}</span>}
            <span className="btn-opcion-label">{op.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Tarjeta de confirmación ─── */
function ConfirmacionCard({ texto, url, onConfirmar, onCancelar, lang }) {
  return (
    <div className="confirmacion-card">
      <p className="confirmacion-texto">{texto}</p>
      <div className="confirmacion-botones">
        <button className="btn-confirmar-si" onClick={() => onConfirmar(url)}>✅ {t('si', lang)}</button>
        <button className="btn-confirmar-no" onClick={onCancelar}>❌ {t('no', lang)}</button>
      </div>
    </div>
  )
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

  useEffect(() => {
    if (compacto) return
    const id = setTimeout(() => hablar(saludo), 700)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line

  /* ─── Handlers de diagnóstico ─── */
  function seleccionarOpcion(opcion, msgId) {
    setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, opciones: null } : m))
    const texto = [opcion.emoji, opcion.label].filter(Boolean).join(' ').trim()
    setTimeout(() => enviarRef.current?.(texto), 50)
  }

  function confirmarAccion(url, msgId) {
    setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, confirmacion: null } : m))
    if (url) window.open(url, '_blank')
  }

  function cancelarConfirmacion(msgId) {
    setMensajes(prev => prev.map(m => m.id === msgId ? { ...m, confirmacion: null } : m))
  }

  /* ─── Limpiar acción de navegación ─── */
  function limpiarAccion(id) {
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, accion: null } : m))
  }

  function navegarDesde(accion) {
    detenerVoz()
    onNavegar?.(accion)
    if (compacto) onCerrar?.()
  }

  /* ─── Enviar mensaje ─── */
  const enviarMensaje = useCallback(async (textoDirecto) => {
    const texto = (textoDirecto ?? entrada).trim()
    if (!texto || cargando) return

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
          // Strip from first marker block onward during streaming to avoid partial marker display
          const textoVisible = acumulado
            .replace(/\[PREGUNTA\][\s\S]*/i, '')
            .replace(/\[CONFIRMAR\][\s\S]*/i, '')
            .replace(/\[ACCION:\w+\]\n?/gi, '')
            .trim()
          setMensajes(prev =>
            prev.map(m => m.id === idRosa ? { ...m, texto: textoVisible } : m)
          )
        }
      }

      // Parse the full response after streaming completes
      const resultado = parsearRespuesta(acumulado)

      if (resultado.tipo === 'pregunta') {
        setMensajes(prev => prev.map(m => m.id === idRosa ? {
          ...m,
          texto: resultado.textoLimpio,
          opciones: { pregunta: resultado.pregunta, items: resultado.items },
          completo: true,
        } : m))
        hablar([resultado.textoLimpio, resultado.pregunta].filter(Boolean).join(' '))

      } else if (resultado.tipo === 'confirmacion') {
        setMensajes(prev => prev.map(m => m.id === idRosa ? {
          ...m,
          texto: resultado.textoLimpio,
          confirmacion: { texto: resultado.confirmTexto, url: resultado.confirmUrl },
          completo: true,
        } : m))
        hablar([resultado.textoLimpio, resultado.confirmTexto].filter(Boolean).join('. '))

      } else {
        // Normal or ACCION navigation
        const accionDetectada = resultado.accion

        if (accionDetectada && esPlanPlus && onNavegar) {
          setMensajes(prev => prev.map(m => m.id === idRosa
            ? { ...m, texto: resultado.textoLimpio, completo: true }
            : m
          ))
          hablar(resultado.textoLimpio)
          setTimeout(() => navegarDesde(accionDetectada), 1500)
        } else {
          setMensajes(prev => prev.map(m => m.id === idRosa
            ? { ...m, texto: resultado.textoLimpio, accion: accionDetectada, completo: true }
            : m
          ))
          hablar(resultado.textoLimpio)
        }
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

  /* ─── Modo compacto (burbuja flotante) ─── */
  if (compacto) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {/* Header */}
        <div style={{ background:'#6b3fa0', color:'white', padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
          <span style={{ fontSize:22, fontWeight:800 }}>🌸 Rosa</span>
          <span style={{ flex:1, fontSize:14, opacity:0.8 }}>{idioma}</span>
          <button onClick={() => { detenerVoz(); onCerrar?.() }}
            style={{ background:'rgba(255,255,255,0.2)', color:'white', border:'none', borderRadius:8, padding:'6px 10px', fontSize:18, cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px', background:'var(--p50)', display:'flex', flexDirection:'column', gap:10 }}>
          {mensajes.map(m => (
            <div key={m.id}>
              <div style={{ display:'flex', flexDirection: m.rol==='usuario' ? 'row-reverse' : 'row', gap:8, alignItems:'flex-end' }}>
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
              {m.opciones && (
                <OpcionesCard
                  pregunta={m.opciones.pregunta}
                  items={m.opciones.items}
                  onSeleccionar={op => seleccionarOpcion(op, m.id)}
                />
              )}
              {m.confirmacion && (
                <ConfirmacionCard
                  texto={m.confirmacion.texto}
                  url={m.confirmacion.url}
                  onConfirmar={url => confirmarAccion(url, m.id)}
                  onCancelar={() => cancelarConfirmacion(m.id)}
                  lang={lang}
                />
              )}
            </div>
          ))}
          {mostrarUpgrade && (
            <PantallaUpgrade lang={lang} onCerrar={() => setMostrarUpgrade(false)} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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

  /* ─── Modo completo (pantalla entera) ─── */
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

            {/* Botones de navegación ACCION */}
            {m.accion && (
              <div className="bloque-confirmacion">
                <button className="btn-si" onClick={() => navegarDesde(m.accion)}>{t('si', lang)}</button>
                <button className="btn-no" onClick={() => limpiarAccion(m.id)}>{t('no', lang)}</button>
              </div>
            )}

            {/* Opciones de diagnóstico */}
            {m.opciones && (
              <OpcionesCard
                pregunta={m.opciones.pregunta}
                items={m.opciones.items}
                onSeleccionar={op => seleccionarOpcion(op, m.id)}
              />
            )}

            {/* Confirmación de acción */}
            {m.confirmacion && (
              <ConfirmacionCard
                texto={m.confirmacion.texto}
                url={m.confirmacion.url}
                onConfirmar={url => confirmarAccion(url, m.id)}
                onCancelar={() => cancelarConfirmacion(m.id)}
                lang={lang}
              />
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
