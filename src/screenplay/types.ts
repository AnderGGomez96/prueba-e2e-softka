import type { Actor } from './actor'

/** Acción atómica o verificación que un actor puede ejecutar. */
export interface Interaction {
  performAs(actor: Actor): Promise<void>
}

/** Tarea de negocio: interacción que compone acciones o tareas. */
export interface Task extends Interaction {}

/** Consulta que un actor responde con estado del sistema bajo prueba. */
export interface Question<T> {
  answeredBy(actor: Actor): Promise<T>
}
