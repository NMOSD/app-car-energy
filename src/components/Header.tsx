import { APP_NAME, APP_VERSION } from '../constants'

export function Header() {
  return (
    <header>
      <h1>{APP_NAME}</h1>
      <span className="version">v{APP_VERSION}</span>
    </header>
  )
}
