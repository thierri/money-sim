import { expect, test } from '@playwright/test'
import { LOCALES, openApp, STRESS_FORM, STRESS_SCALE, STRESS_VIEWPORT, THEMES, WIDTHS } from './helpers'

// O nome do screenshot não inclui o idioma: pt-BR e en-US comparam contra o mesmo baseline,
// o que garante que o formulário é idêntico independentemente do idioma do navegador.

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const locale of LOCALES) {
      test.describe(`${width}px · ${theme} · ${locale}`, () => {
        test.use({ viewport: { width, height: 900 }, colorScheme: theme, locale })

        test('regressão visual do formulário', async ({ page }) => {
          await openApp(page)
          await expect(page.locator('section[aria-labelledby="inputs-title"]')).toHaveScreenshot(`form-${width}-${theme}.png`)
        })
      })
    }
  }
}

for (const theme of THEMES) {
  for (const locale of LOCALES) {
    test.describe(`estresse 320px@200% · ${theme} · ${locale}`, () => {
      test.use({ viewport: STRESS_VIEWPORT, deviceScaleFactor: STRESS_SCALE, colorScheme: theme, locale })

      test('regressão visual com conteúdo máximo', async ({ page }) => {
        await openApp(page, STRESS_FORM)
        await expect(page.locator('section[aria-labelledby="inputs-title"]')).toHaveScreenshot(`form-stress-320x2-${theme}.png`, { scale: 'device' })
      })
    })
  }
}
