/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onRegistered?(registration: ServiceWorkerRegistration | undefined): void
    onNeedRefresh?(): void
    onOfflineReady?(): void
    onRegisterError?(error: Error): void
  }
  export function registerSW(options?: RegisterSWOptions): () => void
}
