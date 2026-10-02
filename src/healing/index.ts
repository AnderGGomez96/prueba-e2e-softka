/**
 * Punto de entrada del sistema de healing.
 *
 * Reexporta el modelo de datos, la configuración, los errores, el healer,
 * la gobernanza, la caché, el generador de parches, la fábrica de locators,
 * los resolvedores de IA y el capturador de snapshots.
 */
export * from './types'
export * from './config'
export * from './errors'
export * from './healer'
export * from './governor'
export * from './cache'
export * from './patch-writer'
export * from './locator-factory'
export * from './ai-resolver'
export * from './systemone-client'
export * from './systemone-resolver'
export * from './snapshot'
