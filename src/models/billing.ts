/**
 * Contratos de dominio del flujo de facturación del checkout.
 *
 * Definen la forma que reciben los tasks (por ejemplo `FormBilling`) y no
 * conocen el origen de los valores (JSON de prueba, faker, API...).
 */

/** Datos personales del comprador (fieldset "Your Personal Details"). */
export interface PersonalDetails {
  firstName: string
  lastName: string
  email: string
  telephone: string
}

/** Dirección de facturación (fieldset "Your Address"). */
export interface AddressDetails {
  company: string
  address1: string
  address2: string
  city: string
  postCode: string
  country: string
  regionState: string
}

/** Datos completos del formulario de facturación del checkout. */
export interface BillingData {
  personal: PersonalDetails
  address: AddressDetails
  comment: string
}
