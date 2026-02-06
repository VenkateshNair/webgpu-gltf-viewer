import { useEffect, useCallback } from 'react'

export function useKeyboard(keyHandlers = {}) {
  const handleKeyDown = useCallback((event) => {
    const handler = keyHandlers[event.key.toLowerCase()]
    if (handler) {
      event.preventDefault()
      handler(event)
    }
  }, [keyHandlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {}
}