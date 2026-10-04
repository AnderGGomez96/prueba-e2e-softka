import type { Actor } from '../actor'
import type { Task } from '../types'
import { Navigate } from '../interactions/navigate'
import { Visible } from '../questions/visible'
import { homeLocators } from '../../locators/home.locators'
import { Click } from '../interactions/click'
import { memoryAppend } from '../memory'
import { TextOf } from '../questions/text-of'
import { ParsePrice } from '../../utils/parse-price'

/**
 * Tarea de negocio de la página de inicio: navega a la raíz y confirma que
 * cargó con su encabezado visible.
 */
export class AddProductToCart implements Task {
    private constructor(private readonly product: string) { }

    static from(product: string): AddProductToCart {
        return new AddProductToCart(product)
    }

    async performAs(actor: Actor): Promise<void> {
        const price = await actor.asks(TextOf.locator(homeLocators.priceOfProduct(this.product)));

        await actor.attemptsTo(Click.on(homeLocators.addToCartButton(this.product)))

        await actor.asks(Visible.of(homeLocators.alert, 'El invitado debe ver un mensaje de alerta indicando que el producto fue agregado al carrito'));
        memoryAppend(actor, 'productosElegidos', { nombre: this.product, precio: ParsePrice.parse(price), cantidad: 1 })
        

    }
}
