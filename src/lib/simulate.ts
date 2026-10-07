export interface SimulationParams {
  /** Patrimônio inicial (R$) */
  initial: number
  /** Rendimento mensal em decimal (0,8% => 0.008) */
  monthlyRate: number
  /** Aporte mensal (R$) */
  monthlyContribution: number
  /** Aporte anual (R$) */
  annualContribution: number
  /** Mês do aporte anual, 0 = janeiro ... 11 = dezembro */
  annualMonth: number
  /** Ano da data de início */
  startYear: number
  /** Mês da data de início, 0 = janeiro ... 11 = dezembro */
  startMonth: number
  /** Horizonte em anos */
  years: number
  /**
   * Fase de usufruto: depois do mês `afterIndex` (1-based), os aportes param e
   * `amount` é retirado no fim de cada mês, até o saldo zerar.
   */
  withdrawal?: { afterIndex: number; amount: number }
}

export interface MonthRow {
  /** Índice do mês (1-based) */
  index: number
  year: number
  /** 0 = janeiro ... 11 = dezembro */
  month: number
  startBalance: number
  interest: number
  contributions: number
  /** Retirada do mês (fase de usufruto) */
  withdrawal: number
  endBalance: number
  totalContributed: number
  totalInterest: number
  totalWithdrawn: number
}

export interface PeriodRow {
  /** Rótulo curto: "Ano 1" ou "set/26" */
  label: string
  /** Mês/ano do fim do período */
  endLabel: string
  /** Índice do último mês do período (1-based) */
  endIndex: number
  contributions: number
  interest: number
  endBalance: number
  /** Inicial + aportes acumulados */
  invested: number
  totalContributed: number
  totalInterest: number
}

export interface SimulationResult {
  months: MonthRow[]
  finalBalance: number
  totalContributed: number
  totalInterest: number
  /** Fração do patrimônio final vinda de rendimentos (0..1) */
  interestShare: number
}

/**
 * Simulação mês a mês: o rendimento incide sobre o saldo do início do mês e os
 * aportes entram no fim do mês.
 *   S_t = S_{t-1} * (1 + r) + A_m + A_a * [mês(t) = mês do aporte anual]
 * O mês 1 é o mês da data de início. Na fase de usufruto (p.withdrawal), os
 * aportes são trocados por uma retirada fixa no fim do mês, limitada ao saldo.
 */
export function simulate(p: SimulationParams): SimulationResult {
  const total = Math.round(p.years * 12)
  const months: MonthRow[] = new Array(total)
  let balance = p.initial
  let totalContributed = 0
  let totalInterest = 0
  let totalWithdrawn = 0

  for (let i = 0; i < total; i++) {
    const abs = p.startMonth + i
    const month = abs % 12
    const year = p.startYear + Math.floor(abs / 12)
    const startBalance = balance
    const interest = startBalance * p.monthlyRate
    const retired = p.withdrawal !== undefined && i + 1 > p.withdrawal.afterIndex
    const contributions = retired
      ? 0
      : p.monthlyContribution + (month === p.annualMonth ? p.annualContribution : 0)
    const withdrawal = retired ? Math.min(p.withdrawal!.amount, Math.max(0, startBalance + interest)) : 0
    balance = startBalance + interest + contributions - withdrawal
    totalContributed += contributions
    totalInterest += interest
    totalWithdrawn += withdrawal
    months[i] = {
      index: i + 1,
      year,
      month,
      startBalance,
      interest,
      contributions,
      withdrawal,
      endBalance: balance,
      totalContributed,
      totalInterest,
      totalWithdrawn,
    }
  }

  return {
    months,
    finalBalance: balance,
    totalContributed,
    totalInterest,
    interestShare: balance > 0 ? totalInterest / balance : 0,
  }
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_SHORT[month]}/${String(year % 100).padStart(2, '0')}`
}

function toPeriod(label: string, rows: MonthRow[], initial: number): PeriodRow {
  const last = rows[rows.length - 1]
  let contributions = 0
  let interest = 0
  for (const r of rows) {
    contributions += r.contributions
    interest += r.interest
  }
  return {
    label,
    endLabel: monthLabel(last.year, last.month),
    endIndex: last.index,
    contributions,
    interest,
    endBalance: last.endBalance,
    invested: initial + last.totalContributed,
    totalContributed: last.totalContributed,
    totalInterest: last.totalInterest,
  }
}

/** Agrupa em blocos de 12 meses a partir da data de início (Ano 1, Ano 2, ...). */
export function groupByYear(months: MonthRow[], initial: number): PeriodRow[] {
  const out: PeriodRow[] = []
  for (let i = 0; i < months.length; i += 12) {
    out.push(toPeriod(`Ano ${i / 12 + 1}`, months.slice(i, i + 12), initial))
  }
  return out
}

export function monthlyPeriods(months: MonthRow[], initial: number): PeriodRow[] {
  return months.map((m) => toPeriod(monthLabel(m.year, m.month), [m], initial))
}

/** Primeiro mês em que o saldo final atinge a meta; null se não atingir. */
export function findGoalMonth(months: MonthRow[], initial: number, goal: number): MonthRow | 'start' | null {
  if (initial >= goal) return 'start'
  return months.find((m) => m.endBalance >= goal) ?? null
}

/** Converte taxa anual (decimal) em mensal equivalente: (1 + a.a.)^(1/12) − 1 */
export function annualToMonthly(annual: number): number {
  return Math.pow(1 + annual, 1 / 12) - 1
}

export function monthlyToAnnual(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1
}
