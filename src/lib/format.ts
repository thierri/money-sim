const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const rate = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

export const fmtBRL = (v: number) => currency.format(v)
export const fmtNumber = (v: number) => number2.format(v)
export const fmtCompactBRL = (v: number) => `R$ ${compact.format(v)}`
export const fmtPercent = (v: number) => percent.format(v)
/** Formata uma taxa já em pontos percentuais (0.8 => "0,80") */
export const fmtRate = (v: number) => rate.format(v)

/**
 * Converte entrada livre em número. Aceita "2000", "2.000,50", "2000,5",
 * "R$ 1.234", "0.8" e "-1,5". Retorna null se inválido.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/R\$|%|\s/g, '')
  if (s === '' || s === '-') return null
  if (!/^-?[\d.,]+$/.test(s)) return null
  if (s.includes(',')) {
    // vírgula é o separador decimal; pontos são de milhar
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "2.000" ou "1.000.000" => milhar
    s = s.replace(/\./g, '')
  }
  if ((s.match(/\./g) ?? []).length > 1) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
