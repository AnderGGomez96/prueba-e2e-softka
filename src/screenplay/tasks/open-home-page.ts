import { exampleLocators } from '../../locators/example.locators'
import type { Actor } from '../actor'
import type { Task } from '../types'
import { Navigate } from '../interactions/navigate'
import { Visible } from '../questions/visible'

/**
 * Tarea de negocio de la página de inicio: navega a la raíz y confirma que
 * cargó con su encabezado visible.
 */
export class OpenHomePage implements Task {
  private constructor() {}

  static now(): OpenHomePage {
    return new OpenHomePage()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(Navigate.to('/'))
    await actor.asks(
      Visible.of(exampleLocators.pageHeading, 'La página de inicio debe mostrar su encabezado'),
    )
  }
}
