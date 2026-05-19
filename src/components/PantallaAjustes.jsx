import { useApp, PLANES, LIMITE_FREE, DIAS_TRIAL } from '../context/AppContext'
import { t } from '../i18n/t'

export default function PantallaAjustes() {
  const {
    lang, idioma, plan, esIlimitado, esPlanTrial, esPlanPlus,
    mensajesHoy, mensajesRestantes, diasTrialRestantes,
    activarTrial, activarPlus,
  } = useApp()

  const nombrePlan = esPlanPlus ? t('plan_plus', lang) : esPlanTrial ? t('plan_trial', lang) : t('plan_gratis', lang)
  const porcentajeUsado = esIlimitado ? 0 : Math.min(100, (mensajesHoy / LIMITE_FREE) * 100)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Tu plan ── */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#333', marginBottom: 16 }}>
          {t('tu_plan', lang)}: <span style={{ color: esPlanPlus ? '#7c3aed' : esPlanTrial ? '#059669' : '#374151' }}>{nombrePlan}</span>
        </p>

        {!esIlimitado ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#555', marginBottom: 6 }}>
              <span>{mensajesHoy} / {LIMITE_FREE} {t('msgs_restantes', lang)}</span>
              <span style={{ color: mensajesRestantes <= 3 ? '#dc2626' : '#2e9e5b', fontWeight: 700 }}>
                {mensajesRestantes} restantes
              </span>
            </div>
            <div style={{ height: 12, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${porcentajeUsado}%`,
                background: porcentajeUsado >= 90 ? '#dc2626' : '#2e9e5b',
                borderRadius: 8, transition: 'width 0.3s',
              }} />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 20, color: esPlanPlus ? '#7c3aed' : '#059669', fontWeight: 700, marginBottom: 16 }}>
            {t('ilimitado', lang)}
          </p>
        )}

        {esPlanTrial && (
          <p style={{ fontSize: 18, color: '#059669', marginBottom: 12 }}>
            ⏰ {diasTrialRestantes} {t('dias_trial', lang)}
          </p>
        )}

        {plan === PLANES.FREE && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={activarTrial}
              style={{ background: '#2e9e5b', color: 'white', fontSize: 20, fontWeight: 700, padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer' }}>
              {t('activar_trial', lang)}
            </button>
            <p style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', margin: 0 }}>{t('trial_sin_tarjeta', lang)}</p>
            <button onClick={activarPlus}
              style={{ background: '#7c3aed', color: 'white', fontSize: 20, fontWeight: 700, padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer', marginTop: 4 }}>
              {t('plan_plus_precio', lang)}
            </button>
          </div>
        )}

        {esPlanTrial && (
          <button onClick={activarPlus}
            style={{ background: '#7c3aed', color: 'white', fontSize: 20, fontWeight: 700, padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer', width: '100%' }}>
            {t('plan_plus_precio', lang)}
          </button>
        )}
      </div>

      {/* ── Idioma detectado ── */}
      <div style={{ background: '#f9fafb', borderRadius: 14, padding: 16, fontSize: 17, color: '#6b7280' }}>
        <p style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>🌐 {t('idioma', lang) || 'Idioma'}</p>
        <p style={{ fontStyle: 'italic' }}>{idioma}</p>
      </div>
    </div>
  )
}
