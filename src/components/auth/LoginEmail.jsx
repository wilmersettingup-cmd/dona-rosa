import { useState } from 'react'
import { useAuth, firebaseErrorKey } from '../../context/AuthContext'
import { t } from '../../i18n/t'

export default function LoginEmail({ lang, onVolver }) {
  const { loginEmail, registrarEmail, resetPassword } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'registro' | 'reset'
  const [nombre, setNombre]       = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]         = useState('')
  const [info, setInfo]           = useState('')
  const [cargando, setCargando]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setInfo('')

    if (modo === 'reset') {
      if (!email) { setError(t('err_email', lang)); return }
      setCargando(true)
      try {
        await resetPassword(email)
        setInfo(t('reset_enviado', lang))
        setModo('login')
      } catch (err) {
        const k = firebaseErrorKey(err.code)
        if (k) setError(t(k, lang))
      } finally { setCargando(false) }
      return
    }

    if (!email || !password) { setError(t('err_email', lang)); return }
    if (modo === 'registro') {
      if (password.length < 6) { setError(t('err_password', lang)); return }
      if (password !== password2) { setError(t('err_passwords', lang)); return }
    }

    setCargando(true)
    try {
      if (modo === 'login') {
        await loginEmail(email, password)
      } else {
        await registrarEmail(email, password, nombre)
      }
    } catch (err) {
      const k = firebaseErrorKey(err.code)
      if (k) setError(t(k, lang))
    } finally { setCargando(false) }
  }

  const inp = {
    padding: '16px', borderRadius: 14, border: '2px solid #d1d5db',
    fontSize: 20, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {modo === 'registro' && (
        <input style={inp} type="text" placeholder={t('tu_nombre', lang)}
          value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
      )}

      <input style={inp} type="email" placeholder={t('correo', lang)}
        value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

      {modo !== 'reset' && (
        <input style={inp} type="password" placeholder={t('contrasena', lang)}
          value={password} onChange={e => setPassword(e.target.value)} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} />
      )}

      {modo === 'registro' && (
        <input style={inp} type="password" placeholder={t('confirmar_contrasena', lang)}
          value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
      )}

      {error && <p style={{ color: '#dc2626', fontSize: 18, margin: 0 }}>⚠️ {error}</p>}
      {info  && <p style={{ color: '#059669', fontSize: 18, margin: 0 }}>✅ {info}</p>}

      <button type="submit" disabled={cargando}
        style={{ background: '#6b3fa0', color: 'white', fontSize: 22, fontWeight: 700, padding: '18px', borderRadius: 14, border: 'none', cursor: 'pointer', opacity: cargando ? 0.7 : 1 }}>
        {cargando ? t('cargando', lang) : modo === 'login' ? t('iniciar_sesion', lang) : modo === 'reset' ? t('enviar_codigo', lang) : t('crear_cuenta', lang)}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginTop: 4 }}>
        {modo === 'login' && (
          <>
            <button type="button" onClick={() => { setModo('reset'); setError(''); setInfo('') }}
              style={{ background: 'none', border: 'none', color: '#6b3fa0', fontSize: 18, cursor: 'pointer', textDecoration: 'underline' }}>
              {t('olvide_contrasena', lang)}
            </button>
            <button type="button" onClick={() => { setModo('registro'); setError(''); setInfo('') }}
              style={{ background: 'none', border: 'none', color: '#374151', fontSize: 18, cursor: 'pointer' }}>
              {t('no_tienes_cuenta', lang)}
            </button>
          </>
        )}
        {(modo === 'registro' || modo === 'reset') && (
          <button type="button" onClick={() => { setModo('login'); setError(''); setInfo('') }}
            style={{ background: 'none', border: 'none', color: '#374151', fontSize: 18, cursor: 'pointer' }}>
            {t('ya_tienes_cuenta', lang)}
          </button>
        )}
        <button type="button" onClick={onVolver}
          style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 17, cursor: 'pointer', marginTop: 4 }}>
          ← {t('cancelar', lang)}
        </button>
      </div>
    </form>
  )
}
