/**
 * Motor de resolución `chat`: propone un locator con un LLM generativo.
 *
 * Captura el contexto de página (DOM y, en modo híbrido, árbol de
 * accesibilidad), arma el prompt con reglas de preferencia y valida la
 * respuesta JSON del modelo antes de devolverla como {@link AiProposal}.
 */
import type { Page } from '@playwright/test'
import type { LlmConfig } from './config'
import type { AiProposal, AiResolution, LocatorCandidate, LocatorSpec, LocatorStrategy } from './types'
import { OpenCodeGoClient, type ChatMessage } from './llm-client'
import { capturePageSnapshot, type PageSnapshot, type SnapshotMode } from './snapshot'

/** Instrucciones fijas que definen el formato de salida y las prioridades del modelo. */
const SYSTEM_PROMPT = [
  'Eres un motor de reparacion de locators para pruebas de Playwright.',
  'Recibes la descripcion semantica de una accion, el arbol de accesibilidad de la pagina y un snapshot JSON de los elementos interactivos.',
  'Debes elegir UN elemento del snapshot que corresponda a la accion y devolver SOLO un objeto JSON, sin markdown ni texto adicional.',
  'Formato exacto:',
  '{"strategy":"testid|role|label|placeholder|text|css","value":"...","role":"...","name":"...","exact":false,"within":"...","confidence":0.0,"reasoning":"..."}',
  'Reglas:',
  '- Orden de preferencia: testid (atributo data-qa), role+name, placeholder, label, text, css.',
  '- El campo "arbolAccesibilidad" (YAML) es la vista semantica real: usalo para confirmar rol y nombre accesible del elemento.',
  '- Cada elemento de "elementosInteractivos" trae "ref" (e0, e1, ...), sus atributos y "a11y" con "exposed" y "name" (nombre accesible computado).',
  '- Prioriza elementos con a11y.exposed=true. Si propones uno con exposed=false (por ejemplo aria-hidden o sin nodo accesible), baja la confianza.',
  '- Si el objetivo no aparece en el arbol de accesibilidad pero si en "elementosInteractivos" (por ejemplo un input nativo oculto tras un widget), ancla el locator en sus atributos.',
  '- Para strategy "role" usa "role" y "name"; para el resto usa "value".',
  '- "within" es opcional y debe ser un selector CSS del contenedor (por ejemplo form[action="/login"]).',
  '- No inventes elementos que no aparezcan en el snapshot; si no hay coincidencia usa el mas cercano y baja la confianza.',
  '- "confidence" es tu certeza entre 0 y 1.',
].join('\n')

/** Traduce los nombres de estrategia que puede devolver el modelo a las soportadas. */
const STRATEGY_ALIASES: Record<string, LocatorStrategy> = {
  testid: 'testid',
  'data-qa': 'testid',
  'data-testid': 'testid',
  'data-test': 'testid',
  'data-cy': 'testid',
  role: 'role',
  aria: 'role',
  'aria-role': 'role',
  label: 'label',
  placeholder: 'placeholder',
  text: 'text',
  'link-text': 'text',
  css: 'css',
  selector: 'css',
  xpath: 'css',
  alt: 'alt',
  'alt-text': 'alt',
  title: 'title',
}

/**
 * Solicita al LLM un locator para el spec dado.
 *
 * @param page - Página en el estado actual (fuente del snapshot).
 * @param spec - Locator a reparar; su `description` es el contexto semántico.
 * @param llm - Configuración del backend de chat.
 * @param feedback - Error de un intento anterior, para corregir la propuesta.
 * @param snapshotMode - Vista de contexto a enviar; por defecto `hybrid`.
 * @returns Propuesta validada con snapshot, resolución y consumo de tokens.
 * @throws Error si la API falla o la respuesta no contiene un JSON válido.
 * @example
 * ```ts
 * const proposal = await proposeLocator(page, spec, config.llm)
 * console.log(proposal.resolution.candidate, proposal.resolution.confidence)
 * ```
 */
export async function proposeLocator(
  page: Page,
  spec: LocatorSpec,
  llm: LlmConfig,
  feedback?: string,
  snapshotMode: SnapshotMode = 'hybrid',
): Promise<AiProposal> {
  const snapshot = await capturePageSnapshot(page, snapshotMode)
  const client = new OpenCodeGoClient(llm)
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(spec, snapshot, feedback) },
  ]
  const completion = await client.complete(messages, `${llm.sessionId}:${spec.key}`)
  const resolution = parseAiResolution(completion.content, completion.model)
  return { resolution, snapshot, usage: completion.usage }
}

