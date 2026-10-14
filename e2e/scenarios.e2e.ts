import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { openApp } from './helpers'

test('cenários ficam no localStorage e voltam por exportar/importar', async ({ page }) => {
  await openApp(page)
  const panel = page.locator('section[aria-labelledby="scen-title"]')

  await panel.getByLabel('Nome do cenário').fill('Aposentadoria')
  await panel.getByRole('button', { name: 'Salvar' }).click()
  await expect(panel.getByText('Aposentadoria')).toBeVisible()

  // Sobrevive a um recarregamento sem servidor algum.
  await page.reload()
  await expect(panel.getByText('Aposentadoria')).toBeVisible()

  const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'Exportar' }).click()])
  expect(download.suggestedFilename()).toMatch(/^money-sim-cenarios-\d{4}-\d{2}-\d{2}\.json$/)
  const file = await readFile(await download.path())

  await panel.getByRole('button', { name: 'Excluir Aposentadoria' }).click()
  await expect(panel.getByText('Aposentadoria')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Exportar' })).toBeDisabled()

  await panel.getByLabel('Arquivo de cenários para importar').setInputFiles({ name: 'cenarios.json', mimeType: 'application/json', buffer: file })
  await expect(panel.getByRole('status')).toHaveText('1 cenário importado.')
  await expect(panel.getByText('Aposentadoria')).toBeVisible()

  await panel.getByLabel('Arquivo de cenários para importar').setInputFiles({ name: 'lixo.json', mimeType: 'application/json', buffer: Buffer.from('oi') })
  await expect(panel.getByRole('alert')).toHaveText('“lixo.json” não é um arquivo de cenários válido.')
})

test('não faz nenhuma requisição a /api', async ({ page }) => {
  const api: string[] = []
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api')) api.push(r.url())
  })
  await openApp(page)
  await page.locator('section[aria-labelledby="scen-title"]').getByLabel('Nome do cenário').fill('X')
  await page.getByRole('button', { name: 'Salvar' }).click()
  expect(api).toEqual([])
})
