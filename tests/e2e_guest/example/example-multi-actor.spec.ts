import { test, expect } from '../../../src/fixtures/base'
import { exampleLocators } from '../../../src/locators/example.locators'
import { BrowseTheWeb } from '../../../src/screenplay/abilities/browse-the-web'
import { Navigate } from '../../../src/screenplay/interactions/navigate'
import { CurrentUrl } from '../../../src/screenplay/questions/current-url'
import { Visible } from '../../../src/screenplay/questions/visible'

test.describe('Multi-actor', () => {

  test('EX-03: cliente y administrador navegan en sesiones aisladas', async ({ cliente, administrador }) => {
    await test.step('Cuando el cliente abre la página de inicio', async () => {
      await cliente.attemptsTo(Navigate.to('/'))
      await cliente.asks(
        Visible.of(exampleLocators.pageHeading, 'El cliente debe ver el encabezado de la tienda'),
      )
    })

    await test.step('Y el administrador abre el formulario de contacto', async () => {
      await administrador.attemptsTo(Navigate.to('/index.php?route=information/contact'))
    })

    await test.step('Entonces cada actor conserva su propia URL', async () => {
      expect(
        await cliente.asks(CurrentUrl.read()),
        'El cliente debe seguir en la página de inicio',
      ).toMatch(/\/$/)
      expect(
        await administrador.asks(CurrentUrl.read()),
        'El administrador debe estar en la página de contacto',
      ).toContain('information/contact')
    })

    await test.step('Y cada actor tiene su propia página, healer y reporte', async () => {
      const clienteAbility = cliente.ability(BrowseTheWeb)
      const administradorAbility = administrador.ability(BrowseTheWeb)

      expect(
        clienteAbility.page,
        'Cada actor debe navegar en una página distinta',
      ).not.toBe(administradorAbility.page)
      expect(
        clienteAbility.healer.events.filter((event) => event.level === 'cache' || event.level === 'ai'),
        'El cliente no debe registrar auto-recuperaciones',
      ).toHaveLength(0)
      expect(
        administradorAbility.healer.events.filter((event) => event.level === 'cache' || event.level === 'ai'),
        'El administrador no debe registrar auto-recuperaciones',
      ).toHaveLength(0)
    })
  })
})
