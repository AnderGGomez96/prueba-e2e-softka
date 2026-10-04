import { test } from '../../src/fixtures/base';
import { homeLocators } from '../../src/locators/home.locators';
import { Navigate } from '../../src/screenplay/interactions/navigate';
import { Visible } from '../../src/screenplay/questions/visible';
import { TextsWithin } from '../../src/screenplay/questions/texts-within';
import { AddProductToCart } from '../../src/screenplay/tasks/add-product-to-cart';
import { ContainText } from '../../src/screenplay/questions/contain-text';
import { ItemsOnShoppingCart } from '../../src/screenplay/questions/items-shopping-cart';
import { Click } from '../../src/screenplay/interactions/click';
import { CurrentUrl } from '../../src/screenplay/questions/current-url';
import { shoppingCartLocator } from '../../src/locators/shopping-cart.locators';
import { CartProducts } from '../../src/screenplay/questions/cart-products';
import { checkoutLocators } from '../../src/locators/checkout.locators';
import { Checked } from '../../src/screenplay/questions/checked';
import { FormBilling } from '../../src/screenplay/tasks/form-billing';
import { billingData } from '../../src/data/billing-data';
import { Fill } from '../../src/screenplay/interactions/fill';
import { Check } from '../../src/screenplay/interactions/check';
import { ContinueStep } from '../../src/screenplay/tasks/continue-step';

test.describe('Flujo de compra como invitado', () => {

    test('Un invitado puede comprar un producto', async ({ invitado }) => {

        await test.step('Dado que el invitado abre la página de inicio', async () => {
            await invitado.attemptsTo(
                Navigate.to('/'),
            );
            await invitado.asks(Visible.of(homeLocators.pageHeading, 'El invitado debe ver el encabezado de la tienda'));
        });

        await test.step('Cuando agrega dos productos al carrito', async () => {
            await invitado.asks(Visible.of(homeLocators.homeProductCards, 'El invitado debe ver las tarjetas de productos'));
            const nombresProductos = await invitado.asks(TextsWithin.each(homeLocators.productNames));

            const primerProducto = nombresProductos[0];
            const segundoProducto = nombresProductos[1];

            await invitado.attemptsTo(AddProductToCart.from(primerProducto));
            await invitado.asks(ContainText.of(homeLocators.alert, primerProducto, 'El mensaje de alerta debe indicar que el producto fue agregado al carrito'));

            await invitado.attemptsTo(AddProductToCart.from(segundoProducto));
            await invitado.asks(ContainText.of(homeLocators.alert, segundoProducto, 'El mensaje de alerta debe indicar que el producto fue agregado al carrito'));

            await invitado.asks(ItemsOnShoppingCart.read(homeLocators.cartCount, 'El carrito debe indicar el total de elementos añadidos'));
        });

        await test.step('Y navega al carrito de compras', async () => {
            await invitado.attemptsTo(Click.on(homeLocators.navShoppingCart));
            await invitado.asks(Visible.of(homeLocators.pageHeading, 'El invitado debe ver el encabezado de la tienda'));
            await invitado.asks(CurrentUrl.contain('checkout/cart'))

            await invitado.asks(
                CartProducts.sameAs(
                    shoppingCartLocator.cartProductNames,
                    'productosElegidos',
                    'El carrito de compras solo debe contener los productos agregados por el usuario'
                )
            )

        })

        await test.step('Y decide continuar al checkout', async () => {
            await invitado.asks(Visible.of(shoppingCartLocator.checkoutButton, 'El botón  de checkout debe estar visible'));
            await invitado.attemptsTo(Click.on(shoppingCartLocator.checkoutButton));
            await invitado.asks(CurrentUrl.contain('checkout/checkout'))

            await invitado.asks(Visible.of(checkoutLocators.pageHeading, 'El header del checkout es visible'));
        });


        await test.step('Y continúa la compra con la opción "guest"', async () => {
            await invitado.attemptsTo(Click.on(checkoutLocators.guestCheckoutOption));
            await invitado.asks(Checked.of(checkoutLocators.guestCheckoutOption, 'La opción "guest" debe estar seleccionada'))

            await invitado.attemptsTo(Click.on(checkoutLocators.buttonAccount));
            await invitado.asks(Visible.of(checkoutLocators.lengendPersonaDetails, 'Se debe mostrar el formulario de llenado de la informción de facturación'))
        });


        await test.step('Y completa el formulario de facturación', async () => {
            await invitado.attemptsTo(FormBilling.fill(billingData))
            await invitado.attemptsTo(ContinueStep.with(checkoutLocators.billDetailsContinueButton))
            await invitado.asks(Checked.of(checkoutLocators.bankTransferOption, 'El boton de transferencia bancaria debe estar visible y seleccionado'))
        })

        await test.step('Y agrega un comentario a la orden" ', async () => {
            await invitado.attemptsTo(Fill.in(checkoutLocators.commentOrder, billingData.comment));
            await invitado.attemptsTo(ContinueStep.with(checkoutLocators.shippingMethodButton))

        })

        await test.step('Y selecciona el método de pago', async () => {
            await invitado.attemptsTo(Check.on(checkoutLocators.termsAndCondition))
            await invitado.asks(Checked.of(checkoutLocators.termsAndCondition, 'Los terminos y condiciones deben estar aceptados'))
            await invitado.attemptsTo(ContinueStep.with(checkoutLocators.paymentMethodButton))
        })


        await test.step('Entonces confirma la orden y ve el mensaje de éxito', async () => {
            await invitado.asks(
                CartProducts.sameAs(
                    checkoutLocators.checkoutProductNames,
                    'productosElegidos',
                    "Los productos en la confirmación deben ser los seleccionados por el usuario")
                )
            await invitado.attemptsTo(Click.on(checkoutLocators.confirmOrderButton))
            await invitado.asks(Visible.of(checkoutLocators.successHeading,"La orden se completo con exito"))
        })



    })

});