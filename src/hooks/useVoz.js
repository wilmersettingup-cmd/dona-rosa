import { useState, useEffect, useRef, useCallback } from 'react'

/* ─── Detección de idioma ─── */

const MAPA_IDIOMAS = {
  es: 'es-MX', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR',
  de: 'de-DE', it: 'it-IT', ja: 'ja-JP', zh: 'zh-CN',
  ko: 'ko-KR', ar: 'ar-SA', ru: 'ru-RU', nl: 'nl-NL',
  pl: 'pl-PL', tr: 'tr-TR', sv: 'sv-SE', da: 'da-DK',
  fi: 'fi-FI', no: 'nb-NO', hi: 'hi-IN', ca: 'ca-ES',
}

export function detectarIdioma() {
  const raw = navigator.language || navigator.languages?.[0] || 'es'
  if (raw.includes('-')) return raw
  return MAPA_IDIOMAS[raw.toLowerCase()] ?? 'es-MX'
}

export const hayReconocimiento = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export const haySintesis = () => !!window.speechSynthesis

/* ─── Selección de voz femenina ─── */

const INDICADORES_FEMENINOS = [
  'female', 'woman', 'feminine', 'femenina',
  'paulina', 'monica', 'mónica', 'samantha', 'karen', 'victoria',
  'susan', 'marie', 'amélie', 'léa', 'anna', 'sarah', 'alice',
  'silvia', 'federica', 'luciana', 'francisca', 'joana', 'inês',
  'rosa', 'isabel', 'conchita', 'ines', 'laura', 'helena', 'eva',
  'sofía', 'sofia', 'angela', 'milena', 'lena', 'natasha',
]

async function obtenerVoces() {
  const voces = window.speechSynthesis.getVoices()
  if (voces.length > 0) return voces
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout)
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

async function seleccionarVozFemenina(idioma) {
  const voces = await obtenerVoces()
  const base = idioma.split('-')[0].toLowerCase()
  const region = idioma.toLowerCase()

  // Prioridad: misma región > mismo idioma base + femenina > mismo idioma base
  const mismaRegion = voces.filter(v => v.lang.toLowerCase() === region)
  const mismoIdioma = voces.filter(v => v.lang.toLowerCase().startsWith(base))

  const esFemenina = (v) =>
    INDICADORES_FEMENINOS.some(ind => v.name.toLowerCase().includes(ind))

  return (
    mismaRegion.find(esFemenina) ||
    mismoIdioma.find(esFemenina) ||
    mismaRegion[0] ||
    mismoIdioma[0] ||
    null
  )
}

/* ─── Hook: reconocimiento de voz ─── */

export function useReconocimientoVoz(idioma, onResultado) {
  const [escuchando, setEscuchando] = useState(false)
  const [errorVoz, setErrorVoz] = useState(null)
  const recRef = useRef(null)

  const iniciar = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (recRef.current) {
      recRef.current.abort()
      recRef.current = null
    }

    const rec = new SR()
    rec.lang = idioma
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onstart = () => { setEscuchando(true); setErrorVoz(null) }
    rec.onend   = () => { setEscuchando(false); recRef.current = null }
    rec.onerror = (e) => {
      setEscuchando(false)
      recRef.current = null
      if (e.error !== 'no-speech' && e.error !== 'aborted') setErrorVoz(e.error)
    }
    rec.onresult = (e) => {
      const texto = e.results[0]?.[0]?.transcript?.trim()
      if (texto) onResultado(texto)
    }

    recRef.current = rec
    rec.start()
  }, [idioma, onResultado])

  const detener = useCallback(() => {
    if (recRef.current) { recRef.current.stop(); recRef.current = null }
    setEscuchando(false)
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])

  return { escuchando, errorVoz, iniciar, detener }
}

/* ─── Hook: síntesis de voz ─── */

export function useSintesisVoz(idioma) {
  const [hablando, setHablando] = useState(false)
  const vozRef = useRef(null)

  const hablar = useCallback(async (texto) => {
    if (!window.speechSynthesis || !texto?.trim()) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(texto)
    utterance.lang    = idioma
    utterance.rate    = 0.82   // lento para adultos mayores
    utterance.pitch   = 1.15  // femenina
    utterance.volume  = 1.0

    const voz = await seleccionarVozFemenina(idioma)
    if (voz) utterance.voice = voz

    utterance.onstart = () => setHablando(true)
    utterance.onend   = () => setHablando(false)
    utterance.onerror = () => setHablando(false)

    vozRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [idioma])

  const detener = useCallback(() => {
    window.speechSynthesis?.cancel()
    setHablando(false)
  }, [])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return { hablando, hablar, detener }
}
