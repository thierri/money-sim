import { fmtNumber, fmtRate, parseNumber } from './format'
import type { SimulationParams } from './simulate'

/** Valores do formulário como digitados (strings), para permitir edição livre. */
export interface FormValues {
  initial: string
  rate: string
  monthly: string
  annual: string
  annualMonth: string
  years: string
  goal: string
  /** Taxa de retirada segura anual, em % (regra dos 4%) */
  withdrawal: string
}

export type FieldErrors = Partial<Record<keyof FormValues, string>>

export interface Validated {
  params: SimulationParams | null
  goal: number | null
  /** Taxa de retirada segura anual em decimal (4% => 0.04) */
  withdrawalRate: number | null
  errors: FieldErrors
}

export function defaultForm(): FormValues {
  return {
    initial: fmtNumber(10_000),
    rate: fmtRate(0.8),
    monthly: fmtNumber(1_000),
    annual: fmtNumber(0),
    annualMonth: '11',
    years: '10',
    goal: '',
    withdrawal: fmtRate(4),
  }
}

function money(raw: string, errors: FieldErrors, key: keyof FormValues): number {
  const v = parseNumber(raw)
  if (v === null) errors[key] = 'Valor inválido'
  else if (v < 0) errors[key] = 'Não pode ser negativo'
  return v ?? 0
}

export function validate(f: FormValues): Validated {
  const errors: FieldErrors = {}

  const initial = money(f.initial, errors, 'initial')
  const monthly = money(f.monthly, errors, 'monthly')
  const annual = money(f.annual, errors, 'annual')

  const rate = parseNumber(f.rate)
  if (rate === null) errors.rate = 'Taxa inválida'
  else if (rate <= -100 || rate > 100) errors.rate = 'Entre -100 (excl.) e 100'

  const annualMonth = Number(f.annualMonth)
  if (!Number.isInteger(annualMonth) || annualMonth < 0 || annualMonth > 11) errors.annualMonth = 'Mês inválido'

  // A simulação sempre começa no mês atual.
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth()

  const years = Number(f.years.trim())
  if (f.years.trim() === '' || !Number.isInteger(years) || years < 1 || years > 60) errors.years = 'Inteiro de 1 a 60'

  let goal: number | null = null
  if (f.goal.trim() !== '') {
    const g = parseNumber(f.goal)
    if (g === null || g <= 0) errors.goal = 'Meta inválida'
    else goal = g
  }

  let withdrawalRate: number | null = null
  const w = parseNumber(f.withdrawal ?? '')
  if (w === null || w < 0 || w > 100) errors.withdrawal = 'Entre 0 e 100'
  else withdrawalRate = w / 100

  // Meta e retirada não afetam a simulação: um erro nelas não congela o resultado.
  const hasError = Object.keys(errors).some((k) => k !== 'goal' && k !== 'withdrawal')
  return {
    params: hasError
      ? null
      : {
          initial,
          monthlyRate: rate! / 100,
          monthlyContribution: monthly,
          annualContribution: annual,
          annualMonth,
          startYear,
          startMonth,
          years,
        },
    goal,
    withdrawalRate,
    errors,
  }
}

/** Reformata um campo de moeda ao sair dele (mantém o texto se inválido). */
export function formatMoneyField(raw: string): string {
  const v = parseNumber(raw)
  return v === null ? raw : fmtNumber(v)
}

export function formatRateField(raw: string): string {
  const v = parseNumber(raw)
  return v === null ? raw : fmtRate(v)
}
