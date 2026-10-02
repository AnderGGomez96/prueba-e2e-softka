import { exampleLocators } from '../../locators/example.locators'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { Navigate } from '../interactions/navigate'
import { Ensure } from './ensure'

/**
 * Flujo de negocio de la página de inicio: navega a la raíz y confirma que
 * cargó con su encabezado y sin banner de error.
 */
export class OpenHomePage implements Interaction {
  private constructor() {}

  static now(): OpenHomePage {
    return new OpenHomePage()
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.attemptsTo(
      Navigate.to('/'),
      Ensure.that(exampleLocators.pageHeading).isVisible('La página de inicio debe mostrar su encabezado'),
      Ensure.that(exampleLocators.errorBanner).isAbsent('No debe aparecer el banner de error'),
    )
  }
}
