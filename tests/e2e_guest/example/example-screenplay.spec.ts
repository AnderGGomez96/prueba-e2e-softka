import { test, expect } from '../../../src/fixtures/base'
import { exampleLocators } from '../../../src/locators/example.locators'
import { CurrentUrl } from '../../../src/screenplay/questions/current-url'
import { TextOf } from '../../../src/screenplay/questions/text-of'
import { Ensure } from '../../../src/screenplay/tasks/ensure'
import { OpenHomePage } from '../../../src/screenplay/tasks/open-home-page'

test.describe('Ejemplo migrado a Screenplay', () => {

  test('EX-02: la página de inicio carga y muestra su encabezado (Screenplay)', async ({ actor, healer }) => {
    await test.step('Cuando abro la página de inicio', async () => {
      await actor.attemptsTo(OpenHomePage.now())
    })

    await test.step('Entonces la URL corresponde a la raíz del sitio', async () => {
      expect(
        await actor.asks(CurrentUrl.read()),
        'Debo quedar en la página de inicio',
      ).toMatch(/\/$/)
    })

    await test.step('Y el encabezado principal se puede leer', async () => {
      expect(
        await actor.asks(TextOf.locator(exampleLocators.pageHeading)),
        'El encabezado principal debe tener texto',
      ).not.toHaveLength(0)
    })

    await test.step('Y no aparece ningún banner de error', async () => {
      await actor.attemptsTo(
        Ensure.that(exampleLocators.errorBanner).isAbsent('No debe aparecer ningún banner de error'),
      )
    })

    await test.step('Y el healer no tuvo que auto-recuperarse', async () => {
      expect(
        healer.events.filter((event) => event.level === 'cache' || event.level === 'ai'),
        'Una corrida limpia no debe registrar auto-recuperaciones (la cadena resuelve sola)',
      ).toHaveLength(0)
    })
  })
})
