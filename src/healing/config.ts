/**
 * Configuración del sistema de healing cargada desde variables de entorno.
 *
 * Centraliza modo de gobernanza, motor de resolución, umbrales, rutas de
 * artefactos y credenciales. {@link loadHealingConfig} es el único punto de
 * lectura; el resto del sistema solo consume {@link HealingConfig}.
 */
import { randomUUID } from 'node:crypto'
import type { SnapshotMode } from './snapshot'

/** Modo de gobernanza: `local` es permisivo; `ci` aplica umbrales estrictos. */
export type HealingMode = 'local' | 'ci'

/** Motor del Nivel 3: chat generativo o System One (Jev/Laya). */
export type HealingEngine = 'chat' | 'systemone'

/** Configuración del backend de chat compatible con OpenAI. */
export interface LlmConfig {
  /** Indica si hay credenciales y el motor puede usarse. */
  enabled: boolean
  /** URL base del servicio de chat. */
  baseURL: string
  /** Credencial de acceso; se resuelve solo desde variables de entorno. */
  apiKey?: string
  /** Identificador del modelo. */
  model: string
  /** Timeout de la llamada HTTP, en milisegundos. */
  timeoutMs: number
  /** Máximo de tokens de salida solicitados. */
  maxOutputTokens: number
  /** Reintentos adicionales de resolución (con feedback del error). */
  retries: number
  /** Identificador de sesión para trazabilidad del proveedor. */
  sessionId: string
  /** User-Agent enviado en las solicitudes. */
  userAgent: string
}

/** Configuración del backend System One (Jev de TypeSafe o Laya local). */
export interface SystemOneConfig {
  /** Indica si hay credenciales y el motor puede usarse. */
  enabled: boolean
  /** URL base del servicio System One. */
  baseURL: string
  /** Credencial de acceso al servicio. */
  apiKey?: string
  /** Identificador del modelo. */
  model: string
  /** Timeout de la llamada HTTP, en milisegundos. */
  timeoutMs: number
  /** User-Agent enviado en las solicitudes. */
  userAgent: string
}

/** Configuración completa y resuelta del sistema de healing. */
export interface HealingConfig {
  /** Modo de gobernanza vigente. */
  mode: HealingMode
  /** Motor del Nivel 3 seleccionado. */
  engine: HealingEngine
  /** Vista de contexto enviada al motor. */
  snapshotMode: SnapshotMode
  /** Confianza mínima aceptada de una curación automática (0 a 1). */
  minConfidence: number
  /** Máximo de auto-recuperaciones (IA o caché) por prueba. */
  maxHealsPerTest: number
  /** Timeout por candidato de la cadena de fallbacks, en milisegundos. */
  candidateTimeoutMs: number
  /** Directorio de artefactos (reportes, eventos, snapshots). */
  artifactsDir: string
  /** Directorio de parches y sugerencias. */
  patchesDir: string
  /** Habilita la generación de `.patch` al curar. */
  writePatches: boolean
  /** Aplica el parche directamente sobre el archivo fuente. */
  applyAutofix: boolean
  /** Habilita la caché de curaciones. */
  cacheEnabled: boolean
  /** Configuración del motor de chat. */
  llm: LlmConfig
  /** Configuración del motor System One. */
  systemone: SystemOneConfig
}

function readNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readFlag(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  return raw === '1' || raw.toLowerCase() === 'true'
}

/**
 * Construye la configuración a partir de variables de entorno.
 *
 * El modo se deduce de `HEAL_MODE` o, en su defecto, de la variable `CI`.
 * Los umbrales tienen valores por defecto distintos según el modo. La
 * credencial de chat puede venir de `HEAL_LLM_API_KEY`, `OPENCODE_GO_API_KEY`
 * o `OPENCODE_API_KEY`.
 *
 * @param env - Entorno a leer; por defecto `process.env`.
 * @returns Configuración lista para {@link Healer}.
 */
export function loadHealingConfig(env: NodeJS.ProcessEnv = process.env): HealingConfig {
  const mode: HealingMode =
    env.HEAL_MODE === 'ci' || env.HEAL_MODE === 'local'
      ? env.HEAL_MODE
      : env.CI && env.CI !== 'false' && env.CI !== '0'
        ? 'ci'
        : 'local'

  const engine: HealingEngine = env.HEAL_ENGINE === 'systemone' ? 'systemone' : 'chat'

  const apiKey =
    env.HEAL_LLM_API_KEY || env.OPENCODE_GO_API_KEY || env.OPENCODE_API_KEY
  const jevKey = env.HEAL_JEV_API_KEY || env.HEAL_SYSTEMONE_API_KEY || env.TYPESAFE_API_KEY
  const userAgent = 'auto-fix-healer-poc/0.1 (Playwright)'

  return {
    mode,
    engine,
    snapshotMode: env.HEAL_SNAPSHOT === 'dom' ? 'dom' : 'hybrid',
    minConfidence: readNumber(env, 'HEAL_MIN_CONFIDENCE', mode === 'ci' ? 0.85 : 0.5),
    maxHealsPerTest: readNumber(env, 'HEAL_MAX_PER_TEST', mode === 'ci' ? 2 : 3),
    candidateTimeoutMs: readNumber(env, 'HEAL_CANDIDATE_TIMEOUT_MS', 10_000),
    artifactsDir: env.HEAL_ARTIFACTS_DIR || '.healing',
    patchesDir: env.HEAL_PATCHES_DIR || 'patches',
    writePatches: readFlag(env, 'HEAL_WRITE_PATCHES', true),
    applyAutofix: readFlag(env, 'HEAL_APPLY', false),
    cacheEnabled: readFlag(env, 'HEAL_CACHE_ENABLED', true),
    llm: {
      enabled: Boolean(apiKey),
      baseURL: (env.HEAL_LLM_BASE_URL || 'https://opencode.ai/zen/go/v1').replace(/\/$/, ''),
      apiKey,
      model: env.HEAL_LLM_MODEL || 'deepseek-v4.1-flash',
      timeoutMs: readNumber(env, 'HEAL_LLM_TIMEOUT_MS', 45_000),
      maxOutputTokens: readNumber(env, 'HEAL_LLM_MAX_TOKENS', 1200),
      retries: readNumber(env, 'HEAL_LLM_RETRIES', 1),
      sessionId: env.HEAL_LLM_SESSION || `auto-fix-${randomUUID()}`,
      userAgent,
    },
    systemone: {
      enabled: engine === 'systemone' && Boolean(jevKey),
      baseURL: (env.HEAL_JEV_BASE_URL || 'https://api.typesafe.ai/v1').replace(/\/$/, ''),
      apiKey: jevKey,
      model: env.HEAL_JEV_MODEL || 'jev-latest',
      timeoutMs: readNumber(env, 'HEAL_JEV_TIMEOUT_MS', 15_000),
      userAgent,
    },
  }
}
