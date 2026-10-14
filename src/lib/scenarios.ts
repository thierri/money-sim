import { useCallback } from 'react'
import type { Scenario } from '../components/ScenariosPanel'
import { defaultForm, type FormValues } from './form'
import { usePersistentState } from './storage'

/** Chave do localStorage com a lista de cenários salvos. */
export const SCENARIOS_KEY = 'money-sim:scenarios'
/** Identifica os arquivos gerados por "Exportar". */
export const EXPORT_FORMAT = 'money-sim/cenarios'
export const EXPORT_VERSION = 1

const FORM_KEYS = Object.keys(defaultForm()) as (keyof FormValues)[]

/** Aceita só o formato que o app grava: id, nome de 1–40 caracteres e os campos do formulário como strings. */
export function parseScenario(body: unknown): Scenario | null {
  if (typeof body !== 'object' || body === null) return null
  const { id, name, form } = body as Record<string, unknown>
  if (typeof id !== 'string' || !id || id.length > 64) return null
  if (typeof name !== 'string' || !name.trim() || name.length > 40) return null
  if (typeof form !== 'object' || form === null) return null
  const f = form as Record<string, unknown>
  if (!FORM_KEYS.every((k) => typeof f[k] === 'string')) return null
  return { id, name: name.trim(), form: Object.fromEntries(FORM_KEYS.map((k) => [k, f[k]])) as unknown as FormValues }
}

/** Conteúdo do arquivo JSON de exportação. */
export function exportScenarios(scenarios: Scenario[], now = new Date()): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), scenarios }, null, 2) + '\n'
}

export interface ParsedImport {
  scenarios: Scenario[]
  /** Itens do arquivo que não são cenários válidos e foram ignorados. */
  skipped: number
}

/**
 * Lê um arquivo de exportação (ou uma lista simples de cenários).
 * Devolve `null` se o texto não for JSON ou não tiver uma lista de cenários.
 */
export function parseImport(text: string): ParsedImport | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const items = Array.isArray(data) ? data : (data as { scenarios?: unknown } | null)?.scenarios
  if (!Array.isArray(items)) return null
  const scenarios = items.map(parseScenario).filter((s): s is Scenario => s !== null)
  return { scenarios, skipped: items.length - scenarios.length }
}

export interface MergeResult {
  list: Scenario[]
  added: number
  replaced: number
}

/** Junta os cenários importados aos atuais: o mesmo `id` substitui no lugar, os novos vão para o fim. */
export function mergeScenarios(current: Scenario[], incoming: Scenario[]): MergeResult {
  const list = [...current]
  let added = 0
  let replaced = 0
  for (const s of incoming) {
    const i = list.findIndex((x) => x.id === s.id)
    if (i >= 0) {
      list[i] = s
      replaced++
    } else {
      list.push(s)
      added++
    }
  }
  return { list, added, replaced }
}

const reviveScenarios = (stored: unknown): Scenario[] =>
  Array.isArray(stored) ? stored.map(parseScenario).filter((s): s is Scenario => s !== null) : []

/** Cenários salvos no localStorage deste navegador. */
export function useScenarios() {
  const [scenarios, setScenarios] = usePersistentState<Scenario[]>(SCENARIOS_KEY, () => [], reviveScenarios)

  const save = useCallback(
    (name: string, form: FormValues) => setScenarios((list) => [...list, { id: crypto.randomUUID(), name, form }]),
    [setScenarios],
  )

  const remove = useCallback((s: Scenario) => setScenarios((list) => list.filter((x) => x.id !== s.id)), [setScenarios])

  const importMany = useCallback(
    (incoming: Scenario[]) => {
      const result = mergeScenarios(scenarios, incoming)
      setScenarios(result.list)
      return result
    },
    [scenarios, setScenarios],
  )

  return { scenarios, save, remove, importMany }
}
