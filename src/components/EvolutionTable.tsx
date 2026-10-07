import { fmtBRL, fmtNumber, fmtRate } from '../lib/format'
import type { PeriodRow } from '../lib/simulate'

interface Props {
  rows: PeriodRow[]
  view: 'month' | 'year'
  onViewChange: (v: 'month' | 'year') => void
  goalIndex: number | null
  /** Taxa de retirada segura anual em decimal (4% => 0.04) */
  withdrawalRate: number
  /** Mês em que a simulação de retiradas está ligada (null = desligada) */
  retireAt: number | null
  /** Último mês da simulação: dele em diante não há o que simular */
  lastIndex: number
  onRetireToggle: (endIndex: number) => void
}

function RetireButton({ row, active, onClick }: { row: PeriodRow; active: boolean; onClick: () => void }) {
  const label = active ? `Remover simulação de retiradas após ${row.endLabel}` : `Simular retiradas após ${row.endLabel}, sem aportes`
  return (
    <button type="button" className="retire-btn" aria-pressed={active} aria-label={label} title={label} onClick={onClick}>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 4.5l4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 10.5h4v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** Retirada mensal hipotética: taxa anual × patrimônio ÷ 12. */
const safeWithdrawal = (r: PeriodRow, rate: number) => (r.endBalance * rate) / 12

function periodName(r: PeriodRow, view: 'month' | 'year') {
  return view === 'year' ? `${r.label} (até ${r.endLabel})` : r.label
}

function exportCsv(rows: PeriodRow[], view: 'month' | 'year', withdrawalRate: number) {
  const header = ['Período', 'Aportes', 'Rendimento', 'Saldo final', 'Retirada segura mensal', 'Aportes acumulados', 'Rendimentos acumulados']
  const lines = rows.map((r) =>
    [periodName(r, view), r.contributions, r.interest, r.endBalance, safeWithdrawal(r, withdrawalRate), r.totalContributed, r.totalInterest]
      .map((v) => (typeof v === 'number' ? fmtNumber(v).replace(/\./g, '') : `"${v}"`))
      .join(';'),
  )
  const csv = '﻿' + [header.join(';'), ...lines].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `simulacao-${view === 'year' ? 'anual' : 'mensal'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function EvolutionTable({ rows, view, onViewChange, goalIndex, withdrawalRate, retireAt, lastIndex, onRetireToggle }: Props) {
  return (
    <section className="rounded-2xl border border-line bg-surface-1" aria-labelledby="table-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 id="table-title" className="text-base font-semibold">Evolução</h2>
        <div className="flex items-center gap-2">
          <div className="seg" role="group" aria-label="Agrupamento da tabela">
            <button type="button" aria-pressed={view === 'month'} onClick={() => onViewChange('month')}>Mensal</button>
            <button type="button" aria-pressed={view === 'year'} onClick={() => onViewChange('year')}>Anual</button>
          </div>
          <button type="button" className="btn" onClick={() => exportCsv(rows, view, withdrawalRate)}>Exportar CSV</button>
        </div>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <table className="tabular w-full text-sm">
          <thead className="sticky top-0 bg-surface-1 text-ink-2">
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-2 text-left font-medium">Período</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Aportes</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Rendimento</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Saldo final</th>
              <th scope="col" className="px-5 py-2 text-right font-medium" title={`${fmtRate(withdrawalRate * 100)}% do saldo final ao ano, dividido por 12`}>
                Retirada segura/mês
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isGoal = goalIndex !== null && r.endIndex >= goalIndex && r.endIndex - (view === 'year' ? 12 : 1) < goalIndex
              return (
                <tr key={r.endIndex} className={`border-b border-line last:border-0 ${isGoal || retireAt === r.endIndex ? 'bg-surface-2' : ''}`}>
                  <th scope="row" className="whitespace-nowrap px-5 py-1.5 text-left font-normal">
                    {view === 'year' ? (
                      <>
                        {r.label} <span className="text-ink-3">· até {r.endLabel}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-ink-3">{r.endIndex}.</span> {r.label}
                      </>
                    )}
                    {isGoal && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-white">meta</span>}
                  </th>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">{fmtBRL(r.contributions)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">{fmtBRL(r.interest)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium">{fmtBRL(r.endBalance)}</td>
                  <td className="whitespace-nowrap px-5 py-1.5 text-right text-ink-2">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {fmtBRL(safeWithdrawal(r, withdrawalRate))}
                      {r.endIndex < lastIndex ? (
                        <RetireButton row={r} active={retireAt === r.endIndex} onClick={() => onRetireToggle(r.endIndex)} />
                      ) : (
                        <span className="retire-btn invisible" aria-hidden />
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
