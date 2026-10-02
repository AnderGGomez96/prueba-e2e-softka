import type { Interaction, Question } from './types'

/**
 * Actor del patrón Screenplay.
 *
 * Tiene un nombre de negocio, habilidades (`can`), memoria para los datos que
 * viajan entre pasos (`remember`/`recall`) y ejecuta interacciones o tareas
 * (`attemptsTo`) o consulta estado (`asks`).
 */
export class Actor {
  private readonly abilities = new Map<object, object>()
  private readonly memory = new Map<string, unknown>()

  private constructor(readonly name: string) {}

  /** Crea un actor con nombre de negocio (`Cliente`, `Invitado`, ...). */
  static named(name: string): Actor {
    return new Actor(name)
  }

  /** Agrega una habilidad al actor. */
  can(ability: object): this {
    this.abilities.set(Object.getPrototypeOf(ability), ability)
    return this
  }

  /** Obtiene una habilidad por su clase; falla si el actor no la tiene. */
  ability<T extends object>(type: { prototype: T; name: string }): T {
    const ability = this.abilities.get(type.prototype)
    if (!ability) {
      throw new Error(`El actor "${this.name}" no tiene la habilidad ${type.name}`)
    }
    return ability as T
  }

  /** Guarda un dato del flujo en la memoria del actor. */
  remember(key: string, value: unknown): this {
    this.memory.set(key, value)
    return this
  }

  /** Recupera un dato previamente guardado en la memoria del actor. */
  recall<T>(key: string): T {
    return this.memory.get(key) as T
  }

  /** Ejecuta interacciones o tareas en orden. */
  async attemptsTo(...steps: Interaction[]): Promise<void> {
    for (const step of steps) {
      await step.performAs(this)
    }
  }

  /** Responde una pregunta del actor sobre el sistema bajo prueba. */
  async asks<T>(question: Question<T>): Promise<T> {
    return question.answeredBy(this)
  }
}
