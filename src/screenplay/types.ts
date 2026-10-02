import type { Actor } from './actor'

/** Unidad de trabajo atómica que un actor puede ejecutar. */
export interface Interaction {
  performAs(actor: Actor): Promise<void>
}

/** Consulta que un actor responde con estado del sistema bajo prueba. */
export interface Question<T> {
  answeredBy(actor: Actor): Promise<T>
}
