import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { fmtBRL, fmtCompactBRL } from '../lib/format'
import type { PeriodRow } from '../lib/simulate'

export interface ChartSeries {
  key: string
  name: string
  color: string
  periods: PeriodRow[]
}

/** Cenário atual com retiradas a partir de um mês, sobreposto como linha tracejada. */
export interface Retirement {
  periods: PeriodRow[]
  /** Rótulo (mmm/aa) do mês a partir do qual as retiradas começam */
  startLabel: string
  amount: number
}

interface Props {
  mode: 'bar' | 'line'
  /** Primeiro item é o cenário atual */
  series: ChartSeries[]
  goal: number | null
  retirement: Retirement | null
}

const RETIRE_NAME = 'Com retiradas'

const axisTick = { fill: 'var(--text-muted)', fontSize: 12 }

function TooltipBox({ children, title }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 font-semibold">{title}</div>
      <div className="tabular flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function Row({ color, label, value, strong }: { color?: string; label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-ink-2">
        {color ? <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} /> : <span className="inline-block size-2.5" />}
        {label}
      </span>
      <span className={strong ? 'font-semibold' : ''}>{fmtBRL(value)}</span>
    </div>
  )
}

function BarTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as PeriodRow & { retire?: number }
  return (
    <TooltipBox title={p.label === p.endLabel ? p.label : `${p.label} · até ${p.endLabel}`}>
      <Row label="Saldo final" value={p.endBalance} strong />
      <Row color="var(--series-1)" label="Inicial + aportes" value={p.invested} />
      <Row label="Aportes acumulados" value={p.totalContributed} />
      <Row color="var(--series-2)" label="Rendimentos acumulados" value={p.totalInterest} />
      {p.retire !== undefined && <Row color="var(--retire)" label={RETIRE_NAME} value={p.retire} />}
    </TooltipBox>
  )
}

export function EvolutionChart({ mode, series, goal, retirement }: Props) {
  const current = series[0]

  // Barras do cenário atual com o saldo da simulação com retiradas na mesma linha.
  const barData = useMemo(
    () =>
      retirement
        ? current.periods.map((p, i) => ({ ...p, retire: retirement.periods[i]?.endBalance }))
        : current.periods,
    [current, retirement],
  )

  // Todos os cenários começam no mês atual, então os períodos se alinham por índice;
  // o rótulo vem do cenário de maior horizonte.
  const lineSeries = useMemo(
    () =>
      retirement
        ? [...series, { key: 'retire', name: RETIRE_NAME, color: 'var(--retire)', periods: retirement.periods }]
        : series,
    [series, retirement],
  )
  const lineData = useMemo(() => {
    const longest = lineSeries.reduce((a, b) => (b.periods.length > a.periods.length ? b : a))
    return longest.periods.map((p, i) => {
      const row: Record<string, number | string> = { endLabel: p.endLabel }
      for (const s of lineSeries) if (s.periods[i]) row[s.key] = s.periods[i].endBalance
      return row
    })
  }, [lineSeries])

  // Linha vertical no período em que as retiradas começam.
  const retireMarker = retirement && (
    <ReferenceLine
      x={retirement.startLabel}
      stroke="var(--retire)"
      strokeDasharray="3 3"
      label={{ value: 'Retiradas', position: 'insideTopRight', fill: 'var(--retire)', fontSize: 12 }}
    />
  )
  const retireLine = (
    <Line
      key="retire"
      dataKey="retire"
      name={RETIRE_NAME}
      stroke="var(--retire)"
      strokeWidth={2}
      strokeDasharray="6 3"
      dot={false}
      activeDot={{ r: 4, stroke: 'var(--surface-1)', strokeWidth: 2 }}
      isAnimationActive={false}
      connectNulls={false}
    />
  )

  const goalLine = goal !== null && (
    <ReferenceLine
      y={goal}
      stroke="var(--goal)"
      strokeDasharray="6 4"
      strokeWidth={1.5}
      ifOverflow="extendDomain"
      label={{ value: `Meta ${fmtCompactBRL(goal)}`, position: 'insideTopLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
    />
  )

  const common = {
    margin: { top: 16, right: 8, bottom: 0, left: 8 },
  }

  const yAxis = (
    <YAxis tickFormatter={fmtCompactBRL} tick={axisTick} axisLine={false} tickLine={false} width={88} />
  )
  const xAxis = (
    <XAxis dataKey="endLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={12} />
  )

  return (
    <div className="h-80 w-full sm:h-96" role="img" aria-label={`${mode === 'bar' ? 'Gráfico de barras empilhadas: dinheiro investido e rendimentos por período' : 'Gráfico de linha do saldo total'}${retirement ? `, com simulação de retiradas a partir de ${retirement.startLabel}` : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'bar' ? (
          <ComposedChart data={barData} {...common} barCategoryGap={current.periods.length > 30 ? 1 : '18%'}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            {xAxis}
            {yAxis}
            <Tooltip content={BarTooltip} cursor={{ fill: 'var(--surface-2)' }} isAnimationActive={false} />
            <Legend iconType="square" itemSorter={null} iconSize={10} wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            <Bar dataKey="invested" name="Inicial + aportes" stackId="a" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={1} isAnimationActive={false} />
            <Bar dataKey="totalInterest" name="Rendimentos acumulados" stackId="a" fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            {retirement && retireLine}
            {retireMarker}
            {goalLine}
          </ComposedChart>
        ) : (
          <LineChart data={lineData} {...common}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            {xAxis}
            {yAxis}
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox title={String(label)}>
                    {payload.map((p) => (
                      <Row key={String(p.dataKey)} color={p.color} label={String(p.name)} value={Number(p.value)} />
                    ))}
                  </TooltipBox>
                ) : null
              }
            />
            <Legend iconType="plainline" itemSorter={null} wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--surface-1)', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
            {retirement && retireLine}
            {retireMarker}
            {goalLine}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
