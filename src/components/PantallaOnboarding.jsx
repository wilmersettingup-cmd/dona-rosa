import { useState } from 'react'
import { useApp } from '../context/AppContext'

/* Mini grid SVG — representa los 4 botones de la app */
function GridBotones() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <rect x="4"  y="4"  width="46" height="46" rx="12" fill="#1a1042" opacity="0.9"/>
      <rect x="60" y="4"  width="46" height="46" rx="12" fill="#221450" opacity="0.9"/>
      <rect x="4"  y="60" width="46" height="46" rx="12" fill="#2a1a5e" opacity="0.9"/>
      <rect x="60" y="60" width="46" height="46" rx="12" fill="#31206c" opacity="0.9"/>
      {/* Phone icon */}
      <path d="M19 18.5c.5 1 1.1 1.9 1.8 2.7l-1.1 1.1c-.2.2-.2.5 0 .8 1.4 1.6 3.1 2.9 5 3.9.3.1.6.1.8-.1l1.1-1.1c.8.7 1.7 1.3 2.7 1.8.3.1.6 0 .7-.3l.6-2c.1-.3 0-.6-.3-.7-1-.4-1.9-1-2.7-1.7l-1.3 1.3c-1.4-.8-2.6-1.9-3.5-3.1l1.3-1.3c-.7-.8-1.3-1.7-1.7-2.7-.1-.3-.4-.4-.7-.3l-2 .6c-.3 0-.4.3-.3.6-.1 0-.1 0 0 0 0-.1 0-.1 0 0z" fill="white" opacity="0.7" transform="translate(0,-1)"/>
      {/* Photo icon */}
      <rect x="67" y="13" width="30" height="22" rx="3" stroke="white" strokeWidth="2" opacity="0.7"/>
      <circle cx="74" cy="20" r="2.5" fill="white" opacity="0.7"/>
      <polyline points="93,30 87,24 75,36" stroke="white" strokeWidth="2" opacity="0.7" fill="none"/>
      {/* Card icon */}
      <rect x="11" y="68" width="32" height="21" rx="3" stroke="white" strokeWidth="2" opacity="0.7"/>
      <line x1="11" y1="75" x2="43" y2="75" stroke="white" strokeWidth="2" opacity="0.7"/>
      {/* Pulse icon */}
      <polyline points="62,83 67,83 70,76 76,90 82,76 85,83 92,83" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" fill="none"/>
    </svg>
  )
}

