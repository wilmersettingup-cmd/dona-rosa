import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged, signOut,
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
  signInWithPhoneNumber, RecaptchaVerifier,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, firebaseConfigurado } from '../firebase/config'

const AuthContext = createContext(null)

/* ── Mapa de errores Firebase → clave i18n
   Firebase 9+ usa auth/invalid-credential en vez de user-not-found / wrong-password ── */
const ERRORES = {
  'auth/invalid-credential':        'err_password_mal',   // Firebase 9+ (email o pass incorrectos)
  'auth/user-not-found':            'err_no_usuario',     // legacy (Firebase <9)
  'auth/wrong-password':            'err_password_mal',   // legacy
  'auth/email-already-in-use':      'err_correo_uso',
  'auth/invalid-email':             'err_email',
  'auth/weak-password':             'err_password',
  'auth/missing-password':          'err_password',
  'auth/missing-email':             'err_email',
  'auth/invalid-phone-number':      'err_tel_invalido',
  'auth/invalid-verification-code': 'err_codigo',
  'auth/code-expired':              'err_codigo',
  'auth/too-many-requests':         'err_intentos',
  'auth/network-request-failed':    'err_generico',
  'auth/popup-closed-by-user':      null,   // silencioso
  'auth/cancelled-popup-request':   null,   // silencioso
}
export function firebaseErrorKey(code) {
  return Object.prototype.hasOwnProperty.call(ERRORES, code)
    ? ERRORES[code]
    : 'err_generico'
}

/* ── Helpers Firestore ── */
async function crearPerfilUsuario(user) {
  if (!db) return
  const ref  = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName:      user.displayName  || '',
      email:            user.email        || '',
      photoURL:         user.photoURL     || '',
      phone:            user.phoneNumber  || '',
      plan:             'free',
      trialStart:       null,
      apiKey:           '',
      mensajesPorFecha: {},
      conversaciones:   {},
      createdAt:        serverTimestamp(),
      updatedAt:        serverTimestamp(),
    })
  }
}

export async function cargarDatosUsuario(uid) {
  if (!db || !uid) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function guardarDatosUsuario(uid, datos) {
  if (!db || !uid) return
  await updateDoc(doc(db, 'users', uid), { ...datos, updatedAt: serverTimestamp() })
}

/* ── Recaptcha helper ── */
let recaptchaVerifier = null

function limpiarRecaptcha() {
  try { recaptchaVerifier?.clear() } catch {}
  recaptchaVerifier = null
  // Limpiar el widget que Google inyecta al DOM
  document.querySelectorAll('.grecaptcha-badge, [id^="rc-anchor"]').forEach(el => el.remove())
}

function crearRecaptcha(contenedorId) {
  limpiarRecaptcha()
  recaptchaVerifier = new RecaptchaVerifier(auth, contenedorId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': limpiarRecaptcha,
  })
  return recaptchaVerifier
}

/* ── Provider ── */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigurado) { setLoading(false); return }

    // Captura resultado de redirect (Google en móvil)
    getRedirectResult(auth).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try { await crearPerfilUsuario(firebaseUser) } catch {}
      }
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => { unsubscribe(); limpiarRecaptcha() }
  }, [])

  /* ── Google ── */
  async function loginGoogle() {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, provider)
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        throw err
      }
    }
  }

  /* ── Email ── */
  async function loginEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function registrarEmail(email, password, nombre) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (nombre?.trim()) await updateProfile(cred.user, { displayName: nombre.trim() })
    return cred
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  /* ── Teléfono ── */
  async function enviarCodigoSMS(telefono, contenedorId) {
    const verifier = crearRecaptcha(contenedorId)
    return signInWithPhoneNumber(auth, telefono, verifier)
  }

  /* ── Cerrar sesión ── */
  async function cerrarSesion() {
    limpiarRecaptcha()
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{
      user, loading,
      loginGoogle, loginEmail, registrarEmail, resetPassword,
      enviarCodigoSMS, cerrarSesion,
      firebaseConfigurado,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
