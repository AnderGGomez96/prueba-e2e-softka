/**
 * Cliente HTTP del motor `systemone` (Jev de TypeSafe o Laya local).
 *
 * A diferencia del motor `chat`, este protocolo no genera texto: recibe un
 * `state` descriptivo y un conjunto de preguntas tipadas (`choice`, `score`,
 * `noul`) y devuelve respuestas estructuradas con confianza y probabilidades.
 */
import type { SystemOneConfig } from './config'
import type { TokenUsage } from './types'

/** Pregunta de elección: el modelo elige una clave del mapa `criteria`. */
export interface SystemOneChoiceQuestion {
  type: 'choice'
  /** Instrucción en lenguaje natural sobre qué debe elegir. */
  instructions: string
  /** Opciones válidas: clave legible -> descripción, o `null` para descartar. */
  criteria: Record<string, string | null>
}

/** Pregunta de puntuación: el modelo puntúa cada criterio de la lista. */
export interface SystemOneScoreQuestion {
  type: 'score'
  /** Instrucción en lenguaje natural sobre qué debe puntuar. */
  instructions: string
  /** Criterios a puntuar. */
  criteria: string[]
}

/** Pregunta "none of the above": probabilidad de que nada coincida. */
export interface SystemOneNoulQuestion {
  type: 'noul'
  /** Instrucción en lenguaje natural. */
  instructions: string
}

/** Cualquiera de las preguntas soportadas por System One. */
export type SystemOneQuestion =
  | SystemOneChoiceQuestion
  | SystemOneScoreQuestion
  | SystemOneNoulQuestion

/** Respuesta a una pregunta `choice`. */
export interface SystemOneChoiceAnswer {
  type: 'choice'
  /** Clave elegida dentro de `criteria`. */
  choice: string
  /** Confianza calibrada de la elección, entre 0 y 1. */
  confidence: number
  /** Distribución de probabilidad sobre todas las opciones. */
  probabilities: Record<string, number>
}

/** Respuesta a una pregunta `noul`. */
export interface SystemOneNoulAnswer {
  type: 'noul'
  /** Probabilidad de que ningún elemento coincida. */
  noul: number
}

/** Respuesta completa del servicio. */
export interface SystemOneResponse {
  /** Modelo que atendió la solicitud. */
  model: string
  /** Respuestas indexadas por el nombre de la pregunta. */
  answers: Record<string, SystemOneChoiceAnswer | SystemOneNoulAnswer>
  /** Tokens consumidos, si el servicio los reporta. */
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

/** Cliente de System One con timeout. */
export class SystemOneClient {
  /**
   * @param config - Configuración del backend System One.
   */
  constructor(private readonly config: SystemOneConfig) {}

  /**
   * Envía el estado y las preguntas al endpoint `/systemone`.
   *
   * @param state - Contexto textual de la página y los objetivos.
   * @param questions - Preguntas tipadas indexadas por nombre.
   * @returns Respuesta estructurada del servicio.
   * @throws Error si el servicio responde con error o excede el timeout.
   */
  async complete(
    state: string,
    questions: Record<string, SystemOneQuestion>,
  ): Promise<SystemOneResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(`${this.config.baseURL}/systemone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey ?? ''}`,
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          state,
          model: this.config.model,
          questions,
        }),
        signal: controller.signal,
      })

      const text = await response.text()
      if (!response.ok) {
        throw new Error(
          `La API de System One (${this.config.model}) respondio HTTP ${response.status}: ${text.slice(0, 400)}`,
        )
      }

      return JSON.parse(text) as SystemOneResponse
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `La API de System One excedio el timeout de ${this.config.timeoutMs} ms`,
        )
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Normaliza el consumo de tokens de una respuesta al modelo interno.
 *
 * @param response - Respuesta cruda del servicio.
 * @returns Tokens de entrada y salida, o `undefined` si no vienen en la respuesta.
 */
export function usageOf(response: SystemOneResponse): TokenUsage | undefined {
  if (!response.usage) return undefined
  return {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
