import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { t } from '../../i18n/t'
import LoginEmail from './LoginEmail'
import LoginTelefono from './LoginTelefono'

const SVG_GOOGLE = (
  <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

function PantallaFirebaseSetup({ lang, onContinuarSinLogin }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #f5f0ff 0%, #e8f4fd 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 520, width: '100%', background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 64 }}>🌸</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#6b3fa0', margin: '12px 0 4px' }}>Doña Rosa</h1>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: 0 }}>{t('firebase_titulo', lang)}</p>
        </div>

        <p style={{ fontSize: 18, color: '#555', marginBottom: 16 }}>{t('firebase_desc', lang)}</p>

        <div style={{ background: '#f9fafb', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {['firebase_paso1','firebase_paso2','firebase_paso3','firebase_paso4'].map(k => (
            <p key={k} style={{ fontSize: 17, color: '#374151', margin: 0 }}>{t(k, lang)}</p>
          ))}
        </div>

        <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 16, color: '#92400e', margin: 0 }}>
            📁 Edita <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> en la raíz del proyecto con tus credenciales de Firebase, luego reinicia el servidor.
          </p>
        </div>

        <button onClick={onContinuarSinLogin}
          style={{ width: '100%', background: '#6b3fa0', color: 'white', fontSize: 20, fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer' }}>
          {t('firebase_continuar', lang)}
        </button>
      </div>
    </div>
  )
}

export default function PantallaAuth({ lang, onContinuarSinLogin }) {
  const { loginGoogle, firebaseConfigurado } = useAuth()
  const [vista, setVista]   = useState('inicio')  // 'inicio' | 'email' | 'telefono'
  const [error, setError]   = useState('')
  const [cargando, setCargando] = useState(false)

  if (!firebaseConfigurado) {
    return <PantallaFirebaseSetup lang={lang} onContinuarSinLogin={onContinuarSinLogin} />
  }

  async function handleGoogle() {
    setError(''); setCargando(true)
    try { await loginGoogle() }
    catch (err) { if (err.code !== 'auth/popup-closed-by-user') setError(t('err_generico', lang)) }
    finally { setCargando(false) }
  }

  const btnBase = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 14, padding: '18px 20px', borderRadius: 16, border: 'none',
    fontSize: 20, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s',
  }

  if (vista === 'email')    return <AuthWrapper lang={lang}><LoginEmail lang={lang} onVolver={() => setVista('inicio')} /></AuthWrapper>
  if (vista === 'telefono') return <AuthWrapper lang={lang}><LoginTelefono lang={lang} onVolver={() => setVista('inicio')} /></AuthWrapper>

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f5f0ff 0%, #e0f0ff 50%, #f0fff4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>
      {/* Logo + título */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(107,63,160,0.25))' }}>🌸</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#6b3fa0', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Doña Rosa
        </h1>
        <p style={{ fontSize: 20, color: '#6b7280', margin: 0 }}>{t('frase_bienvenida', lang)}</p>
      </div>

      {/* Botones de login */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 400 }}>
        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={cargando}
          style={{ ...btnBase, background: 'white', color: '#374151', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', opacity: cargando ? 0.7 : 1 }}>
          {SVG_GOOGLE}
          {cargando ? t('cargando', lang) : t('continuar_google', lang)}
        </button>

        {/* Email */}
        <button
          onClick={() => setVista('email')}
          style={{ ...btnBase, background: '#6b3fa0', color: 'white', boxShadow: '0 4px 16px rgba(107,63,160,0.4)' }}>
          ✉️ {t('continuar_email', lang)}
        </button>

        {/* Teléfono */}
        <button
          onClick={() => setVista('telefono')}
          style={{ ...btnBase, background: '#2e9e5b', color: 'white', boxShadow: '0 4px 16px rgba(46,158,91,0.4)' }}>
          📱 {t('continuar_telefono', lang)}
        </button>

        {error && <p style={{ color: '#dc2626', fontSize: 18, textAlign: 'center', margin: 0 }}>⚠️ {error}</p>}

        <button onClick={onContinuarSinLogin}
          style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 17, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>
          {t('firebase_continuar', lang)}
        </button>
      </div>
    </div>
  )
}

function AuthWrapper({ lang, children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #f5f0ff 0%, #e0f0ff 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 56 }}>🌸</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#6b3fa0', margin: '8px 0 0' }}>Doña Rosa</h2>
      </div>
      <div style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        {children}
      </div>
    </div>
  )
}
