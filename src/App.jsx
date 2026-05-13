import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useApp, LIMITE_FREE } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import { t, LOCALE_MAP } from './i18n/t'
import ChatRosa from './components/ChatRosa'
import BurbujaRosa from './components/BurbujaRosa'
import ActivacionVoz from './components/ActivacionVoz'
import PantallaAjustes from './components/PantallaAjustes'
import PantallaAuth from './components/auth/PantallaAuth'
import PantallaLlamarFamilia from './components/PantallaLlamarFamilia'
import PantallaVerFotos from './components/PantallaVerFotos'
import PantallaPagarServicios from './components/PantallaPagarServicios'
import PantallaNecesitoAyuda from './components/PantallaNecesitoAyuda'
import { hayReconocimiento } from './hooks/useVoz'

/* ── Iconos SVG de línea (estilo SF Symbols / Feather) ── */
const IcoChat = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="10" r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none"/>
  </svg>
)
const IcoPhone = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IcoPhoto = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IcoCard = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2.5"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IcoPulse = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const PANTALLAS = {
  INICIO: 'inicio',
  LLAMAR: 'llamar', FOTOS: 'fotos', PAGAR: 'pagar', AYUDA: 'ayuda',
  LIBRE: 'libre', AJUSTES: 'ajustes',
}
const PANTALLAS_CHAT    = new Set([PANTALLAS.LLAMAR, PANTALLAS.FOTOS, PANTALLAS.PAGAR, PANTALLAS.AYUDA, PANTALLAS.LIBRE])
const PANTALLAS_CLASICAS = new Set([PANTALLAS.AJUSTES])

/* ── Reloj ── */
function usarHora() {
  const [hora, setHora] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return hora
}

/* ── Color determinístico a partir de un string ── */
const PALETA = [
  '#6b3fa0', '#2563eb', '#0891b2', '#059669', '#2e9e5b',
  '#d97706', '#e07b10', '#dc2626', '#db2777', '#7c3aed',
]
function colorDeSeed(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return PALETA[Math.abs(h) % PALETA.length]
}

/* ── Círculo de avatar (reutilizable en distintos tamaños) ── */
function AvatarCirculo({ user, size = 42 }) {
  const fontSize = Math.round(size * 0.42)
  const iconSize = Math.round(size * 0.55)

  if (!user) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(255,255,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Person SVG genérico */}
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z"/>
        </svg>
      </div>
    )
  }

  if (user.photoURL) {
    return (
      <img
        src={user.photoURL} alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        referrerPolicy="no-referrer"
      />
    )
  }

  const nombre = user.displayName || user.email || user.phoneNumber || '?'
  const inicial = nombre[0].toUpperCase()
  const bg      = colorDeSeed(nombre)

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 800, fontSize,
      letterSpacing: '-0.5px', userSelect: 'none',
    }}>
      {inicial}
    </div>
  )
}

