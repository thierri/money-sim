import { useCallback, useEffect, useState } from 'react'
import type { Scenario } from '../components/ScenariosPanel'
import type { FormValues } from './form'

const API = '/api/scenarios'
/** Chave onde as versões anteriores guardavam os cenários; migrada para o banco na primeira carga. */
const LEGACY_KEY = 'money-sim:scenarios'

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`)
  return res.status === 204 ? null : res.json()
}

const put = (s: Scenario) => request('PUT', `${API}/${encodeURIComponent(s.id)}`, s)

function readLegacy(): Scenario[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? (JSON.parse(raw) as Scenario[]) : []
  } catch {
    return []
  }
}

/**
 * Cenários salvos no banco SQLite do servidor. As alterações aparecem na hora e
 * são desfeitas se o servidor recusar; `error` descreve a última falha.
 */
export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let list = (await request('GET', API)) as Scenario[]
        const legacy = readLegacy().filter((s) => !list.some((x) => x.id === s.id))
        if (legacy.length > 0) {
          for (const s of legacy) await put(s)
          list = (await request('GET', API)) as Scenario[]
        }
        try {
          localStorage.removeItem(LEGACY_KEY)
        } catch {
          /* armazenamento indisponível */
        }
        if (!cancelled) setScenarios(list)
      } catch {
        if (!cancelled) setError('Não foi possível carregar os cenários do banco de dados.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback((name: string, form: FormValues) => {
    const s: Scenario = { id: crypto.randomUUID(), name, form }
    setError(null)
    setScenarios((list) => [...list, s])
    put(s).catch(() => {
      setScenarios((list) => list.filter((x) => x.id !== s.id))
      setError(`Não foi possível salvar “${name}”.`)
    })
  }, [])

  const remove = useCallback((s: Scenario) => {
    setError(null)
    setScenarios((list) => list.filter((x) => x.id !== s.id))
    request('DELETE', `${API}/${encodeURIComponent(s.id)}`).catch(() => {
      setScenarios((list) => (list.some((x) => x.id === s.id) ? list : [...list, s]))
      setError(`Não foi possível excluir “${s.name}”.`)
    })
  }, [])

  return { scenarios, loading, error, save, remove }
}
