import { useState, useEffect } from 'react'
import { useApp, PLANES, LIMITE_FREE, DIAS_TRIAL } from '../context/AppContext'
import { t } from '../i18n/t'
import { getApiKey, setApiKey } from '../utils/storage'

// Re-export so existing callers (ChatRosa) still work
export { getApiKey } from '../utils/storage'

export default function PantallaAjustes() {
  const { lang, idioma, plan, esIlimitado, esPlanTrial, esPlanPlus, mensajesHoy, mensajesRestantes, diasTrialRestantes, activarTrial, activarPlus, guardarApiKeyNube } = useApp()

  const [clave, setClave]     = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    const saved = getApiKey()
    if (saved) setClave(saved)
  }, [])

  function guardar() {
    const limpia = clave.trim()
    if (!limpia) return
    setApiKey(limpia)
    guardarApiKeyNube(limpia)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  function borrar() {
    setApiKey('')
    setClave('')
  }

  const tieneKey = clave.trim().length > 0

  const nombrePlan = esPlanPlus ? t('plan_plus', lang) : esPlanTrial ? t('plan_trial', lang) : t('plan_gratis', lang)
  const porcentajeUsado = esIlimitado ? 0 : Math.min(100, (mensajesHoy / LIMITE_FREE) * 100)

  return (
    <div style={{ maxWidth:600, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Clave de API ── */}
      <div style={{ background:'#fef9c3', border:'2px solid #ca8a04', borderRadius:16, padding:20 }}>
        <p style={{ fontSize:20, color:'#92400e', fontWeight:700 }}>🔑 {t('clave_api_titulo', lang)}</p>
        <p style={{ fontSize:18, color:'#78350f', marginTop:8 }}>{t('clave_api_desc', lang)}</p>
      </div>

      <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
        <label style={{ display:'block', fontSize:20, fontWeight:700, color:'#333', marginBottom:12 }}>
          {t('tu_clave', lang)}
        </label>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input
            type={mostrar ? 'text' : 'password'}
            value={clave}
            onChange={e => setClave(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardar()}
            placeholder="sk-ant-..."
            style={{ flex:1, fontSize:18, padding:'14px 16px', borderRadius:12, border:'2px solid #d1d5db', outline:'none', fontFamily:'monospace' }}
          />
          <button onClick={() => setMostrar(v => !v)}
            style={{ background:'#f3f4f6', color:'#374151', fontSize:22, padding:'12px 14px', borderRadius:12, border:'2px solid #d1d5db', cursor:'pointer', flexShrink:0 }}>
            {mostrar ? '🙈' : '👁️'}
          </button>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <button onClick={guardar} disabled={!tieneKey}
            style={{ flex:1, background: tieneKey ? '#2e9e5b' : '#9ca3af', color:'white', fontSize:22, fontWeight:700, padding:16, borderRadius:12, border:'none', cursor: tieneKey ? 'pointer' : 'default' }}>
            {guardado ? t('guardado', lang) : t('guardar', lang)}
          </button>
          {tieneKey && (
            <button onClick={borrar}
              style={{ background:'#fee2e2', color:'#dc2626', fontSize:22, fontWeight:700, padding:'16px 20px', borderRadius:12, border:'none', cursor:'pointer' }}>
              🗑️
            </button>
          )}
        </div>
      </div>

      <div style={{ background:'#f0f9ff', border:'2px solid #0ea5e9', borderRadius:16, padding:18 }}>
        <p style={{ fontSize:20, color:'#0c4a6e', fontWeight:700 }}>
          {t('estado', lang)}: {tieneKey ? t('clave_ok', lang) : t('sin_clave', lang)}
        </p>
        <p style={{ fontSize:17, color:'#0369a1', marginTop:6 }}>
          {tieneKey ? t('rosa_lista_chat', lang) : t('ingresa_clave', lang)}
        </p>
      </div>

      {/* ── Tu plan ── */}
      <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize:22, fontWeight:800, color:'#333', marginBottom:16 }}>
          {t('tu_plan', lang)}: <span style={{ color: esPlanPlus ? '#7c3aed' : esPlanTrial ? '#059669' : '#374151' }}>{nombrePlan}</span>
        </p>

        {/* Contador de mensajes */}
        {!esIlimitado ? (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, color:'#555', marginBottom:6 }}>
              <span>{mensajesHoy} / {LIMITE_FREE} {t('msgs_restantes', lang)}</span>
              <span style={{ color: mensajesRestantes <= 3 ? '#dc2626' : '#2e9e5b', fontWeight:700 }}>
                {mensajesRestantes} restantes
              </span>
            </div>
            <div style={{ height:12, background:'#f3f4f6', borderRadius:8, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${porcentajeUsado}%`, background: porcentajeUsado >= 90 ? '#dc2626' : '#2e9e5b', borderRadius:8, transition:'width 0.3s' }} />
            </div>
          </div>
        ) : (
          <p style={{ fontSize:20, color: esPlanPlus ? '#7c3aed' : '#059669', fontWeight:700, marginBottom:16 }}>
            {t('ilimitado', lang)}
          </p>
        )}

        {esPlanTrial && (
          <p style={{ fontSize:18, color:'#059669', marginBottom:12 }}>
            ⏰ {diasTrialRestantes} {t('dias_trial', lang)}
          </p>
        )}

        {/* Botones de upgrade */}
        {plan === PLANES.FREE && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={activarTrial}
              style={{ background:'#2e9e5b', color:'white', fontSize:20, fontWeight:700, padding:16, borderRadius:14, border:'none', cursor:'pointer' }}>
              {t('activar_trial', lang)}
            </button>
            <p style={{ fontSize:15, color:'#6b7280', textAlign:'center', margin:0 }}>{t('trial_sin_tarjeta', lang)}</p>
            <button onClick={activarPlus}
              style={{ background:'#7c3aed', color:'white', fontSize:20, fontWeight:700, padding:16, borderRadius:14, border:'none', cursor:'pointer', marginTop:4 }}>
              {t('plan_plus_precio', lang)}
            </button>
          </div>
        )}
        {esPlanTrial && (
          <button onClick={activarPlus}
            style={{ background:'#7c3aed', color:'white', fontSize:20, fontWeight:700, padding:16, borderRadius:14, border:'none', cursor:'pointer', width:'100%' }}>
            {t('plan_plus_precio', lang)}
          </button>
        )}
      </div>

      {/* ── Idioma ── */}
      <div style={{ background:'#f9fafb', borderRadius:14, padding:16, fontSize:17, color:'#6b7280' }}>
        <p style={{ fontWeight:700, color:'#374151', marginBottom:4 }}>🌐 {t('como_obtener', lang)}</p>
        <p>1. console.anthropic.com</p>
        <p>2. API Keys → Create new</p>
        <p style={{ marginTop:8, fontStyle:'italic' }}>Idioma detectado: {idioma}</p>
      </div>
    </div>
  )
}