/* ── Menú de perfil desplegable ── */
function AvatarPerfil({ user, onAjustes, onCerrarSesion }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const { lang, esPlanPlus, esPlanTrial } = useApp()

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return
    function cerrar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('touchstart', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('touchstart', cerrar)
    }
  }, [abierto])

  function cerrarY(fn) { setAbierto(false); fn() }

  // Info del plan
  let planLabel, planBg, planColor
  if (esPlanPlus)  { planLabel = '✨ Plus';             planBg = '#f3e8ff'; planColor = '#7c3aed' }
  else if (esPlanTrial) { planLabel = '⭐ Prueba activa'; planBg = '#ecfdf5'; planColor = '#059669' }
  else             { planLabel = t('plan_gratis', lang); planBg = '#f9fafb'; planColor = '#6b7280' }

  const nombre   = user ? (user.displayName || user.email || user.phoneNumber) : null
  const sublinea = user?.displayName ? (user.email || user.phoneNumber) : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botón avatar */}
      <button
        className="avatar-perfil-btn"
        onClick={() => setAbierto(v => !v)}
        aria-label="Menú de perfil"
        aria-expanded={abierto}
      >
        <AvatarCirculo user={user} size={40} />
      </button>

      {/* Menú desplegable */}
      {abierto && (
        <div className="menu-perfil" role="menu">
          {/* Header: avatar grande + nombre */}
          <div className="menu-perfil-header">
            <AvatarCirculo user={user} size={52} />
            <div className="menu-perfil-info">
              <p className="menu-perfil-nombre">
                {nombre || t('invitado', lang) || 'Invitado'}
              </p>
              {sublinea && <p className="menu-perfil-sub">{sublinea}</p>}
              <span
                className="menu-perfil-plan-badge"
                style={{ background: planBg, color: planColor }}
              >
                {planLabel}
              </span>
            </div>
          </div>

          <div className="menu-perfil-divider" />

          {/* Ajustes */}
          <button
            className="menu-perfil-item"
            onClick={() => cerrarY(onAjustes)}
            role="menuitem"
          >
            <span className="menu-perfil-item-icon" style={{ background: '#f3f4f6' }}>⚙️</span>
            {t('ajustes', lang).replace(/⚙️\s*/, '')}
          </button>

          {/* Cerrar sesión — solo si hay usuario autenticado */}
          {user && (
            <>
              <div className="menu-perfil-divider" />
              <button
                className="menu-perfil-item menu-perfil-item-danger"
                onClick={() => cerrarY(onCerrarSesion)}
                role="menuitem"
              >
                <span
                  className="menu-perfil-item-icon"
                  style={{ background: '#fef2f2' }}
                >
                  🚪
                </span>
                {t('cerrar_sesion', lang)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Contador de mensajes ── */
function ContadorPlan() {
  const { lang, esIlimitado, esPlanTrial, esPlanPlus, mensajesRestantes, limiteAlcanzado, diasTrialRestantes } = useApp()
  let clase = 'contador-plan'
  let texto = ''
  if (esPlanPlus)       { clase += ' contador-plus';   texto = '✨ Plus' }
  else if (esPlanTrial) { clase += ' contador-trial';  texto = `⭐ ${diasTrialRestantes}d` }
  else if (limiteAlcanzado) { clase += ' contador-limite'; texto = `💬 0/${LIMITE_FREE}` }
  else                  { texto = `💬 ${mensajesRestantes}/${LIMITE_FREE}` }
  return <div className={clase}>{texto}</div>
}

/* ── Encabezado ── */
function Encabezado({ pantalla, onVolver, user, onAjustes, onCerrarSesion }) {
  const hora = usarHora()
  const { lang, idioma } = useApp()
  const locale = LOCALE_MAP[lang] || idioma

  const formatHora  = d => d.toLocaleTimeString(locale,  { hour: '2-digit', minute: '2-digit' })
  const formatFecha = d => d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  const esChat = PANTALLAS_CHAT.has(pantalla)
  if (esChat) return null

  const esSubpantalla = PANTALLAS_CLASICAS.has(pantalla)

  if (esSubpantalla) {
    return (
      <div className="barra-superior">
        <button className="btn-volver" onClick={onVolver}>← {t('inicio', lang)}</button>
        <h2 style={{ flex: 1 }}>{t('ajustes', lang)}</h2>
        <div className="barra-superior-derecha">
          <ContadorPlan />
          <AvatarPerfil user={user} onAjustes={onAjustes} onCerrarSesion={onCerrarSesion} />
        </div>
      </div>
    )
  }

  return (
    <header className="encabezado">
      <div>
        <h1>🌸 Doña Rosa</h1>
        <div className="saludo">{formatFecha(hora)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ContadorPlan />
        <div className="hora">{formatHora(hora)}</div>
        <AvatarPerfil user={user} onAjustes={onAjustes} onCerrarSesion={onCerrarSesion} />
      </div>
    </header>
  )
}

/* ── Pantalla principal ── */
function PantallaInicio({ onNavegar, guidanceTarget }) {
  const hora = usarHora()
  const { lang } = useApp()
  const h = hora.getHours()
  const saludo = h < 12 ? t('buenos_dias', lang) : h < 19 ? t('buenas_tardes', lang) : t('buenas_noches', lang)

  // Rosa va primero — es el botón principal y más importante
  const botones = [
    { id: PANTALLAS.LIBRE,  voz: 'rosa',   Ico: IcoChat,  key: 'hablar_rosa',     clase: 'boton-morado boton-libre' },
    { id: PANTALLAS.LLAMAR, voz: 'llamar', Ico: IcoPhone, key: 'llamar_familia',  clase: 'boton-verde'  },
    { id: PANTALLAS.FOTOS,  voz: 'fotos',  Ico: IcoPhoto, key: 'ver_fotos',       clase: 'boton-azul'   },
    { id: PANTALLAS.PAGAR,  voz: 'pagar',  Ico: IcoCard,  key: 'pagar_servicios', clase: 'boton-naranja' },
    { id: PANTALLAS.AYUDA,  voz: 'ayuda',  Ico: IcoPulse, key: 'necesito_ayuda',  clase: 'boton-rojo'   },
  ]

  return (
    <main className="pantalla-principal">
      <div className="bienvenida">
        <h2>{saludo}</h2>
        <p>{t('que_deseas', lang)}</p>
      </div>
      <div className="grid-botones">
        {botones.map(b => (
          <button
            key={b.id}
            id={`btn-voz-${b.voz}`}
            className={`boton-principal ${b.clase}${guidanceTarget === b.voz ? ' boton-guiado' : ''}`}
            onClick={() => onNavegar(b.id)}
          >
            <span className="icono-svg"><b.Ico /></span>
            {t(b.key, lang)}
          </button>
        ))}
      </div>
    </main>
  )
}

/* ── App ── */
export default function App() {
  const [pantalla, setPantalla]         = useState(PANTALLAS.INICIO)
  const [modoSinLogin, setModoSinLogin] = useState(false)
  const [guidanceTarget, setGuidanceTarget] = useState(null)
  const { lang, idioma, sincronizarDesdeFirestore } = useApp()
  const { user, loading, cerrarSesion, firebaseConfigurado } = useAuth()

  useEffect(() => {
    if (user) sincronizarDesdeFirestore(user.uid)
  }, [user?.uid])

  function navegar(destino) { setPantalla(destino) }
  function irAjustes() {
    setPantalla(prev => prev === PANTALLAS.AJUSTES ? PANTALLAS.INICIO : PANTALLAS.AJUSTES)
  }
  function handleCerrarSesion() {
    cerrarSesion(); setModoSinLogin(false); setPantalla(PANTALLAS.INICIO)
  }

  /* ── Pantalla de carga ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0eb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72 }}>🌸</div>
          <p style={{ fontSize: 22, color: '#6b3fa0', marginTop: 16 }}>{t('cargando', lang)}</p>
        </div>
      </div>
    )
  }

  /* ── Auth gate ── */
  const autenticado = user || modoSinLogin || !firebaseConfigurado
  if (!autenticado) {
    return <PantallaAuth lang={lang} onContinuarSinLogin={() => setModoSinLogin(true)} />
  }

  const esChat    = PANTALLAS_CHAT.has(pantalla)
  const esClasica = PANTALLAS_CLASICAS.has(pantalla)
  const esInicio  = pantalla === PANTALLAS.INICIO

  function renderContenido() {
    if (esChat) return <ChatRosa contexto={pantalla} onCerrar={() => setPantalla(PANTALLAS.INICIO)} onNavegar={navegar} />
    if (pantalla === PANTALLAS.AJUSTES) return <PantallaAjustes />
    return <PantallaInicio onNavegar={navegar} guidanceTarget={guidanceTarget} />
  }

  return (
    <div className="app">
      <Encabezado
        pantalla={pantalla}
        onVolver={() => setPantalla(PANTALLAS.INICIO)}
        user={user}
        onAjustes={irAjustes}
        onCerrarSesion={handleCerrarSesion}
      />

      {esClasica
        ? <div className="pantalla-interna"><div className="contenido-pantalla">{renderContenido()}</div></div>
        : renderContenido()
      }

      {/* Burbuja flotante manual */}
      {!esChat && <BurbujaRosa onNavegar={navegar} />}

      {/* Wake word — siempre activo, envuelto en la burbuja flotante */}
      {!esChat && hayReconocimiento() && (
        <div style={{ position: 'fixed', bottom: 28, right: 112, zIndex: 501 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4c1d95, #6b3fa0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(76,29,149,0.45)',
              border: '2px solid rgba(255,255,255,0.3)',
              position: 'relative', cursor: 'default',
            }}
            title={lang === 'es' ? 'Di "Doña Rosa"' : 'Say "Doña Rosa"'}
          >
            <span style={{ fontSize: 22 }}>🎙️</span>
            <ActivacionVoz
              idioma={idioma}
              lang={lang}
              onGuia={setGuidanceTarget}
              onDismiss={() => setGuidanceTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
