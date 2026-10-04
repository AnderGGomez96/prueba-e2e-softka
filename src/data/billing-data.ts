/**
 * Datos de facturación de prueba.
 *
 * `billing-data.json` solo aporta valores; este módulo los tipa contra el
 * contrato {@link BillingData} (en `src/models/billing.ts`) y los expone como
 * {@link billingData} para inyectarlos en los tasks.
 */
import rawBillingData from './billing-data.json'
import type { BillingData } from '../models/billing'

/** Datos de facturación tipados, listos para inyectar en los tasks. */
export const billingData: BillingData = rawBillingData