function buildUserPrompt(spec: LocatorSpec, snapshot: PageSnapshot, feedback?: string): string {
  const elements = trimElements(snapshot.elements, 14_000)
  const payload = {
    url: snapshot.url,
    title: snapshot.title,
    headings: snapshot.headings,
    arbolAccesibilidad: snapshot.ariaTree,
    elementosInteractivos: elements,
  }
  const lines = [
    `Accion requerida: ${spec.action}`,
    `Descripcion del elemento: ${spec.description}`,
    `Clave interna del locator: ${spec.key}`,
    'Contexto de la pagina (JSON):',
    JSON.stringify(payload),
  ]
  if (feedback) {
    lines.push(`La propuesta anterior fallo: ${feedback}. Corrige el locator.`)
  }
  lines.push('Devuelve solo el JSON del locator reparado.')
  return lines.join('\n')
}

function trimElements(elements: PageSnapshot['elements'], maxChars: number): PageSnapshot['elements'] {
  const result: PageSnapshot['elements'] = []
  let size = 0
  for (const element of elements) {
    const serialized = JSON.stringify(element)
    if (size + serialized.length > maxChars) break
    result.push(element)
    size += serialized.length
  }
  return result
}

/**
 * Valida y normaliza la respuesta del modelo.
 *
 * Extrae el JSON aunque venga envuelto en markdown, traduce la estrategia,
 * exige valor o rol según corresponda y normaliza la confianza (acepta 0-1 o
 * porcentajes).
 *
 * @param raw - Contenido textual devuelto por el modelo.
 * @param model - Modelo que generó la respuesta, para trazabilidad.
 * @returns Resolución lista para probarse contra la página.
 * @throws Error si no hay JSON válido, la estrategia no está soportada o falta el valor.
 */
export function parseAiResolution(raw: string, model: string): AiResolution {
  const parsed = extractJson(raw)
  const record = parsed as Record<string, unknown>
  const candidate = toCandidate(record)
  const confidence = normalizeConfidence(record.confidence)
  const reasoning = typeof record.reasoning === 'string' ? record.reasoning : ''
  return { candidate, confidence, reasoning, model, raw }
}

function extractJson(text: string): unknown {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    const start = withoutFences.indexOf('{')
    const end = withoutFences.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFences.slice(start, end + 1))
      } catch {
        throw new Error('La respuesta de la IA no contiene un JSON valido')
      }
    }
    throw new Error('La respuesta de la IA no contiene un JSON valido')
  }
}

/**
 * Convierte el registro JSON del modelo en un {@link LocatorCandidate}.
 *
 * @param record - Objeto ya parseado de la respuesta.
 * @throws Error si la estrategia no está soportada, falta el rol o falta el valor.
 */
function toCandidate(record: Record<string, unknown>): LocatorCandidate {
  const rawStrategy = String(record.strategy ?? '').toLowerCase()
  const strategy = STRATEGY_ALIASES[rawStrategy]
  if (!strategy) {
    throw new Error(`La IA devolvio una estrategia no soportada: "${rawStrategy}"`)
  }

  const candidate: LocatorCandidate = { strategy }
  if (strategy === 'role') {
    const role = record.role ?? record.value
    if (!role) throw new Error('La IA devolvio strategy "role" sin rol')
    candidate.role = String(role)
    if (record.name !== undefined) candidate.name = String(record.name)
  } else {
    const rawValue = record.value ?? record.selector ?? record.locator
    if (rawValue === undefined || rawValue === '') {
      throw new Error('La IA devolvio un locator sin valor')
    }
    let value = String(rawValue)
    if (strategy === 'css' && (value.startsWith('//') || value.startsWith('/html'))) {
      value = `xpath=${value}`
    }
    candidate.value = value
  }

  if (record.exact !== undefined) candidate.exact = Boolean(record.exact)
  if (record.within !== undefined && record.within !== null && record.within !== '') {
    candidate.within = String(record.within)
  }
  return candidate
}

function normalizeConfidence(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return 0.5
  const normalized = parsed > 1 ? parsed / 100 : parsed
  return Math.min(1, Math.max(0, normalized))
}
