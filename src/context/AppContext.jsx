import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { detectarIdioma } from '../hooks/useVoz'
import { getLang } from '../i18n/t'
import { cargarDatosUsuario, guardarDatosUsuario } from './AuthContext'
import { db } from '../firebase/config'
import { getApiKey, setApiKey } from '../utils/storage'

const AppContext = createContext(null)

export const PLANES    = { FREE: 'free', TRIAL: 'trial', PLUS: 'plus' }
export const LIMITE_FREE = 10
export const DIAS_TRIAL  = 7

const K = {
  PLAN:        'drosa-plan',
  TRIAL_START: 'drosa-trial-start',
  MSGS_PREFIX: 'drosa-msgs-',
}

const hoyKey  = () => K.MSGS_PREFIX + new Date().toISOString().split('T')[0]
const hoyFecha = () => new Date().toISOString().split('T')[0]
const leerMsgs = () => parseInt(localStorage.getItem(hoyKey()) || '0', 10)

export function AppProvider({ children }) {
  const idioma = detectarIdioma()
  const lang   = getLang(idioma)

  const [plan, setPlan]             = useState(() => localStorage.getItem(K.PLAN) || PLANES.FREE)
  const [trialStart, setTrialStart] = useState(() => {
    const v = localStorage.getItem(K.TRIAL_START)
    return v ? parseInt(v, 10) : null
  })
  const [mensajesHoy, setMensajesHoy] = useState(leerMsgs)
  const uidRef = useRef(null)   // ref (no state) para evitar closures stale

  useEffect(() => {
    const id = setInterval(() => setMensajesHoy(leerMsgs()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── Sync Firestore ── */
  async function syncFirestore(datos) {
    if (!uidRef.current || !db) return
    try {
      await guardarDatosUsuario(uidRef.current, datos)
    } catch { /* fallo silencioso — los datos locales son la fuente de verdad */ }
  }

  async function sincronizarDesdeFirestore(userId) {
    if (!userId) return
    uidRef.current = userId
    try {
      const datos = await cargarDatosUsuario(userId)
      if (!datos) return
      if (datos.plan) {
        setPlan(datos.plan); localStorage.setItem(K.PLAN, datos.plan)
      }
      if (datos.trialStart) {
        setTrialStart(datos.trialStart); localStorage.setItem(K.TRIAL_START, String(datos.trialStart))
      }
      const count = datos.mensajesPorFecha?.[hoyFecha()] ?? 0
      setMensajesHoy(count); localStorage.setItem(hoyKey(), String(count))
      if (datos.apiKey && !getApiKey()) setApiKey(datos.apiKey)
    } catch { /* usa datos locales */ }
  }

  /* ── Derived ── */
  const trialActivo    = plan === PLANES.TRIAL && trialStart !== null &&
    Date.now() < trialStart + DIAS_TRIAL * 86_400_000
  const esPlanPlus     = plan === PLANES.PLUS
  const esPlanTrial    = trialActivo
  const esIlimitado    = esPlanPlus || esPlanTrial
  const diasTrialRestantes = trialStart
    ? Math.max(0, Math.ceil((trialStart + DIAS_TRIAL * 86_400_000 - Date.now()) / 86_400_000))
    : 0
  const limiteAlcanzado   = !esIlimitado && mensajesHoy >= LIMITE_FREE
  const mensajesRestantes = esIlimitado ? Infinity : Math.max(0, LIMITE_FREE - mensajesHoy)

  /* ── Actions ── */
  const consumirMensaje = useCallback(() => {
    if (esIlimitado) return
    const nuevo = mensajesHoy + 1
    setMensajesHoy(nuevo); localStorage.setItem(hoyKey(), String(nuevo))
    syncFirestore({ [`mensajesPorFecha.${hoyFecha()}`]: nuevo })
  }, [mensajesHoy, esIlimitado])

  const activarTrial = useCallback(() => {
    const ahora = Date.now()
    setPlan(PLANES.TRIAL); setTrialStart(ahora)
    localStorage.setItem(K.PLAN, PLANES.TRIAL)
    localStorage.setItem(K.TRIAL_START, String(ahora))
    syncFirestore({ plan: PLANES.TRIAL, trialStart: ahora })
  }, [])

  const activarPlus = useCallback(() => {
    setPlan(PLANES.PLUS); localStorage.setItem(K.PLAN, PLANES.PLUS)
    syncFirestore({ plan: PLANES.PLUS })
  }, [])

  const guardarApiKeyNube = useCallback((apiKey) => {
    syncFirestore({ apiKey })
  }, [])

  return (
    <AppContext.Provider value={{
      idioma, lang,
      plan, esPlanPlus, esPlanTrial, esIlimitado,
      mensajesHoy, mensajesRestantes, limiteAlcanzado, diasTrialRestantes,
      consumirMensaje, activarTrial, activarPlus,
      sincronizarDesdeFirestore, guardarApiKeyNube,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
