import { expect, test } from '@playwright/test'
import { openApp, STRESS_FORM, STRESS_SCALE } from './helpers'

const CARD_LABELS = ['Patrimônio final', 'Total aportado', 'Total de rendimentos', 'Vindo de rendimentos']

const VIEWPORTS = [
  { name: '320px@200%', viewport: { width: 320, height: 900 }, deviceScaleFactor: STRESS_SCALE },
  { name: '375px', viewport: { width: 375, height: 900 }, deviceScaleFactor: 1 },
  { name: '768px', viewport: { width: 768, height: 900 }, deviceScaleFactor: 1 },
  { name: '1280px', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
]

for (const { name, viewport, deviceScaleFactor } of VIEWPORTS) {
  test.describe(`cartões de resumo · valores enormes · ${name}`, () => {
    test.use({ viewport, deviceScaleFactor })

    test('cada valor cabe em uma linha dentro do cartão', async ({ page }) => {
      await openApp(page, STRESS_FORM)

      for (const label of CARD_LABELS) {
        const card = page.getByText(label, { exact: true }).locator('xpath=..')
        const problems = await card.evaluate((el) => {
          const out: string[] = []
          const box = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          const left = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft)
          const right = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight)
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = (n.textContent ?? '').trim()
            if (!text.includes('R$') && !text.includes('%')) continue
            const range = document.createRange()
            range.selectNodeContents(n)
            const r = range.getBoundingClientRect()
            if (r.left < left - 0.5 || r.right > right + 0.5) {
              out.push(`"${text}" [${r.left.toFixed(1)}, ${r.right.toFixed(1)}] passa da área do cartão [${left.toFixed(1)}, ${right.toFixed(1)}]`)
            }
            const isValue = n.parentElement?.closest('[data-fit]') !== null || parseFloat(getComputedStyle(n.parentElement!).fontSize) >= 18
            const lines = new Set(Array.from(range.getClientRects()).map((x) => Math.round(x.top))).size
            if (isValue && lines > 1) out.push(`"${text}" quebrou em ${lines} linhas`)
          }
          return out
        })
        expect(problems, label).toEqual([])
      }
    })
  })
}
