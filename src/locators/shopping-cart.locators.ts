import type { LocatorSpec } from '../healing/types'

const SOURCE_FILE = 'src/locators/shopping-cart.locators.ts'

/**
 * Locators de ejemplo del esqueleto.
 * Reemplazar los valores por los reales del sitio destino.
 */
export const shoppingCartLocator = {

    cartProductNames: {
    key: 'cartProductNames',
    description: 'Nombre de los productos en el carrito de compras',
    action: 'read',
    sourceFile: SOURCE_FILE,
    candidates: [
      //@heal-target:cardProductNames
      { strategy: 'css', value: '.text-left a', within: '.table-responsive'},
    ],
  } satisfies LocatorSpec,

  checkoutButton: {
    key: 'checkoutButton',
    description: 'Botón para continuar con el checkout',
    action: 'read',
    sourceFile: SOURCE_FILE,
    candidates: [
      //@heal-target:checkoutButton
      { strategy: 'role', role:'link', name: 'Checkout', exact:true },
    ],
  } satisfies LocatorSpec,

}
