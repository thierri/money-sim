import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { scenariosApi } from './server/api'
import { openScenariosDb, type ScenariosDb } from './server/scenarios-db'

/** Serve a API de cenários (SQLite) junto do `vite dev` e do `vite preview`. */
function scenariosApiPlugin(): Plugin {
  const path = process.env.MONEY_SIM_DB ?? 'data/money-sim.db'
  let db: ScenariosDb | null = null
  // Abre o banco só na primeira requisição, para o Vitest (que também lê este arquivo) não criá-lo.
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next()
    db ??= openScenariosDb(path)
    void scenariosApi(db)(req, res, next)
  }
  const mount = (server: { middlewares: Connect.Server; httpServer: { on(e: 'close', f: () => void): unknown } | null }) => {
    server.middlewares.use(handler)
    server.httpServer?.on('close', () => {
      db?.close()
      db = null
    })
  }
  return { name: 'money-sim:scenarios-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), scenariosApiPlugin()],
})
