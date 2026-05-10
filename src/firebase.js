import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyAuH48sj4_RVAz4gDSScSD5V8XeHzo6-K8",
  authDomain:        "dona-rosa.firebaseapp.com",
  projectId:         "dona-rosa",
  storageBucket:     "dona-rosa.firebasestorage.app",
  messagingSenderId: "940011939854",
  appId:             "1:940011939854:web:acae5b54be9387ac25f45f",
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db   = getFirestore(app)

export { app, auth, db }
