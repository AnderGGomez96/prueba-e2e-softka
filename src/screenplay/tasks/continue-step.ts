import type { Actor } from '../actor'
import type { Task } from '../types'
import { checkoutLocators } from '../../locators/checkout.locators'
import { LocatorSpec } from '../../healing'
import { Click } from '../interactions/click'
import { Absent } from '../questions/absent'
import { Enabled } from '../questions/enabled'

/**
 * Tarea de negocio de la página de inicio: navega a la raíz y confirma que
 * cargó con su encabezado visible.
 */
export class ContinueStep implements Task {
    private constructor(
        private readonly spec: LocatorSpec
    ) { }

    static with(spec: LocatorSpec): ContinueStep {
        return new ContinueStep(spec)
    }

    async performAs(actor: Actor): Promise<void> {
        await actor.attemptsTo(Click.on(this.spec))
        await actor.asks(Enabled.of(this.spec,"El formulario termino de cargar"))
        await actor.asks(Absent.of(checkoutLocators.dangerText,'No se muestran mensajes de validación'))
    }
}
