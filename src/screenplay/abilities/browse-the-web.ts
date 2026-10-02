import type { Page } from '@playwright/test'
import type { Healer } from '../../healing'

/**
 * Habilidad de navegar la web con la escalera de healing del repo.
 *
 * Es el único punto por el que los actores tocan `Page` y `Healer`: las
 * interacciones resuelven por la cadena de candidatos, la caché y la IA, y
 * conservan eventos, reportes, parches y gobernanza.
 */
export class BrowseTheWeb {
  private constructor(
    readonly page: Page,
    readonly healer: Healer,
  ) {}

  static using(page: Page, healer: Healer): BrowseTheWeb {
    return new BrowseTheWeb(page, healer)
  }
}
