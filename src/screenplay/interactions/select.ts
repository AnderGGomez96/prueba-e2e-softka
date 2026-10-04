import type { LocatorSpec, SelectOption } from '../../healing'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Opciones del interaction {@link Select}. */
export interface SelectOptions {
  /**
   * Substring de la URL de la respuesta AJAX que dispara el `select`.
   *
   * Se arma la espera antes de seleccionar, se espera a que la respuesta
   * termine y se da un breve asentamiento para que el handler repueble el
   * select dependiente (p. ej. país → región); de lo contrario la respuesta
   * puede pisar la selección.
   */
  awaitResponse?: string
  /** Timeout de la espera de la respuesta, en milisegundos. */
  responseTimeoutMs?: number
}

/**
 * Selecciona una opción del `<select>` descrito por el `LocatorSpec`, vía
 * healer. Usar en campos `select` (país, región); `Fill` no aplica ahí.
 */
export class Select implements Interaction {
  private constructor(
    private readonly spec: LocatorSpec,
    private readonly option: SelectOption,
    private readonly options: SelectOptions = {},
  ) {}

  static option(spec: LocatorSpec, option: SelectOption, options: SelectOptions = {}): Select {
    return new Select(spec, option, options)
  }

  async performAs(actor: Actor): Promise<void> {
    const { healer, page } = actor.ability(BrowseTheWeb)
    const responsePattern = this.options.awaitResponse
    const pendingResponse = responsePattern
      ? page.waitForResponse((response) => response.url().includes(responsePattern), {
          timeout: this.options.responseTimeoutMs,
        })
      : undefined

    await healer.select(this.spec, this.option)
    if (pendingResponse) {
      const response = await pendingResponse
      await response.finished()
      await page.waitForTimeout(250)
    }
  }
}
