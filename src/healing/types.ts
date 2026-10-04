/**
 * Modelo de datos del sistema de healing.
 *
 * Define los locators como datos ({@link LocatorSpec} con su cadena de
 * {@link LocatorCandidate}), las propuestas de los motores de resolución
 * ({@link AiResolution}, {@link AiProposal}) y la bitácora de cada curación
 * ({@link HealingEvent}), que alimenta la gobernanza, la caché y los parches.
 */
import type { PageSnapshot } from './snapshot'

/** Estrategia de resolución soportada al convertir un candidato a locator. */
export type LocatorStrategy =
  | 'testid'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'text'
  | 'css'
  | 'alt'
  | 'title'

/** Acción semántica que describe qué se hará con el elemento. */
export type LocatorAction = 'click' | 'fill' | 'select' | 'check' | 'read' | 'assert'

/**
 * Opción a seleccionar en un `<select>`: texto (matchea value o label),
 * o la terna label/value/index de Playwright.
 */
export type SelectOption = string | { label?: string; value?: string; index?: number }

/**
 * Candidato concreto dentro de la cadena de fallbacks de un locator.
 *
 * @see {@link candidateToLocator} para la traducción a la API de Playwright.
 */
export interface LocatorCandidate {
  /** Estrategia con la que se resuelve el candidato. */
  strategy: LocatorStrategy
  /** Valor para las estrategias distintas de `role` (testid, label, texto, CSS...). */
  value?: string
  /** Rol requerido cuando `strategy` es `role`. */
  role?: string
  /** Nombre accesible requerido cuando `strategy` es `role`. */
  name?: string
  /** Fuerza coincidencia exacta en las estrategias que la soportan. */
  exact?: boolean
  /** Selector CSS del contenedor que acota la búsqueda. */
  within?: string
  /** Nota libre para depuración o para el motor de resolución. */
  note?: string
}

/**
 * Definición completa de un locator: identidad, semántica y cadena de fallbacks.
 *
 * Es la unidad que reciben `Healer.click`, `Healer.fill` y `Healer.text`.
 */
export interface LocatorSpec {
  /** Identificador único; se usa en caché, eventos y marcadores `@heal-target`. */
  key: string
  /** Descripción semántica del elemento; es el contexto que recibe la IA. */
  description: string
  /** Acción prevista sobre el elemento. */
  action: LocatorAction
  /** Candidatos en orden de intento: el índice 0 es el primario. */
  candidates: LocatorCandidate[]
  /** Ruta del archivo que contiene el spec, relativa al root del repo (para parches). */
  sourceFile?: string
}

/** Nivel de la escalera de resolución que curó el locator. */
export type HealingLevel = 'primary' | 'fallback' | 'cache' | 'ai'

/** Origen concreto de la resolución: cadena, caché o alguno de los motores. */
export type HealingProvider = 'chain' | 'cache' | 'llm' | 'systemone'

/** Resultado de un intento individual durante la resolución. */
export interface HealingAttempt {
  /** Descripción legible del candidato probado. */
  label: string
  /** Indica si el intento resolvió el elemento. */
  ok: boolean
  /** Mensaje de error del intento, si falló. */
  error?: string
}

/** Consumo de tokens reportado por el motor de resolución. */
export interface TokenUsage {
  /** Tokens de entrada (prompt). */
  inputTokens?: number
  /** Tokens de salida (respuesta). */
  outputTokens?: number
}

/**
 * Bitácora de una resolución exitosa.
 *
 * Se registra en el governor, se anota en el test y alimenta el reporte,
 * la caché y la generación de parches.
 */
export interface HealingEvent {
  /** Clave del {@link LocatorSpec} resuelto. */
  key: string
  /** Descripción semántica del locator. */
  description: string
  /** Acción prevista. */
  action: LocatorAction
  /** Nivel de la escalera que resolvió el elemento. */
  level: HealingLevel
  /** Origen concreto de la resolución. */
  provider: HealingProvider
  /** Índice del candidato que resolvió, cuando aplica (niveles 1 y 2). */
  candidateIndex?: number
  /** Candidato resuelto, cuando aplica (niveles 1 y 2). */
  candidate?: LocatorCandidate
  /** Candidato propuesto por la IA o recuperado de caché. */
  healedCandidate?: LocatorCandidate
  /** Confianza reportada por el motor, entre 0 y 1. */
  confidence?: number
  /** Distribución de probabilidades cuando el motor la expone (System One). */
  probabilities?: Record<string, number>
  /** Tokens consumidos por el motor. */
  usage?: TokenUsage
  /** Justificación del motor para el candidato elegido. */
  reasoning?: string
  /** Modelo que resolvió la curación. */
  model?: string
  /** Duración total de la resolución, en milisegundos. */
  durationMs: number
  /** Marca temporal ISO-8601 de la resolución. */
  timestamp: string
  /** URL de la página en el momento de la resolución. */
  pageUrl: string
  /** Intentos fallidos previos a la resolución. */
  attempts: HealingAttempt[]
}

/** Respuesta cruda y normalizada del motor de resolución. */
export interface AiResolution {
  /** Candidato propuesto. */
  candidate: LocatorCandidate
  /** Confianza normalizada entre 0 y 1. */
  confidence: number
  /** Justificación devuelta por el modelo. */
  reasoning: string
  /** Modelo que generó la respuesta. */
  model: string
  /** Respuesta original sin procesar. */
  raw: string
  /** Distribución de probabilidades, si el motor la expone. */
  probabilities?: Record<string, number>
}

/** Propuesta completa del motor, lista para probarse contra la página. */
export interface AiProposal {
  /** Resolución propuesta por el motor. */
  resolution: AiResolution
  /** Snapshot de la página usado como contexto. */
  snapshot: PageSnapshot
  /** Distribución de probabilidades, si el motor la expone. */
  probabilities?: Record<string, number>
  /** Tokens consumidos por el motor. */
  usage?: TokenUsage
}
