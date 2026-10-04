import type { Actor } from '../actor'
import type { Task } from '../types'
import { BillingData } from '../../models/billing'
import { Fill } from '../interactions/fill'
import { checkoutLocators } from '../../locators/checkout.locators'
import { Select } from '../interactions/select'

/**
 * Tarea de negocio de la página de inicio: navega a la raíz y confirma que
 * cargó con su encabezado visible.
 */
export class FormBilling implements Task {
    private constructor(
        private readonly billingData: BillingData
    ) { }

    static fill(billingData: BillingData): FormBilling {
        return new FormBilling(billingData)
    }

    async performAs(actor: Actor): Promise<void> {

        await actor.attemptsTo(
            Fill.in(checkoutLocators.firstName,this.billingData.personal.firstName),
            Fill.in(checkoutLocators.lastName,this.billingData.personal.lastName),
            Fill.in(checkoutLocators.email,this.billingData.personal.email),
            Fill.in(checkoutLocators.telephone,this.billingData.personal.telephone),
            Fill.in(checkoutLocators.company,this.billingData.address.company),
            Fill.in(checkoutLocators.address1,this.billingData.address.address1),
            Fill.in(checkoutLocators.address2,this.billingData.address.address2),
            Fill.in(checkoutLocators.city,this.billingData.address.city),
            Fill.in(checkoutLocators.postCode,this.billingData.address.postCode),
            Select.option(checkoutLocators.country,this.billingData.address.country, { awaitResponse: 'checkout/checkout/country' }),
            Select.option(checkoutLocators.regionState,this.billingData.address.regionState),
        )
    }
}
