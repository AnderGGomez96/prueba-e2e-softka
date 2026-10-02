import { test, expect } from '../../../src/fixtures/base'

test.describe('Ejemplo del esqueleto', () => {

  test('EX-01: la página de inicio carga y muestra su encabezado', async ({ examplePage, healer, page }) => {
    await test.step('Dado que abro la página de inicio', async () => {
      await expect(page, 'El fixture debe dejarme en la página de inicio').toHaveURL(/\/$/)
    })

    await test.step('Entonces veo el encabezado principal', async () => {
      await examplePage.expectHeadingVisible()
    })

    await test.step('Y no aparece ningún banner de error', async () => {
      await examplePage.expectNoErrorBanner()
    })

    await test.step('Y el healer no tuvo que auto-recuperarse', async () => {
      expect(
        healer.events.filter((event) => event.level === 'cache' || event.level === 'ai'),
        'Una corrida limpia no debe registrar auto-recuperaciones (la cadena resuelve sola)',
      ).toHaveLength(0)
    })
  })
})
