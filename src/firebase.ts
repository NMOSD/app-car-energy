import { initializeApp } from 'firebase/app'
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCZADSPYUbPx5oTfH8k98P0dCwvgpVvvdk',
  authDomain: 'app-car-energy.firebaseapp.com',
  projectId: 'app-car-energy',
  storageBucket: 'app-car-energy.firebasestorage.app',
  messagingSenderId: '925799627182',
  appId: '1:925799627182:web:93a9a1d919114d6a28f03f'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

enableMultiTabIndexedDbPersistence(db).catch(() => {})

let authReady: Promise<void> | null = null
export function ensureAuth(): Promise<void> {
  if (!authReady) {
    authReady = signInAnonymously(auth).then(() => {})
  }
  return authReady
}
