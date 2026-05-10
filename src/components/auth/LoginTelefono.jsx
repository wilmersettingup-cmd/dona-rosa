import { useState, useRef } from 'react'
import { useAuth, firebaseErrorKey } from '../../context/AuthContext'
import { t } from '../../i18n/t'

export default function LoginTelefono({ lang, onVolver }) {
  const { enviarCodigoSMS } = useAuth()
  const [paso, setPaso]           = useState(1)
  const [telefono, setTelefono]   = useState('')
  const [digitos, setDigitos]     = useState(['', '', '', '', '', ''])
  const [resultado, setResultado] = useState(null)
  const [error, setError]         = useState('')
  const [cargando, setCargando]   = useState(false)
  const inputsRef = useRef([])

  /* ─ Paso 1: enviar SMS ─ */
  async function enviarSMS(e) {
    e.preventDefault()
    setError('')
    const tel = telefono.trim()
    if (!tel.startsWith('+')) { setError('Usa formato internacional: +52 55 1234 5678'); return }
    setCargando(true)
    try {
      const res = await enviarCodigoSMS(tel, 'recaptcha-container')
      setResultado(res)
      setPaso(2)
    } catch (err) {
      const k = firebaseErrorKey(err.code)
      if (k) setError(t(k, lang))
      else setError(t('err_generico', lang))
    } finally { setCargando(false) }
  }

  /* ─ Paso 2: verificar código ─ */
  async function verificar(e) {
    e.preventDefault()
    setError('')
    const codigo = digitos.join('')
    if (codigo.length !== 6) { setError(t('err_codigo', lang)); return }
    setCargando(true)
    try {
      await resultado.confirm(codigo)
      // onAuthStateChanged en AuthContext detecta el login automáticamente
    } catch (err) {
      const k = firebaseErrorKey(err.code)
      if (k) setError(t(k, lang))
      else setError(t('err_generico', lang))
    } finally { setCargando(false) }
  }

  /* ─ Input de dígitos (6 casillas) ─ */
  function handleDigito(idx, val) {
    if (!/^\d?$/.test(val)) return
    const nuevo = [...digitos]
    nuevo[idx] = val
    setDigitos(nuevo)
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus()
    if (!val && idx > 0) inputsRef.current[idx - 1]?.focus()
  }

  function handleKeyDigito(idx, e) {
    if (e.key === 'Backspace' && !digitos[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus()
    }
  }

  const inp = {
    padding: '16px', borderRadius: 14, border: '2px solid #d1d5db',
    fontSize: 20, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* reCAPTCHA SIEMPRE en el DOM (Firebase lo necesita antes de llamar signInWithPhoneNumber) */}
      <div id="recaptcha-container" style={{ position: 'absolute', bottom: 0, left: 0 }} />

      {paso === 1 ? (
        <form onSubmit={enviarSMS} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input style={inp} type="tel" placeholder={t('numero_celular', lang)}
            value={telefono} onChange={e => setTelefono(e.target.value)}
            autoComplete="tel" autoFocus />

          {error && <p style={{ color: '#dc2626', fontSize: 18, margin: 0 }}>⚠️ {error}</p>}

          <button type="submit" disabled={cargando}
            style={{ background: '#2e9e5b', color: 'white', fontSize: 22, fontWeight: 700, padding: '18px', borderRadius: 14, border: 'none', cursor: 'pointer', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? t('cargando', lang) : t('enviar_codigo', lang)}
          </button>

          <button type="button" onClick={onVolver}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 17, cursor: 'pointer' }}>
            ← {t('cancelar', lang)}
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 19, color: '#374151', textAlign: 'center', margin: 0 }}>
            {t('codigo_enviado', lang)} <strong>{telefono}</strong>
          </p>

          {/* 6 casillas */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {digitos.map((d, i) => (
              <input key={i}
                ref={el => inputsRef.current[i] = el}
                type="tel" maxLength={1} value={d}
                onChange={e => handleDigito(i, e.target.value)}
                onKeyDown={e => handleKeyDigito(i, e)}
                style={{
                  width: 52, height: 64, textAlign: 'center', fontSize: 28, fontWeight: 700,
                  border: '2px solid #d1d5db', borderRadius: 12, outline: 'none',
                  background: d ? '#f0fdf4' : 'white',
                }}
              />
            ))}
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: 18, margin: 0, textAlign: 'center' }}>⚠️ {error}</p>}

          <button type="submit" disabled={cargando || digitos.join('').length < 6}
            style={{ background: '#2e9e5b', color: 'white', fontSize: 22, fontWeight: 700, padding: '18px', borderRadius: 14, border: 'none', cursor: 'pointer', opacity: cargando || digitos.join('').length < 6 ? 0.6 : 1 }}>
            {cargando ? t('cargando', lang) : t('verificar', lang)}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => { setPaso(1); setDigitos(['','','','','','']); setError('') }}
              style={{ background: 'none', border: 'none', color: '#6b3fa0', fontSize: 17, cursor: 'pointer', textDecoration: 'underline' }}>
              {t('reenviar', lang)}
            </button>
            <button type="button" onClick={onVolver}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 17, cursor: 'pointer' }}>
              ← {t('cancelar', lang)}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
