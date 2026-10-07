import { useState, type ReactNode } from 'react'
import { fmtBRL, fmtCompactBRL, fmtNumber, fmtRate, parseNumber } from '../lib/format'
import { formatMoneyField, formatRateField, type FieldErrors, type FormValues } from '../lib/form'
import { annualToMonthly, monthlyToAnnual, MONTH_NAMES } from '../lib/simulate'

interface Props {
  form: FormValues
  errors: FieldErrors
  onChange: (patch: Partial<FormValues>) => void
  onReset: () => void
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1" data-field>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-2">{label}</label>
      {children}
      {error ? (
        <p id={`${htmlFor}-err`} role="alert" className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

function Affixed({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">{prefix}</span>}
      {children}
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">{suffix}</span>}
    </div>
  )
}

function Select({ id, value, onChange, children, ...rest }: { id: string; value: string; onChange: (v: string) => void; children: ReactNode; 'aria-label'?: string; 'aria-invalid'?: boolean }) {
  return (
    <div className="relative">
      <select id={id} className="field-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
        {children}
      </select>
      <svg data-select-arrow className="select-arrow" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Faixas dos sliders de aporte. Um valor digitado acima do máximo estende a faixa até ele. */
const SLIDERS = {
  monthly: { max: 20_000, step: 100 },
  annual: { max: 100_000, step: 500 },
} as const

function MoneySlider({ id, label, raw, max, step, onChange }: { id: string; label: string; raw: string; max: number; step: number; onChange: (v: number) => void }) {
  const parsed = parseNumber(raw)
  const value = parsed !== null && parsed >= 0 ? parsed : 0
  const top = Math.max(max, Math.ceil(value / step) * step)
  return (
    <div className="mt-1">
      <input
        id={id}
        type="range"
        className="range-input"
        min={0}
        max={top}
        step={step}
        value={Math.min(value, top)}
        aria-label={label}
        aria-valuetext={fmtBRL(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="tabular flex justify-between text-xs text-ink-3" aria-hidden>
        <span>R$ 0</span>
        <span>{fmtCompactBRL(top)}</span>
      </div>
    </div>
  )
}

/** Slider da taxa de retirada: 0–10% a.a., em passos de 0,1. */
function RateSlider({ id, label, raw, onChange }: { id: string; label: string; raw: string; onChange: (v: number) => void }) {
  const parsed = parseNumber(raw)
  const value = parsed !== null && parsed >= 0 ? parsed : 0
  const top = Math.max(10, Math.ceil(value))
  return (
    <div className="mt-1">
      <input
        id={id}
        type="range"
        className="range-input"
        min={0}
        max={top}
        step={0.1}
        value={Math.min(value, top)}
        aria-label={label}
        aria-valuetext={`${fmtRate(value)}% ao ano`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="tabular flex justify-between text-xs text-ink-3" aria-hidden>
        <span>0%</span>
        <span>{top}%</span>
      </div>
    </div>
  )
}

export function InputsPanel({ form, errors, onChange, onReset }: Props) {
  // Texto do campo de taxa anual enquanto está sendo editado; fora disso é derivado da mensal.
  const [annualDraft, setAnnualDraft] = useState<string | null>(null)
  const monthlyRate = parseNumber(form.rate)
  const derivedAnnual = monthlyRate !== null && monthlyRate > -100 ? fmtRate(monthlyToAnnual(monthlyRate / 100) * 100) : ''

  const money = (key: 'initial' | 'monthly' | 'annual' | 'goal', label: string, placeholder?: string, hint?: string, slider?: { max: number; step: number }) => (
    <Field label={label} htmlFor={key} error={errors[key]} hint={hint}>
      <Affixed prefix="R$">
        <input
          id={key}
          className="field-input pl-10"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={form[key]}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-err` : undefined}
          onChange={(e) => onChange({ [key]: e.target.value })}
          onBlur={(e) => e.target.value.trim() !== '' && onChange({ [key]: formatMoneyField(e.target.value) })}
        />
      </Affixed>
      {slider && (
        <MoneySlider
          id={`${key}-slider`}
          label={`Ajustar ${label.toLowerCase()}`}
          raw={form[key]}
          max={slider.max}
          step={slider.step}
          onChange={(v) => onChange({ [key]: fmtNumber(v) })}
        />
      )}
    </Field>
  )

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5" aria-labelledby="inputs-title">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="inputs-title" className="text-base font-semibold">Parâmetros</h2>
        <button type="button" className="btn" onClick={() => { setAnnualDraft(null); onReset() }}>
          Restaurar padrões
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {money('initial', 'Patrimônio inicial')}

        <div className="field-pair">
          <Field label="Rendimento mensal" htmlFor="rate" error={errors.rate}>
            <Affixed suffix="% a.m.">
              <input
                id="rate"
                className="field-input pr-16"
                inputMode="decimal"
                autoComplete="off"
                value={form.rate}
                aria-invalid={!!errors.rate}
                aria-describedby={errors.rate ? 'rate-err' : undefined}
                onChange={(e) => onChange({ rate: e.target.value })}
                onBlur={(e) => onChange({ rate: formatRateField(e.target.value) })}
              />
            </Affixed>
          </Field>
          <Field label="Equivalente anual" htmlFor="rate-annual" hint="(1 + a.a.)^(1/12) − 1">
            <Affixed suffix="% a.a.">
              <input
                id="rate-annual"
                className="field-input pr-16"
                inputMode="decimal"
                autoComplete="off"
                value={annualDraft ?? derivedAnnual}
                onFocus={() => setAnnualDraft(derivedAnnual)}
                onChange={(e) => {
                  setAnnualDraft(e.target.value)
                  const a = parseNumber(e.target.value)
                  if (a !== null && a > -100) onChange({ rate: fmtRate(annualToMonthly(a / 100) * 100) })
                }}
                onBlur={() => setAnnualDraft(null)}
              />
            </Affixed>
          </Field>
        </div>

        {money('monthly', 'Aporte mensal', undefined, undefined, SLIDERS.monthly)}
        {money('annual', 'Aporte anual', undefined, undefined, SLIDERS.annual)}

        <div className="field-pair">
          <Field label="Mês do aporte anual" htmlFor="annualMonth" error={errors.annualMonth}>
            <Select id="annualMonth" value={form.annualMonth} onChange={(v) => onChange({ annualMonth: v })}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Horizonte" htmlFor="years" error={errors.years}>
            <Affixed suffix="anos">
              <input
                id="years"
                type="number"
                min={1}
                max={60}
                step={1}
                className="field-input pr-14"
                value={form.years}
                aria-invalid={!!errors.years}
                aria-describedby={errors.years ? 'years-err' : undefined}
                onChange={(e) => onChange({ years: e.target.value })}
              />
            </Affixed>
          </Field>
        </div>

        {money('goal', 'Meta de patrimônio (opcional)', 'ex.: 500.000', 'Mostra quando a meta é atingida')}

        <Field label="Retirada segura" htmlFor="withdrawal" error={errors.withdrawal} hint="% do patrimônio por ano, ÷ 12 na tabela">
          <Affixed suffix="% a.a.">
            <input
              id="withdrawal"
              className="field-input pr-16"
              inputMode="decimal"
              autoComplete="off"
              value={form.withdrawal}
              aria-invalid={!!errors.withdrawal}
              aria-describedby={errors.withdrawal ? 'withdrawal-err' : undefined}
              onChange={(e) => onChange({ withdrawal: e.target.value })}
              onBlur={(e) => onChange({ withdrawal: formatRateField(e.target.value) })}
            />
          </Affixed>
          <RateSlider id="withdrawal-slider" label="Ajustar retirada segura" raw={form.withdrawal} onChange={(v) => onChange({ withdrawal: fmtRate(v) })} />
        </Field>
      </div>
    </section>
  )
}
