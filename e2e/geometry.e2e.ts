import { expect, test } from '@playwright/test'
import { checkGeometry, LOCALES, openApp, STRESS_FORM, STRESS_SCALE, STRESS_VIEWPORT, THEMES, WIDTHS } from './helpers'

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const locale of LOCALES) {
      test.describe(`${width}px · ${theme} · ${locale}`, () => {
        test.use({ viewport: { width, height: 900 }, colorScheme: theme, locale })

        test('geometria: nenhum campo vaza nem corta texto', async ({ page }) => {
          await openApp(page)
          expect(await checkGeometry(page)).toEqual([])
        })
      })
    }
  }
}

for (const theme of THEMES) {
  for (const locale of LOCALES) {
    test.describe(`estresse 320px@200% · ${theme} · ${locale}`, () => {
      test.use({ viewport: STRESS_VIEWPORT, deviceScaleFactor: STRESS_SCALE, colorScheme: theme, locale })

      test('geometria com conteúdo máximo', async ({ page }) => {
        await openApp(page, STRESS_FORM)
        expect(await checkGeometry(page)).toEqual([])
      })
    })
  }
}
