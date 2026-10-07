import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Scenario } from '../src/components/ScenariosPanel'

export interface ScenariosDb {
  list(): Scenario[]
  /** Insere ou substitui pelo id; devolve o cenário gravado. */
  save(s: Scenario): Scenario
  /** Devolve false se o id não existia. */
  remove(id: string): boolean
  close(): void
}

/** Abre (e cria, se preciso) o banco SQLite dos cenários. Aceita ':memory:' para testes. */
export function openScenariosDb(path: string): ScenariosDb {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scenarios (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      form       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  const listStmt = db.prepare('SELECT id, name, form FROM scenarios ORDER BY created_at, rowid')
  // Na substituição mantém created_at, para o cenário não mudar de posição na lista.
  const saveStmt = db.prepare(`
    INSERT INTO scenarios (id, name, form, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, form = excluded.form
  `)
  const removeStmt = db.prepare('DELETE FROM scenarios WHERE id = ?')

  return {
    list: () =>
      listStmt.all().map((r) => ({ id: String(r.id), name: String(r.name), form: JSON.parse(String(r.form)) })),
    save: (s) => {
      saveStmt.run(s.id, s.name, JSON.stringify(s.form), Date.now())
      return s
    },
    remove: (id) => Number(removeStmt.run(id).changes) > 0,
    close: () => db.close(),
  }
}
