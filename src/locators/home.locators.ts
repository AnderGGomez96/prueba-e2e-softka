import type { LocatorSpec } from '../healing/types';

const SOURCE_FILE = 'src/locators/home.locators.ts';

export const homeLocators = {
    pageHeading: {
        key: 'homePageHeading',
        description: 'Encabezado principal h1 de la página de inicio',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:homePageHeading
            { strategy: 'role', role: 'heading', name: 'Your Store' },
            { strategy: 'css', value: 'h1' },
        ],
    } satisfies LocatorSpec,

    alert:{
        key: 'alert',
        description: 'Mensaje de alerta en la página',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:alert
            { strategy: 'css', value: '.alert.alert-success.alert-dismissible' },
            {strategy: 'css', value: 'div[class="alert alert-success alert-dismissible"]'}
        ],
    } satisfies LocatorSpec,

    homeProductCards:{
        key: 'homeProductCards',
        description: 'Tarjetas de productos en la página de inicio',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:homeProductCards
            { strategy: 'css', value: '.product-thumb.transition' },
            {strategy: 'css', value: 'div[class="product-thumb transition"]'}
        ],
    } satisfies LocatorSpec,

    productNames:{
        key: 'productNames',
        description: 'Nombres de productos en la página de inicio',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:productNames
            { strategy: 'css', value: '.product-thumb.transition h4 a' },
        ],
    } satisfies LocatorSpec,

    cartCount :{
        key: 'cartCount',
        description: 'Cantidad de items agregados al carrito',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates:[
            //@heal-target:cartCount
            {strategy:'css', value:'#cart-total', within: 'button'}
        ],
    } satisfies LocatorSpec,
    
    navShoppingCart:{
        key: 'navShoppingCart',
        description: 'opción de navegación al carro de compras',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates:[
            //@heal-target:navShoppingCart
            {strategy:'css', value:'a[title="Shopping Cart"]'}
        ]
    } satisfies LocatorSpec,

    productCard(productName: string): LocatorSpec {
        const slug = productName.toLowerCase().replace(/\s+/g, '-');
        return {
            key: `productCard.${slug}`,
            description: 'Tarjeta de producto individual en la página de inicio',
            action: 'read',
            sourceFile: SOURCE_FILE,
            candidates: [
                //@heal-target:productCard
                { strategy: 'css', value: `.product-thumb.transition:has-text("${productName}")` },
                {strategy: 'css', value: `div[class="product-thumb transition"]:has-text("${productName}")` }
            ],
        } satisfies LocatorSpec;
    },

    addToCartButton(productName: string): LocatorSpec {
        const slug = productName.toLowerCase().replace(/\s+/g, '-');
        const cardSelector = `.product-thumb.transition:has-text("${productName}")`;

        return {
            key: `addToCartButton.${slug}`,
            description: 'Botón "Add to Cart" para un producto específico',
            action: 'click',
            sourceFile: SOURCE_FILE,
            candidates: [
                //@heal-target:addToCartButton
                { strategy: 'role', role: 'button', name: 'Add to Cart', within: cardSelector },
                { strategy: 'css', value: `button[onclick*="cart.add"]` , within: cardSelector},
            ]
        } satisfies LocatorSpec;
    },

    priceOfProduct(productName: string): LocatorSpec {
        const slug = productName.toLowerCase().replace(/\s+/g, '-');
        const cardSelector = `.product-thumb.transition:has-text("${productName}")`;
        return {
            key: `priceOfProduct.${slug}`,
            description: 'Precio de un producto específico',
            action: 'read',
            sourceFile: SOURCE_FILE,
            candidates: [
                //@heal-target:priceOfProduct
                { strategy: 'css', value: `.price`, within: cardSelector },
            ]
        } satisfies LocatorSpec;
    },

}