import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onRegistered(registration: ServiceWorkerRegistration | undefined) {
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 300000)
    }
  },
  onNeedRefresh() {
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
