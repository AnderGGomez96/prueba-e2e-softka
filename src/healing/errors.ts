/**
 * Errores propios del sistema de healing.
 *
 * Todos heredan de {@link HealingError} para que el consumidor pueda
 * distinguir fallas del healer de errores de Playwright.
 */
import type { HealingAttempt, LocatorSpec } from './types'

/** Error base del sistema de healing. */
export class HealingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** Error de gobernanza: se superó un límite o no se alcanzó la confianza mínima. */
export class HealingGovernanceError extends HealingError {}

/**
 * Error terminal: ningún nivel de la escalera pudo resolver el locator.
 *
 * Incluye el spec original, la lista de intentos con sus errores y el motivo
 * final, con el objetivo de que el mensaje sea autosuficiente en el reporte.
 */
export class HealingExhaustedError extends HealingError {
  /**
   * @param spec - Locator que no se pudo resolver.
   * @param attempts - Intentos realizados, en orden.
   * @param reason - Motivo final del agotamiento.
   */
  constructor(
    readonly spec: LocatorSpec,
    readonly attempts: HealingAttempt[],
    reason: string,
  ) {
    const detail = attempts
      .map((attempt) => `  - ${attempt.ok ? 'OK' : 'FALLO'} ${attempt.label}${attempt.error ? ` (${attempt.error})` : ''}`)
      .join('\n')
    super(
      [
        `No se pudo resolver el locator "${spec.key}" (${spec.description}).`,
        `Motivo: ${reason}`,
        'Intentos realizados:',
        detail || '  - sin intentos registrados',
      ].join('\n'),
    )
  }
}

/**
 * Extrae un mensaje corto y legible de un valor desconocido.
 *
 * @param error - Error capturado en un `catch`.
 * @returns La primera línea del mensaje, o la representación del valor.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split('\n')[0]
  }
  return String(error)
}
