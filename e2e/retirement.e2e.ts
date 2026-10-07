import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

/** R$ 120.000, sem rendimento nem aportes extras: a retirada de 4% é R$ 400,00/mês. */
const FLAT = { initial: '120.000,00', rate: '0,00', monthly: '0,00', annual: '0,00', annualMonth: '11', years: '10', goal: '', withdrawal: '4,00' }

test.describe('simulação de retiradas a partir de uma linha da tabela', () => {
  test('botão liga e desliga a linha de retiradas no gráfico', async ({ page }) => {
    await openApp(page, FLAT)
    const chart = page.locator('section[aria-labelledby="chart-title"]')
    const button = page.getByRole('button', { name: 'Simular retiradas após ago/27, sem aportes' })

    await expect(chart.locator('.recharts-legend-wrapper')).not.toContainText('Com retiradas')
    await button.click()
    await expect(page.getByRole('button', { name: /Remover simulação de retiradas após ago\/27/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(chart.locator('.recharts-legend-wrapper')).toContainText('Com retiradas')
    await expect(chart).toContainText('Sem aportes e retirando R$ 400,00/mês após ago/27')

    // Também aparece no gráfico de linha.
    await page.getByRole('button', { name: 'Linha', exact: true }).click()
    await expect(chart.locator('.recharts-legend-wrapper')).toContainText('Com retiradas')

    await chart.getByRole('button', { name: 'Remover' }).click()
    await expect(chart.locator('.recharts-legend-wrapper')).not.toContainText('Com retiradas')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  test('última linha não tem botão (não há meses depois dela)', async ({ page }) => {
    await openApp(page, FLAT)
    const rows = page.locator('tbody tr')
    await expect(rows.last().getByRole('button')).toHaveCount(0)
    await expect(rows.first().getByRole('button')).toHaveCount(1)
  })

  test('a escolha sobrevive a recarregar a página', async ({ page }) => {
    await openApp(page, FLAT)
    await page.getByRole('button', { name: 'Simular retiradas após ago/28, sem aportes' }).click()
    await page.reload()
    await expect(page.locator('section[aria-labelledby="chart-title"]')).toContainText('após ago/28')
  })
})