const SLIDES = {
  es: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Hola,\nsoy Doña Rosa',
      sub: 'Tu asistente personal para el día a día. Estoy aquí para ayudarte cuando lo necesites.',
    },
    {
      tipo: 'grid',
      titulo: 'Todo con\nun solo toque',
      sub: 'Llama a tu familia, ve tus fotos, paga servicios o pide ayuda — desde botones grandes y claros.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Habla\nconmigo',
      sub: 'Di "Doña Rosa" en voz alta o toca el botón morado. Te guío paso a paso, sin complicaciones.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: '¡Todo\nlisto!',
      sub: 'Estoy aquí siempre que me necesites.\n¡Bienvenida!',
    },
  ],
  en: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Hi,\nI\'m Doña Rosa',
      sub: 'Your personal assistant for everyday life. I\'m here whenever you need me.',
    },
    {
      tipo: 'grid',
      titulo: 'Everything with\none tap',
      sub: 'Call family, view photos, pay bills, or ask for help — all from large, clear buttons.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Talk\nto me',
      sub: 'Say "Doña Rosa" out loud or tap the purple button. I\'ll guide you step by step.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: 'All\nset!',
      sub: 'I\'m here whenever you need me.\nWelcome!',
    },
  ],
  pt: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Olá,\nsou Doña Rosa',
      sub: 'Sua assistente pessoal para o dia a dia. Estou aqui para ajudá-la.',
    },
    {
      tipo: 'grid',
      titulo: 'Tudo com\num toque',
      sub: 'Ligue para a família, veja fotos, pague serviços ou peça ajuda — com botões grandes e claros.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Fale\ncomigo',
      sub: 'Diga "Doña Rosa" em voz alta ou toque o botão roxo. Vou guiá-la passo a passo.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: 'Tudo\npronto!',
      sub: 'Estou aqui sempre que precisar.\nBem-vinda!',
    },
  ],
  fr: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Bonjour,\nje suis Doña Rosa',
      sub: 'Votre assistante personnelle au quotidien. Je suis là pour vous aider.',
    },
    {
      tipo: 'grid',
      titulo: 'Tout en\nun geste',
      sub: 'Appelez la famille, voyez vos photos, payez des services ou demandez de l\'aide — en un seul toucher.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Parlez-\nmoi',
      sub: 'Dites "Doña Rosa" à voix haute ou touchez le bouton violet. Je vous guide pas à pas.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: 'Tout est\nprêt !',
      sub: 'Je suis là quand vous avez besoin.\nBienvenue !',
    },
  ],
  it: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Ciao,\nsono Doña Rosa',
      sub: 'La tua assistente personale per la vita quotidiana. Sono qui per aiutarti.',
    },
    {
      tipo: 'grid',
      titulo: 'Tutto con\nun tocco',
      sub: 'Chiama la famiglia, guarda le foto, paga i servizi o chiedi aiuto — con pulsanti grandi e chiari.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Parla\ncon me',
      sub: 'Di "Doña Rosa" a voce alta o tocca il pulsante viola. Ti guido passo dopo passo.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: 'Tutto\npronto!',
      sub: 'Sono qui ogni volta che hai bisogno.\nBenvenuta!',
    },
  ],
  de: [
    {
      tipo: 'emoji',
      visual: '🌸',
      titulo: 'Hallo,\nich bin Doña Rosa',
      sub: 'Ihre persönliche Assistentin für den Alltag. Ich bin hier, wenn Sie mich brauchen.',
    },
    {
      tipo: 'grid',
      titulo: 'Alles mit\neinem Tipp',
      sub: 'Familie anrufen, Fotos ansehen, Dienste bezahlen oder Hilfe rufen — alles mit großen Tasten.',
    },
    {
      tipo: 'emoji',
      visual: '🎙️',
      titulo: 'Sprechen\nSie mit mir',
      sub: 'Sagen Sie „Doña Rosa" laut oder tippen Sie auf die lila Taste. Ich führe Sie Schritt für Schritt.',
    },
    {
      tipo: 'emoji',
      visual: '✅',
      titulo: 'Alles\nbereit!',
      sub: 'Ich bin immer da, wenn Sie mich brauchen.\nWillkommen!',
    },
  ],
}

const BTN_TX = {
  es: { sig: 'Siguiente', emp: '¡Empezar!',      omit: 'Omitir' },
  en: { sig: 'Next',      emp: 'Get started!',   omit: 'Skip'   },
  pt: { sig: 'Próximo',   emp: 'Começar!',        omit: 'Pular'  },
  fr: { sig: 'Suivant',   emp: 'Commencer !',     omit: 'Ignorer' },
  it: { sig: 'Avanti',    emp: 'Iniziare!',       omit: 'Salta'  },
  de: { sig: 'Weiter',    emp: 'Loslegen!',       omit: 'Überspringen' },
}

export default function PantallaOnboarding({ onComplete }) {
  const { lang } = useApp()
  const [paso, setPaso]       = useState(0)
  const [saliendo, setSaliendo] = useState(false)

  const slides  = SLIDES[lang] || SLIDES.es
  const tx      = BTN_TX[lang] || BTN_TX.es
  const slide   = slides[paso]
  const esUltimo = paso === slides.length - 1

  function avanzar() {
    if (esUltimo) { onComplete(); return }
    setSaliendo(true)
    setTimeout(() => { setPaso(p => p + 1); setSaliendo(false) }, 200)
  }

  return (
    <div className="onboarding-overlay">
      {/* Skip */}
      {!esUltimo && (
        <button className="onboarding-skip" onClick={onComplete}>
          {tx.omit}
        </button>
      )}

      {/* Contenido animado */}
      <div className={`onboarding-contenido ${saliendo ? 'onboarding-saliendo' : ''}`} key={paso}>
        <div className="onboarding-visual">
          {slide.tipo === 'grid'
            ? <GridBotones />
            : <span className="onboarding-emoji">{slide.visual}</span>
          }
        </div>
        <h1 className="onboarding-titulo">{slide.titulo}</h1>
        <p  className="onboarding-sub">{slide.sub}</p>
      </div>

      {/* Footer: dots + botón */}
      <div className="onboarding-footer">
        <div className="onboarding-dots" role="tablist">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot${i === paso ? ' activo' : ''}`}
              role="tab"
              aria-selected={i === paso}
            />
          ))}
        </div>
        <button className="onboarding-btn-sig" onClick={avanzar}>
          {esUltimo ? tx.emp : `${tx.sig} →`}
        </button>
      </div>
    </div>
  )
}
