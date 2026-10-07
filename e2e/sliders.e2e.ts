import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test.describe('sliders de aporte', () => {
  test('arrastar o slider do aporte mensal atualiza o campo e o resumo', async ({ page }) => {
    await openApp(page)
    const total = page.getByText('Total aportado', { exact: true }).locator('xpath=..')
    await expect(total).toContainText('R$ 120.000,00')

    await page.getByLabel('Ajustar aporte mensal').fill('5000')
    await expect(page.locator('#monthly')).toHaveValue('5.000,00')
    await expect(total).toContainText('R$ 600.000,00')
  })

  test('arrastar o slider do aporte anual atualiza o campo', async ({ page }) => {
    await openApp(page)
    await page.getByLabel('Ajustar aporte anual').fill('12500')
    await expect(page.locator('#annual')).toHaveValue('12.500,00')
  })

  test('digitar no campo move o slider', async ({ page }) => {
    await openApp(page)
    await page.locator('#monthly').fill('3.000')
    await expect(page.getByLabel('Ajustar aporte mensal')).toHaveValue('3000')
  })

  test('valor digitado acima da faixa estende o máximo do slider', async ({ page }) => {
    await openApp(page)
    await page.locator('#annual').fill('250.000')
    const slider = page.getByLabel('Ajustar aporte anual')
    await expect(slider).toHaveAttribute('max', '250000')
    await expect(slider).toHaveValue('250000')
  })

  test('valor inválido no campo não quebra o slider', async ({ page }) => {
    await openApp(page)
    await page.locator('#monthly').fill('abc')
    await expect(page.getByLabel('Ajustar aporte mensal')).toHaveValue('0')
    await page.getByLabel('Ajustar aporte mensal').fill('2000')
    await expect(page.locator('#monthly')).toHaveValue('2.000,00')
  })

  test('retirada segura: coluna da tabela segue o campo e o slider', async ({ page }) => {
    await openApp(page, { initial: '120.000,00', rate: '0,00', monthly: '0,00', annual: '0,00', annualMonth: '11', years: '1', goal: '' })
    const cell = page.locator('tbody tr').first().locator('td').nth(3)
    await expect(page.locator('#withdrawal')).toHaveValue('4,00')
    await expect(cell).toHaveText('R$ 400,00') // 120.000 × 4% ÷ 12

    await page.getByLabel('Ajustar retirada segura').fill('6')
    await expect(page.locator('#withdrawal')).toHaveValue('6,00')
    await expect(cell).toHaveText('R$ 600,00')

    await page.locator('#withdrawal').fill('3,5')
    await expect(page.getByLabel('Ajustar retirada segura')).toHaveValue('3.5')
    await expect(cell).toHaveText('R$ 350,00')
  })
})
