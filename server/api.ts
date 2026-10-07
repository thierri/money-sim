import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Scenario } from '../src/components/ScenariosPanel'
import { defaultForm, type FormValues } from '../src/lib/form'
import type { ScenariosDb } from './scenarios-db'

const FORM_KEYS = Object.keys(defaultForm()) as (keyof FormValues)[]
const MAX_BODY = 64 * 1024

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

function send(res: ServerResponse, status: number, data?: unknown) {
  res.statusCode = status
  if (data === undefined) return void res.end()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > MAX_BODY) throw new Error('corpo grande demais')
  }
  return JSON.parse(raw)
}

/**
 * Middleware (connect) da API REST dos cenários:
 *   GET    /api/scenarios      → lista
 *   PUT    /api/scenarios/:id  → cria ou substitui
 *   DELETE /api/scenarios/:id  → exclui
 */
export function scenariosApi(db: ScenariosDb) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url ?? '').split('?')[0]
    if (path !== '/api/scenarios' && !path.startsWith('/api/scenarios/')) return next()
    const id = path === '/api/scenarios' ? null : decodeURIComponent(path.slice('/api/scenarios/'.length))

    try {
      if (id === null && req.method === 'GET') return send(res, 200, db.list())
      if (id !== null && req.method === 'PUT') {
        let body: unknown
        try {
          body = await readJson(req)
        } catch {
          return send(res, 400, { error: 'JSON inválido' })
        }
        const s = parseScenario(body)
        if (!s || s.id !== id) return send(res, 400, { error: 'cenário inválido' })
        return send(res, 200, db.save(s))
      }
      if (id !== null && req.method === 'DELETE') return send(res, db.remove(id) ? 204 : 404)
      return send(res, 405, { error: 'método não suportado' })
    } catch (e) {
      console.error('[api/scenarios]', e)
      return send(res, 500, { error: 'erro no banco de dados' })
    }
  }
}
