/**
 * Gobernanza del healing.
 *
 * Aplica los límites configurados ({@link HealingConfig.minConfidence} y
 * {@link HealingConfig.maxHealsPerTest}) y acumula los eventos de curación
 * de la prueba actual.
 */
import type { HealingConfig } from './config'
import { HealingGovernanceError } from './errors'
import type { HealingEvent } from './types'

/** Controlador de límites y registro de eventos por prueba. */
export class HealingGovernor {
  /** Eventos registrados, en orden de ocurrencia. */
  readonly events: HealingEvent[] = []

  /**
   * @param config - Configuración vigente de healing.
   */
  constructor(private readonly config: HealingConfig) {}

  /** Cantidad de curaciones automáticas (IA o caché) realizadas hasta ahora. */
  get autoRecoveryCount(): number {
    return this.events.filter((event) => event.level === 'ai' || event.level === 'cache').length
  }

  /**
   * Verifica que aún queden auto-recuperaciones disponibles.
   *
   * @throws HealingGovernanceError si se alcanzó `maxHealsPerTest`.
   */
  assertCanHeal(): void {
    if (this.autoRecoveryCount >= this.config.maxHealsPerTest) {
      throw new HealingGovernanceError(
        `Limite de auto-recuperaciones alcanzado (${this.config.maxHealsPerTest}) en modo ${this.config.mode}`,
      )
    }
  }

  /**
   * Verifica que una confianza supere el umbral configurado.
   *
   * @param confidence - Confianza reportada por el motor, entre 0 y 1.
   * @throws HealingGovernanceError si la confianza está por debajo del umbral.
   */
  assertConfidence(confidence: number): void {
    if (confidence < this.config.minConfidence) {
      throw new HealingGovernanceError(
        `Confianza ${confidence.toFixed(2)} por debajo del umbral requerido ${this.config.minConfidence} (modo ${this.config.mode})`,
      )
    }
  }

  /**
   * Registra un evento de resolución.
   *
   * @param event - Evento a agregar a la bitácora.
   */
  record(event: HealingEvent): void {
    this.events.push(event)
  }
}
