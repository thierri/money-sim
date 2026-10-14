import { useRef, useState } from 'react'
import type { FormValues } from '../lib/form'
import { exportScenarios, parseImport, type MergeResult } from '../lib/scenarios'

export interface Scenario {
  id: string
  name: string
  form: FormValues
}

interface Props {
  scenarios: Scenario[]
  compared: string[]
  maxCompared: number
  colors: string[]
  canSave: boolean
  onSave: (name: string) => void
  onLoad: (s: Scenario) => void
  onDelete: (s: Scenario) => void
  onToggleCompare: (id: string) => void
  onImport: (incoming: Scenario[]) => MergeResult
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ScenariosPanel({ scenarios, compared, maxCompared, colors, canSave, onSave, onLoad, onDelete, onToggleCompare, onImport }: Props) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const submit = () => {
    const n = name.trim()
    if (!n || !canSave) return
    onSave(n)
    setName('')
  }

  const exportFile = () => {
    const day = new Date().toISOString().slice(0, 10)
    download(exportScenarios(scenarios), `money-sim-cenarios-${day}.json`)
    setMessage(null)
  }

  const importFile = async (file: File) => {
    const parsed = parseImport(await file.text())
    if (!parsed || (parsed.scenarios.length === 0 && parsed.skipped > 0)) {
      setMessage({ ok: false, text: `“${file.name}” não é um arquivo de cenários válido.` })
      return
    }
    const { added, replaced } = onImport(parsed.scenarios)
    const parts = [plural(added, 'cenário importado', 'cenários importados')]
    if (replaced > 0) parts.push(plural(replaced, 'atualizado', 'atualizados'))
    if (parsed.skipped > 0) parts.push(plural(parsed.skipped, 'inválido ignorado', 'inválidos ignorados'))
    setMessage({ ok: true, text: parts.join(', ') + '.' })
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5" aria-labelledby="scen-title">
      <h2 id="scen-title" className="mb-3 text-base font-semibold">Cenários Salvos</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <input
          className="field-input"
          placeholder="Nome do cenário"
          aria-label="Nome do cenário"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={!name.trim() || !canSave}>Salvar</button>
      </form>
      {scenarios.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">Salve os parâmetros atuais para reabri-los depois ou compará-los no gráfico de linha.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-ink-3">Marque até {maxCompared} para comparar com o cenário atual.</p>
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {scenarios.map((s) => {
              const idx = compared.indexOf(s.id)
              const checked = idx >= 0
              return (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && compared.length >= maxCompared}
                      onChange={() => onToggleCompare(s.id)}
                    />
                    {checked && <span className="inline-block h-0.5 w-3 shrink-0 rounded" style={{ background: colors[idx] }} aria-hidden />}
                    <span className="truncate">{s.name}</span>
                  </label>
                  <button type="button" className="btn px-2 py-1 text-xs" onClick={() => onLoad(s)}>Abrir</button>
                  <button type="button" className="btn px-2 py-1 text-xs" aria-label={`Excluir ${s.name}`} onClick={() => onDelete(s)}>Excluir</button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button type="button" className="btn px-2 py-1 text-xs" onClick={exportFile} disabled={scenarios.length === 0}>Exportar</button>
        <button type="button" className="btn px-2 py-1 text-xs" onClick={() => fileRef.current?.click()}>Importar</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Arquivo de cenários para importar"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void importFile(file)
          }}
        />
        <span className="text-xs text-ink-3">Salvos só neste navegador</span>
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${message.ok ? 'text-ink-2' : 'text-danger'}`}>{message.text}</p>
      )}
    </section>
  )
}
