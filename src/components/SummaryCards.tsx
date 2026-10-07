import { fmtBRL, fmtPercent } from '../lib/format'
import { FitText } from './FitText'
import { MONTH_NAMES, type MonthRow, type SimulationResult } from '../lib/simulate'

interface Props {
  result: SimulationResult
  initial: number
  goal: number | null
  goalHit: MonthRow | 'start' | null
}

function Card({ label, value, sub, swatch }: { label: string; value: string; sub?: string; swatch?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-sm text-ink-2">
        {swatch && <span className="inline-block size-2.5 rounded-sm" style={{ background: swatch }} aria-hidden />}
        {label}
      </div>
      <FitText text={value} className="tabular mt-1 text-xl font-semibold tracking-tight sm:text-2xl" />
      {sub && <div className="mt-0.5 text-xs text-ink-3 [overflow-wrap:anywhere]">{sub}</div>}
    </div>
  )
}

function goalText(goal: number, hit: MonthRow | 'start' | null): { value: string; sub: string } {
  if (hit === 'start') return { value: 'Já atingida', sub: `Meta de ${fmtBRL(goal)}` }
  if (!hit) return { value: 'Não atingida', sub: `Meta de ${fmtBRL(goal)} no horizonte` }
  const years = Math.floor(hit.index / 12)
  const months = hit.index % 12
  const span = [years && `${years} ano${years > 1 ? 's' : ''}`, months && `${months} ${months > 1 ? 'meses' : 'mês'}`]
    .filter(Boolean)
    .join(' e ')
  return { value: `${MONTH_NAMES[hit.month]} de ${hit.year}`, sub: `Meta de ${fmtBRL(goal)} · em ${span} (mês ${hit.index})` }
}

export function SummaryCards({ result, initial, goal, goalHit }: Props) {
  const g = goal !== null ? goalText(goal, goalHit) : null
  return (
    <div className={`grid grid-cols-2 gap-3 xl:grid-cols-4`}>
      <Card label="Patrimônio final" value={fmtBRL(result.finalBalance)} />
      <Card label="Total aportado" value={fmtBRL(result.totalContributed)} sub={`+ ${fmtBRL(initial)} inicial`} swatch="var(--series-1)" />
      <Card label="Total de rendimentos" value={fmtBRL(result.totalInterest)} swatch="var(--series-2)" />
      <Card label="Vindo de rendimentos" value={fmtPercent(result.interestShare)} sub="do patrimônio final" />
      {g && (
        <div className="col-span-2 xl:col-span-4">
          <Card label="Meta atingida em" value={g.value} sub={g.sub} />
        </div>
      )}
    </div>
  )
}
