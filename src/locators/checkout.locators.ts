import type { LocatorSpec } from '../healing/types'

const SOURCE_FILE = 'src/locators/checkout.locators.ts'

export const checkoutLocators = {

    pageHeading: {
        key: 'checkoutPageHeading',
        description: 'Encabezado principal h1 de la página de inicio',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:checkoutPageHeading
            { strategy: 'role', role: 'heading', name: 'Checkout' },
            { strategy: 'css', value: 'h1', within: '#content' },
        ],
    } satisfies LocatorSpec,

    guestCheckoutOption: {
        key: 'guestCheckoutOption',
        description: 'Opción para hacer el checkout como invitado',
        action: 'click',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:guestCheckoutOption
            { strategy: 'css', value: 'input[value="guest"]' },
        ],
    } satisfies LocatorSpec,

    buttonAccount:
        {
            key: 'buttonAccount',
            description: '01 -  Opción continuar con la cuenta seleccionada',
            action: 'click',
            sourceFile: SOURCE_FILE,
            candidates: [
                //@heal-target:buttonAccount
                { strategy: 'role', role: 'button', value: 'continue', within: 'div[class="col-sm-6"]' }
            ],
        } satisfies LocatorSpec,

    lengendPersonaDetails: {
        key: 'lengendPersonaDetails',
        description: 'Legenda del paso 2 Billing details ',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:lengendPersonaDetails
            { strategy: 'text', value: 'Your Personal Details', within: '#account' }
        ],
    } satisfies LocatorSpec,

    customerGroup: {
        key: 'customerGroup',
        description: 'Radio de grupo de cliente (oculto y preseleccionado por la app)',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:customerGroup
            { strategy: 'css', value: 'input[name="customer_group_id"][value="1"]', within: '#account', note: 'display:none; viene marcado por defecto, no interactuar' },
            { strategy: 'css', value: 'input[name="customer_group_id"]', within: '#account', note: 'display:none; viene marcado por defecto, no interactuar' },
        ],
    } satisfies LocatorSpec,

    firstName: {
        key: 'firstName',
        description: 'Campo de texto First Name del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:firstName
            { strategy: 'label', value: 'First Name', within: '#account' },
            { strategy: 'css', value: '#input-payment-firstname' },
            { strategy: 'css', value: 'input[name="firstname"]', within: '#account' },
        ],
    } satisfies LocatorSpec,

    lastName: {
        key: 'lastName',
        description: 'Campo de texto Last Name del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:lastName
            { strategy: 'label', value: 'Last Name', within: '#account' },
            { strategy: 'css', value: '#input-payment-lastname' },
            { strategy: 'css', value: 'input[name="lastname"]', within: '#account' },
        ],
    } satisfies LocatorSpec,

    email: {
        key: 'email',
        description: 'Campo de texto E-Mail del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:email
            { strategy: 'label', value: 'E-Mail', within: '#account' },
            { strategy: 'css', value: '#input-payment-email' },
            { strategy: 'css', value: 'input[name="email"]', within: '#account' },
        ],
    } satisfies LocatorSpec,

    telephone: {
        key: 'telephone',
        description: 'Campo de texto Telephone del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:telephone
            { strategy: 'label', value: 'Telephone', within: '#account' },
            { strategy: 'css', value: '#input-payment-telephone' },
            { strategy: 'css', value: 'input[name="telephone"]', within: '#account' },
        ],
    } satisfies LocatorSpec,

    company: {
        key: 'company',
        description: 'Campo de texto Company del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:company
            { strategy: 'label', value: 'Company', within: '#address' },
            { strategy: 'css', value: '#input-payment-company' },
            { strategy: 'css', value: 'input[name="company"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    address1: {
        key: 'address1',
        description: 'Campo de texto Address 1 del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:address1
            { strategy: 'label', value: 'Address 1', within: '#address' },
            { strategy: 'css', value: '#input-payment-address-1' },
            { strategy: 'css', value: 'input[name="address_1"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    address2: {
        key: 'address2',
        description: 'Campo de texto Address 2 del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:address2
            { strategy: 'label', value: 'Address 2', within: '#address' },
            { strategy: 'css', value: '#input-payment-address-2' },
            { strategy: 'css', value: 'input[name="address_2"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    city: {
        key: 'city',
        description: 'Campo de texto City del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:city
            { strategy: 'label', value: 'City', within: '#address' },
            { strategy: 'css', value: '#input-payment-city' },
            { strategy: 'css', value: 'input[name="city"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    postCode: {
        key: 'postCode',
        description: 'Campo de texto Post Code del formulario de facturación',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:postCode
            { strategy: 'label', value: 'Post Code', within: '#address' },
            { strategy: 'css', value: '#input-payment-postcode' },
            { strategy: 'css', value: 'input[name="postcode"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    country: {
        key: 'country',
        description: 'Select de Country del formulario de facturación',
        action: 'select',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:country
            { strategy: 'label', value: 'Country', within: '#address' },
            { strategy: 'css', value: '#input-payment-country' },
            { strategy: 'css', value: 'select[name="country_id"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    regionState: {
        key: 'regionState',
        description: 'Select de Region / State del formulario de facturación',
        action: 'select',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:regionState
            { strategy: 'label', value: 'Region / State', within: '#address', note: 'depende de country: su lista se recarga por AJAX (checkout/checkout/country)' },
            { strategy: 'css', value: '#input-payment-zone' },
            { strategy: 'css', value: 'select[name="zone_id"]', within: '#address' },
        ],
    } satisfies LocatorSpec,

    billDetailsContinueButton: {
        key: 'billDetailsContinueButton',
        description: '02- Botón que permite continuar despues de llenar el formulario de billing',
        action: 'click',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:billDetailsContinueButton
            { strategy: 'css', value: '#button-guest', within: 'div[class="buttons"]' },

        ],
    } satisfies LocatorSpec,

    dangerText: {
        key: 'dangerText',
        description: 'Alerta de validación en los campos',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:dangerText
            { strategy: 'css', value: '.text-danger' },

        ],
    } satisfies LocatorSpec,


    bankTransferOption: {
        key: 'bankTransferOption',
        description: 'opción de transferencia bancaria',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:bankTransferOption
            { strategy: 'text', value: 'Flat Shipping Rate - $' },

        ],
    } satisfies LocatorSpec,

    commentOrder: {
        key: 'commentOrder',
        description: 'Campo de comentarios para la transferencia',
        action: 'fill',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:commentOrder
            { strategy: 'css', value: 'textarea[class="form-control"]' },

        ],
    } satisfies LocatorSpec,

    termsAndCondition: {
        key: 'termsAndCondition',
        description: 'Checkbox para aceptar los terminos y condiciones',
        action: 'check',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:termsAndCondition
            { strategy: 'css', value: 'input[name="agree"]' },

        ],
    } satisfies LocatorSpec,
        shippingMethodButton: {
        key: 'shippingMethodButton',
        description: '04 - Boton de continuar en el metodo de pago',
        action: 'click',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:shippingMethodButton
            { strategy: 'css', value: '#button-shipping-method', within: '#collapse-shipping-method' },

        ],
    } satisfies LocatorSpec,

    paymentMethodButton: {
        key: 'paymentMethodButton',
        description: 'Boton de continuar en el metodo de pago',
        action: 'click',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:paymentMethodButton
            { strategy: 'css', value: '#button-payment-method', within: '#collapse-payment-method' },

        ],
    } satisfies LocatorSpec,

    checkoutProductNames:{
        key: 'checkoutProductNames',
        description: 'Nombres de los productos en el checkout',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:checkoutProductNames
            { strategy: 'css', value:  '.text-left a', within: '.table.table-striped'},
        ],
    } satisfies LocatorSpec,

    confirmOrderButton:{
        key: 'confirmOrderButton',
        description: 'Nombres de los productos en el checkout',
        action: 'click',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:confirmOrderButton
            { strategy: 'css', value:  '#button-confirm', within: '.buttons'},
        ],
    } satisfies LocatorSpec,

    successHeading:{
        key: 'successHeading',
        description: 'Mensaje de confirmación de orden',
        action: 'read',
        sourceFile: SOURCE_FILE,
        candidates: [
            //@heal-target:successHeading
            { strategy: 'role', role:'heading', name:  'Your order has been placed!'},
        ],
    } satisfies LocatorSpec,
}
