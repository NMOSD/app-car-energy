import { useEffect } from 'react'

interface Props {
  message: string
  onClear: () => void
}

export function SuccessMessage({ message, onClear }: Props) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClear, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, onClear])

  if (!message) return null
  return <div className="success-message">{message}</div>
}
