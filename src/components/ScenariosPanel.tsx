import { useState } from 'react'
import type { FormValues } from '../lib/form'

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
  onDelete: (id: string) => void
  onToggleCompare: (id: string) => void
}

export function ScenariosPanel({ scenarios, compared, maxCompared, colors, canSave, onSave, onLoad, onDelete, onToggleCompare }: Props) {
  const [name, setName] = useState('')
  const submit = () => {
    const n = name.trim()
    if (!n || !canSave) return
    onSave(n)
    setName('')
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5" aria-labelledby="scen-title">
      <h2 id="scen-title" className="mb-3 text-base font-semibold">Cenários</h2>
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
                  <button type="button" className="btn px-2 py-1 text-xs" aria-label={`Excluir ${s.name}`} onClick={() => onDelete(s.id)}>Excluir</button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
