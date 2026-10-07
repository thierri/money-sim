import { describe, expect, it } from 'vitest'
import { annualToMonthly, findGoalMonth, groupByYear, simulate, type SimulationParams } from './simulate'
import { parseNumber } from './format'

const base: SimulationParams = {
  initial: 10_000,
  monthlyRate: 0.008,
  monthlyContribution: 1_000,
  annualContribution: 0,
  annualMonth: 11,
  startYear: 2026,
  startMonth: 0,
  years: 10,
}

const round2 = (v: number) => Math.round(v * 100) / 100

describe('simulate — exemplo de conferência', () => {
  const { months } = simulate(base)

  it('mês 1', () => {
    expect(round2(months[0].interest)).toBe(80)
    expect(round2(months[0].endBalance)).toBe(11_080)
  })

  it('mês 2', () => {
    expect(round2(months[1].interest)).toBe(88.64)
    expect(round2(months[1].endBalance)).toBe(12_168.64)
  })

  it('mês 12', () => {
    expect(round2(months[11].interest)).toBe(178.93)
    expect(round2(months[11].endBalance)).toBe(23_545.72)
    expect(round2(months[11].totalContributed)).toBe(12_000)
    expect(round2(months[11].totalInterest)).toBe(1_545.72)
  })

  it('gera 12 meses por ano de horizonte', () => {
    expect(months).toHaveLength(120)
  })
})

describe('simulate — invariantes', () => {
  it('saldo final = inicial + aportes acumulados + rendimentos acumulados', () => {
    const r = simulate({ ...base, annualContribution: 5_000, years: 60 })
    for (const m of r.months) {
      expect(m.endBalance).toBeCloseTo(base.initial + m.totalContributed + m.totalInterest, 6)
    }
  })

  it('com rendimento 0%, saldo final = inicial + aportes', () => {
    const r = simulate({ ...base, monthlyRate: 0, annualContribution: 3_000 })
    expect(r.totalInterest).toBe(0)
    expect(r.finalBalance).toBe(10_000 + 120 * 1_000 + 10 * 3_000)
  })

  it('aporte anual entra só no mês escolhido de cada ano', () => {
    const r = simulate({ ...base, monthlyContribution: 0, annualContribution: 500, annualMonth: 2, startMonth: 8, years: 3 })
    const withAnnual = r.months.filter((m) => m.contributions > 0)
    expect(withAnnual).toHaveLength(3)
    expect(withAnnual.every((m) => m.month === 2)).toBe(true)
    // início em set/2026 → março de 2027, 2028 e 2029
    expect(withAnnual.map((m) => m.year)).toEqual([2027, 2028, 2029])
  })

  it('aportes rendem a partir do mês seguinte', () => {
    const r = simulate({ ...base, initial: 0 })
    expect(r.months[0].interest).toBe(0)
    expect(r.months[1].interest).toBeCloseTo(8, 10)
  })

  it('agrupa por ano', () => {
    const r = simulate(base)
    const years = groupByYear(r.months, base.initial)
    expect(years).toHaveLength(10)
    expect(round2(years[0].endBalance)).toBe(23_545.72)
    expect(round2(years[0].interest)).toBe(1_545.72)
    expect(years[0].invested).toBe(22_000)
  })

  it('encontra o mês da meta', () => {
    const r = simulate(base)
    const hit = findGoalMonth(r.months, base.initial, 12_000)
    expect(hit !== 'start' && hit?.index).toBe(2)
    expect(findGoalMonth(r.months, base.initial, 5_000)).toBe('start')
    expect(findGoalMonth(r.months, base.initial, 1e12)).toBeNull()
  })

  it('converte taxa anual em mensal', () => {
    expect(annualToMonthly(0.12)).toBeCloseTo(0.009488793, 8)
  })
})

describe('parseNumber', () => {
  it.each([
    ['2000', 2000],
    ['2.000,50', 2000.5],
    ['2.000', 2000],
    ['1.000.000', 1_000_000],
    ['R$ 1.234,56', 1234.56],
    ['0,8', 0.8],
    ['0.8', 0.8],
    ['-1,5', -1.5],
  ])('%s → %d', (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected)
  })

  it.each(['', 'abc', '1,2,3', '1.2.3,4,5'])('%s → null', (raw) => {
    expect(parseNumber(raw)).toBeNull()
  })
})

describe('simulate — fase de usufruto', () => {
  const retire = { afterIndex: 12, amount: 100 }

  it('até o mês escolhido é igual à simulação sem retiradas', () => {
    const a = simulate(base).months
    const b = simulate({ ...base, withdrawal: retire }).months
    expect(b[11].endBalance).toBe(a[11].endBalance)
  })

  it('depois dele não há aportes e a retirada sai todo mês', () => {
    const { months } = simulate({ ...base, withdrawal: retire })
    const m13 = months[12]
    expect(m13.contributions).toBe(0)
    expect(m13.withdrawal).toBe(100)
    expect(m13.endBalance).toBeCloseTo(months[11].endBalance * 1.008 - 100, 6)
  })

  it('retirada igual ao rendimento mantém o saldo', () => {
    const s12 = simulate(base).months[11].endBalance
    const { months } = simulate({ ...base, withdrawal: { afterIndex: 12, amount: s12 * 0.008 } })
    expect(months.at(-1)!.endBalance).toBeCloseTo(s12, 6)
  })

  it('saldo não fica negativo quando a retirada é maior que o patrimônio', () => {
    const { months } = simulate({ ...base, monthlyRate: 0, withdrawal: { afterIndex: 1, amount: 1e9 } })
    expect(months[1].endBalance).toBe(0)
    expect(months.at(-1)!.endBalance).toBe(0)
    expect(months.at(-1)!.totalWithdrawn).toBe(11_000)
  })

  it('saldo final = inicial + aportes + rendimentos − retiradas', () => {
    const last = simulate({ ...base, withdrawal: retire }).months.at(-1)!
    expect(last.endBalance).toBeCloseTo(base.initial + last.totalContributed + last.totalInterest - last.totalWithdrawn, 6)
  })
})
