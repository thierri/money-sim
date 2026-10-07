import { useEffect, useState } from 'react'

/** useState persistido em localStorage. Falhas de leitura/escrita são ignoradas. */
export function usePersistentState<T>(key: string, initial: () => T, revive?: (stored: T) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T
        return revive ? revive(parsed) : parsed
      }
    } catch {
      /* armazenamento indisponível ou corrompido */
    }
    return initial()
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* armazenamento indisponível */
    }
  }, [key, value])

  return [value, setValue] as const
}
