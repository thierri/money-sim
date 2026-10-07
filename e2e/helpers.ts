import type { Page } from '@playwright/test'

export const WIDTHS = [375, 768, 1280] as const
export const THEMES = ['light', 'dark'] as const
export const LOCALES = ['pt-BR', 'en-US'] as const

/** Data fixa para que o mês atual (início da simulação) não mude os screenshots. */
export const FIXED_NOW = new Date('2026-09-15T12:00:00')

/** Valores de estresse: maior moeda, mês de nome mais longo (fevereiro), horizonte e retirada máximos. */
export const STRESS_FORM = {
  initial: '999.999.999,99',
  rate: '0,80',
  monthly: '999.999.999,99',
  annual: '999.999.999,99',
  annualMonth: '1',
  years: '60',
  goal: '999.999.999,99',
  withdrawal: '100,00',
}

/** 320 px CSS com deviceScaleFactor 2 = janela de 640 px em zoom de 200% (WCAG 1.4.10). */
export const STRESS_VIEWPORT = { width: 320, height: 900 }
export const STRESS_SCALE = 2

export async function openApp(page: Page, form?: Record<string, string>) {
  await page.clock.setFixedTime(FIXED_NOW)
  if (form) {
    await page.addInitScript((f) => localStorage.setItem('money-sim:form', JSON.stringify(f)), form)
  }
  await page.goto('/')
  await page.locator('#inputs-title').waitFor()
  await page.evaluate(() => document.fonts.ready)
}

export interface GeometryProblem {
  control: string
  problem: string
}

/**
 * Percorre todo `input` e `select` visível e devolve os problemas encontrados:
 *  - texto cortado: scrollWidth > clientWidth, ou o texto exibido não cabe na área de conteúdo;
 *  - campo fora do container (o wrapper do campo ou a seção);
 *  - ícone (prefixo, sufixo, seta) fora do campo ou invadindo a área do texto.
 */
export function checkGeometry(page: Page): Promise<GeometryProblem[]> {
  return page.evaluate(() => {
    const problems: { control: string; problem: string }[] = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const EPS = 0.5

    const name = (el: Element) =>
      el.id ? `#${el.id}` : el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.tagName.toLowerCase()

    const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')).filter(
      (el) => !(el instanceof HTMLInputElement && ['checkbox', 'radio', 'hidden'].includes(el.type)) && el.getClientRects().length > 0,
    )

    for (const el of controls) {
      const id = name(el)
      const cs = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)
      const padR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)

      if (el.type === 'month' || el.type === 'date') {
        problems.push({ control: id, problem: `usa input type="${el.type}" nativo (depende do idioma do navegador)` })
      }

      if (el.scrollWidth > el.clientWidth) {
        problems.push({ control: id, problem: `texto cortado (scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth})` })
      }

      if (el instanceof HTMLInputElement && el.type === 'range') {
        const container = el.closest('[data-field]') ?? el.closest('section')
        const c = container?.getBoundingClientRect()
        if (c && (rect.left < c.left - EPS || rect.right > c.right + EPS)) {
          problems.push({ control: id, problem: `slider passa do container` })
        }
        continue
      }

      const text = el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.text ?? '') : el.value || el.placeholder
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
      const textWidth = ctx.measureText(text).width
      const contentWidth = rect.width - padL - padR
      if (textWidth > contentWidth + EPS) {
        problems.push({ control: id, problem: `"${text}" (${textWidth.toFixed(1)}px) não cabe na área de texto (${contentWidth.toFixed(1)}px)` })
      }

      const container = el.closest('[data-field]') ?? el.closest('section')
      if (container) {
        const c = container.getBoundingClientRect()
        if (rect.left < c.left - EPS || rect.right > c.right + EPS) {
          problems.push({ control: id, problem: `campo [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}] passa do container [${c.left.toFixed(1)}, ${c.right.toFixed(1)}]` })
        }
      }

      if (el instanceof HTMLSelectElement && !el.parentElement?.querySelector('[data-select-arrow]')) {
        problems.push({ control: id, problem: 'select sem seta própria ([data-select-arrow])' })
      }
      if (el instanceof HTMLSelectElement && cs.appearance !== 'none') {
        problems.push({ control: id, problem: `select com appearance "${cs.appearance}" (seta nativa)` })
      }

      // Ícones: irmãos posicionados de forma absoluta sobre o campo (prefixo, sufixo, seta).
      const icons = Array.from(el.parentElement?.children ?? []).filter(
        (s) => s !== el && getComputedStyle(s).position === 'absolute',
      )
      for (const icon of icons) {
        const r = icon.getBoundingClientRect()
        const label = `ícone "${(icon.textContent ?? '').trim() || 'seta'}"`
        if (r.left < rect.left - EPS || r.right > rect.right + EPS || r.top < rect.top - EPS || r.bottom > rect.bottom + EPS) {
          problems.push({ control: id, problem: `${label} passa da borda do campo` })
        }
        const isLeft = r.left + r.width / 2 < rect.left + rect.width / 2
        if (isLeft && r.right > rect.left + padL + EPS) {
          problems.push({ control: id, problem: `${label} invade a área do texto (padding-left ${padL}px)` })
        }
        if (!isLeft && r.left < rect.right - padR - EPS) {
          problems.push({ control: id, problem: `${label} invade a área do texto (padding-right ${padR}px)` })
        }
      }
    }

    return problems
  })
}
