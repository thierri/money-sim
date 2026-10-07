import { useDeferredValue, useMemo, useRef } from 'react'
import { EvolutionChart, type ChartSeries, type Retirement } from './components/EvolutionChart'
import { EvolutionTable } from './components/EvolutionTable'
import { InputsPanel } from './components/InputsPanel'
import { ScenariosPanel, type Scenario } from './components/ScenariosPanel'
import { SummaryCards } from './components/SummaryCards'
import { defaultForm, validate, type FormValues } from './lib/form'
import { fmtBRL } from './lib/format'
import { findGoalMonth, groupByYear, monthLabel, monthlyPeriods, simulate, type MonthRow, type SimulationParams } from './lib/simulate'
import { useScenarios } from './lib/scenarios'
import { usePersistentState } from './lib/storage'

/** O gráfico compara até 3 cenários: o atual + 2 salvos. */
const MAX_COMPARED = 2
const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

export default function App() {
  const [form, setForm] = usePersistentState<FormValues>('money-sim:form', defaultForm, (stored) => ({ ...defaultForm(), ...stored }))
  const { scenarios, loading: scenariosLoading, error: scenariosError, save: saveScenario, remove: removeScenario } = useScenarios()
  const [compared, setCompared] = usePersistentState<string[]>('money-sim:compared', () => [])
  const [chartMode, setChartMode] = usePersistentState<'bar' | 'line'>('money-sim:chart', () => 'bar')
  const [tableView, setTableView] = usePersistentState<'month' | 'year'>('money-sim:table', () => 'year')
  /** Mês (1-based) depois do qual a simulação de retiradas começa; null = desligada. */
  const [retireAt, setRetireAt] = usePersistentState<number | null>('money-sim:retire', () => null)

  const validated = useMemo(() => validate(form), [form])

  // Mantém o último resultado válido na tela enquanto houver campos inválidos.
  const lastValid = useRef<SimulationParams>(validate(defaultForm()).params!)
  if (validated.params) lastValid.current = validated.params
  const params = useDeferredValue(lastValid.current)
  const goal = validated.errors.goal ? null : validated.goal
  const lastWithdrawal = useRef(0.04)
  if (validated.withdrawalRate !== null) lastWithdrawal.current = validated.withdrawalRate
  const withdrawalRate = lastWithdrawal.current
  const hasErrors = !validated.params

  const result = useMemo(() => simulate(params), [params])
  const yearRows = useMemo(() => groupByYear(result.months, params.initial), [result, params.initial])
  const monthRows = useMemo(() => monthlyPeriods(result.months, params.initial), [result, params.initial])
  const goalHit = useMemo(() => (goal !== null ? findGoalMonth(result.months, params.initial, goal) : null), [result, params.initial, goal])

  const comparedScenarios = useMemo(
    () =>
      compared
        .map((id) => scenarios.find((s) => s.id === id))
        .filter((s): s is Scenario => !!s)
        .map((s) => {
          const p = validate(s.form).params
          return p ? { scenario: s, params: p, result: simulate(p) } : null
        })
        .filter((x) => x !== null),
    [compared, scenarios],
  )

  const showCompare = chartMode === 'line' && comparedScenarios.length > 0
  const monthlyChart = showCompare
    ? Math.max(params.years, ...comparedScenarios.map((c) => c.params.years)) <= 3
    : params.years <= 3

  const series: ChartSeries[] = useMemo(() => {
    const periods = (months: MonthRow[], initial: number) =>
      monthlyChart ? monthlyPeriods(months, initial) : groupByYear(months, initial)
    const list: ChartSeries[] = [
      { key: 'current', name: showCompare ? 'Atual' : 'Saldo total', color: SERIES_COLORS[0], periods: monthlyChart ? monthRows : yearRows },
    ]
    if (showCompare) {
      comparedScenarios.forEach((c, i) =>
        list.push({ key: `s${i}`, name: c.scenario.name, color: SERIES_COLORS[i + 1], periods: periods(c.result.months, c.params.initial) }),
      )
    }
    return list
  }, [monthlyChart, monthRows, yearRows, showCompare, comparedScenarios])

  // Simulação de usufruto: a partir do mês escolhido, sem aportes e retirando todo mês
  // a retirada segura daquela data. Desliga sozinha se o horizonte encolher.
  const activeRetireAt = retireAt !== null && retireAt >= 1 && retireAt < result.months.length ? retireAt : null
  const retirement: Retirement | null = useMemo(() => {
    if (activeRetireAt === null) return null
    const from = result.months[activeRetireAt - 1]
    const amount = (from.endBalance * withdrawalRate) / 12
    const months = simulate({ ...params, withdrawal: { afterIndex: activeRetireAt, amount } }).months
    const periods = monthlyChart ? monthlyPeriods(months, params.initial) : groupByYear(months, params.initial)
    const start = periods.find((p) => p.endIndex >= activeRetireAt)!
    return { periods, startLabel: start.endLabel, amount }
  }, [activeRetireAt, result, params, withdrawalRate, monthlyChart])
  const retireFrom = activeRetireAt !== null ? result.months[activeRetireAt - 1] : null

  const update = (patch: Partial<FormValues>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simulador de Patrimônio</h1>
        <p className="mt-1 text-sm text-ink-2">Projeção mês a mês com rendimento composto e aportes mensais e anuais.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <InputsPanel form={form} errors={validated.errors} onChange={update} onReset={() => setForm(defaultForm())} />
          <ScenariosPanel
            scenarios={scenarios}
            compared={compared}
            maxCompared={MAX_COMPARED}
            colors={SERIES_COLORS.slice(1)}
            canSave={!hasErrors}
            loading={scenariosLoading}
            error={scenariosError}
            onSave={(name) => saveScenario(name, form)}
            onLoad={(s) => setForm({ ...defaultForm(), ...s.form })}
            onDelete={(s) => {
              removeScenario(s)
              setCompared((ids) => ids.filter((x) => x !== s.id))
            }}
            onToggleCompare={(id) => {
              setCompared((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX_COMPARED)))
              if (!compared.includes(id)) setChartMode('line')
            }}
          />
        </aside>

        <main className="flex min-w-0 flex-col gap-6">
          {hasErrors && (
            <div role="status" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm">
              Há campos inválidos — exibindo o último resultado válido.
            </div>
          )}

          <SummaryCards result={result} initial={params.initial} goal={goal} goalHit={goalHit} />

          <section className="rounded-2xl border border-line bg-surface-1 p-5" aria-labelledby="chart-title">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 id="chart-title" className="text-base font-semibold">
                {chartMode === 'bar' ? 'Dinheiro colocado × rendimentos' : showCompare ? 'Comparação de cenários' : 'Saldo total'}
              </h2>
              <div className="seg" role="group" aria-label="Tipo de gráfico">
                <button type="button" aria-pressed={chartMode === 'bar'} onClick={() => setChartMode('bar')}>Barras</button>
                <button type="button" aria-pressed={chartMode === 'line'} onClick={() => setChartMode('line')}>Linha</button>
              </div>
            </div>
            <EvolutionChart mode={chartMode} series={series} goal={goal} retirement={retirement} />
            {retirement && retireFrom && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-retire" aria-hidden />
                  Sem aportes e retirando {fmtBRL(retirement.amount)}/mês após {monthLabel(retireFrom.year, retireFrom.month)}
                </span>
                <button type="button" className="btn px-2 py-0.5 text-xs" onClick={() => setRetireAt(null)}>Remover</button>
              </div>
            )}
            {chartMode === 'bar' && compared.length > 0 && (
              <p className="mt-2 text-xs text-ink-3">A comparação de cenários aparece no gráfico de linha.</p>
            )}
          </section>

          <EvolutionTable
            rows={tableView === 'year' ? yearRows : monthRows}
            view={tableView}
            onViewChange={setTableView}
            goalIndex={goalHit && goalHit !== 'start' ? goalHit.index : null}
            withdrawalRate={withdrawalRate}
            retireAt={activeRetireAt}
            lastIndex={result.months.length}
            onRetireToggle={(index) => setRetireAt((cur) => (cur === index ? null : index))}
          />
        </main>
      </div>
    </div>
  )
}
