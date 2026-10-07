import { expect, test } from '@playwright/test'
import { LOCALES, openApp } from './helpers'

for (const locale of LOCALES) {
  test.describe(`critérios de aceite de layout · ${locale}`, () => {
    test.use({ locale, viewport: { width: 375, height: 900 } })

    test('seta do select de mês do aporte anual fica inteira dentro do campo', async ({ page }) => {
      await openApp(page)
      const select = page.locator('#annualMonth')
      const arrow = select.locator('xpath=..').locator('[data-select-arrow]')
      await expect(arrow).toBeVisible()
      await expect(select).toHaveCSS('appearance', 'none')

      const s = (await select.boundingBox())!
      const a = (await arrow.boundingBox())!
      const padRight = await select.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))
      expect(a.x).toBeGreaterThanOrEqual(s.x + s.width - padRight)
      expect(a.x + a.width).toBeLessThanOrEqual(s.x + s.width)
      expect(a.y).toBeGreaterThanOrEqual(s.y)
      expect(a.y + a.height).toBeLessThanOrEqual(s.y + s.height)
    })

    test('simulação começa sempre no mês atual, sem campo de data', async ({ page }) => {
      // Mesmo com uma data antiga salva, o início é o mês atual (15/09/2026).
      await openApp(page, { start: '2020-02' })
      await expect(page.getByLabel('Mês de início')).toHaveCount(0)
      await expect(page.getByLabel('Ano de início')).toHaveCount(0)
      await page.getByRole('button', { name: 'Mensal' }).click()
      await expect(page.locator('tbody tr').first().locator('th')).toContainText('set/26')
    })

    test('eixo X do gráfico mostra datas, não "Ano N"', async ({ page }) => {
      await openApp(page)
      // Data fixa em 15/09/2026: o ano 1 termina em ago/27.
      const chart = page.locator('section[aria-labelledby="chart-title"]')
      await expect(chart.locator('.recharts-cartesian-axis-tick-value').first()).toHaveText('ago/27')
      await expect(chart.getByRole('application')).not.toContainText('Ano')
    })
  })
}
