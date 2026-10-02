/**
 * Motor de resolución `systemone`: Jev elige entre los elementos de la página.
 *
 * Captura el snapshot, enumera los elementos interactivos como opciones
 * (`e0`, `e1`, ...) más la opción `none_of_the_above`, y convierte la elección
 * del modelo en un {@link LocatorCandidate} determinista. La confianza y las
 * probabilidades provienen del propio motor, no de un texto generado.
 */
import type { Page } from '@playwright/test'
import type { SystemOneConfig } from './config'
import type { AiProposal, LocatorCandidate, LocatorSpec } from './types'
import { capturePageSnapshot, type PageSnapshot, type SnapshotElement, type SnapshotMode } from './snapshot'
import {
  SystemOneClient,
  usageOf,
  type SystemOneChoiceAnswer,
  type SystemOneQuestion,
  type SystemOneResponse,
} from './systemone-client'

/** Opción comodín: el modelo la elige cuando ningún elemento coincide. */
export const NONE_OF_THE_ABOVE = 'none_of_the_above'

/** Descripción visible de la opción comodín dentro del `criteria`. */
export const NONE_OF_THE_ABOVE_DESCRIPTION =
  'No element in the list matches the described action'

/** Máximo de elementos ofrecidos como opciones en una llamada. */
const MAX_ELEMENTS = 60

/** Presupuesto de caracteres del JSON de contexto dentro del `state`. */
const MAX_STATE_CHARS = 16_000

/** Presupuesto de caracteres del árbol de accesibilidad dentro del `state`. */
const MAX_ARIA_STATE_CHARS = 8_000

/** Traza completa de una resolución, útil para depuración didáctica. */
export interface SystemOneTraceEntry {
  /** Texto enviado como `state`. */
  state: string
  /** Preguntas enviadas. */
  questions: Record<string, SystemOneQuestion>
  /** Respuesta cruda del servicio. */
  response: SystemOneResponse
  /** Snapshot de la página usado como contexto. */
  snapshot: PageSnapshot
  /** Elemento elegido por el modelo. */
  chosenElement: SnapshotElement
  /** Candidato derivado del elemento elegido. */
  candidate: LocatorCandidate
}

/**
 * Resuelve un locator con System One.
 *
 * @param page - Página en el estado actual (fuente del snapshot).
 * @param spec - Locator a reparar.
 * @param config - Configuración del backend System One.
 * @param feedback - Error de un intento anterior; se agrega al `state`.
 * @param trace - Callback opcional que recibe la traza completa de la llamada.
 * @param snapshotMode - Vista de contexto a enviar; por defecto `hybrid`.
 * @returns Propuesta con candidato, confianza calibrada y probabilidades.
 * @throws Error si no hay elementos, el modelo no responde o elige `none_of_the_above`.
 * @example
 * ```ts
 * const proposal = await proposeLocatorWithSystemOne(page, spec, config.systemone)
 * console.log(proposal.resolution.confidence, proposal.resolution.probabilities)
 * ```
 */
export async function proposeLocatorWithSystemOne(
  page: Page,
  spec: LocatorSpec,
  config: SystemOneConfig,
  feedback?: string,
  trace?: (entry: SystemOneTraceEntry) => void,
  snapshotMode: SnapshotMode = 'hybrid',
): Promise<AiProposal> {
  const snapshot = await capturePageSnapshot(page, snapshotMode)
  const elements = snapshot.elements.slice(0, MAX_ELEMENTS)
  if (elements.length === 0) {
    throw new Error('El snapshot no contiene elementos interactivos que ofrecer como candidatos')
  }

  const criteria: Record<string, string> = buildChoiceCriteria(elements)
  criteria[NONE_OF_THE_ABOVE] = NONE_OF_THE_ABOVE_DESCRIPTION

  const questions: Record<string, SystemOneQuestion> = {
    target: {
      type: 'choice',
      instructions:
        'Which element on the page exactly matches the described action? Choose none_of_the_above if no candidate matches.',
      criteria,
    },
  }

  const state = buildState(spec, snapshot, elements, feedback)
  const client = new SystemOneClient(config)
  const response = await client.complete(state, questions)

  const answer = response.answers.target
  if (!answer || answer.type !== 'choice') {
    throw new Error('System One no devolvio la respuesta "target"')
  }

  if (answer.choice === NONE_OF_THE_ABOVE) {
    throw new Error(
      `System One no encontro ningun candidato valido (confianza ${answer.confidence.toFixed(2)}, p=${answer.probabilities[NONE_OF_THE_ABOVE]?.toFixed(2)})`,
    )
  }

  const element = elements.find((item) => optionKey(item) === answer.choice)
  if (!element) {
    throw new Error(`System One devolvio un candidato desconocido: ${answer.choice}`)
  }

  const candidate = locatorForElement(element)
  trace?.({ state, questions, response, snapshot, chosenElement: element, candidate })

  return {
    resolution: {
      candidate,
      confidence: answer.confidence,
      reasoning: buildReasoning(answer, element),
      model: response.model,
      raw: JSON.stringify(answer),
      probabilities: answer.probabilities,
    },
    snapshot,
    probabilities: answer.probabilities,
    usage: usageOf(response),
  }
}

/**
 * Genera la clave con la que un elemento se ofrece como opción.
 *
 * @param element - Elemento capturado.
 * @returns Clave `e<indice>` usada en `criteria` y en la respuesta.
 */
export function optionKey(element: SnapshotElement): string {
  return `e${element.index}`
}

/**
 * Construye el mapa de opciones que recibe el modelo.
 *
 * @param elements - Elementos ofrecidos como opciones.
 * @returns Mapa `e<indice>` -> descripción legible de cada elemento.
 */
export function buildChoiceCriteria(elements: SnapshotElement[]): Record<string, string> {
  const criteria: Record<string, string> = {}
  for (const element of elements) {
    criteria[optionKey(element)] = describeElement(element)
  }
  return criteria
}

const IDENTIFIER_ATTRIBUTES = [
  'data-testid',
  'data-test',
  'data-cy',
  'data-automation-id',
  'data-qa',
  'id',
  'type',
  'placeholder',
  'href',
  'alt',
  'title',
  'for',
]

const STATE_ATTRIBUTES = [
  'disabled',
  'required',
  'readonly',
  'checked',
  'selected',
  'multiple',
  'aria-expanded',
  'aria-haspopup',
  'aria-controls',
  'aria-checked',
  'aria-selected',
  'aria-current',
  'aria-disabled',
  'aria-pressed',
]

/**
 * Describe un elemento en una línea compacta para el `criteria`.
 *
 * Incluye rol, nombre, atributos identificadores, estados y, en modo híbrido,
 * el nombre accesible y si está expuesto en el árbol de accesibilidad.
 *
 * @param element - Elemento a describir.
 * @returns Descripción truncada a 240 caracteres.
 */
export function describeElement(element: SnapshotElement): string {
  const attrs = element.attributes
  const parts = [`${element.tag} role=${element.role}`]
  if (element.name) parts.push(`name="${element.name}"`)
  if (element.a11y?.name && element.a11y.name !== element.name) {
    parts.push(`a11y-name="${element.a11y.name.replace(/"/g, "'")}"`)
  }
  if (element.a11y?.exposed !== undefined) {
    parts.push(`a11y=${element.a11y.exposed ? 'exposed' : 'hidden'}`)
  }
  for (const key of IDENTIFIER_ATTRIBUTES) {
    if (attrs[key] !== undefined) parts.push(`${key}="${attrs[key]}"`)
  }
  if (attrs.name !== undefined) parts.push(`name-attr="${attrs.name}"`)
  for (const key of STATE_ATTRIBUTES) {
    if (attrs[key] !== undefined) parts.push(`${key}=${attrs[key]}`)
  }
  const shown = new Set<string>([
    ...IDENTIFIER_ATTRIBUTES,
    ...STATE_ATTRIBUTES,
    'name',
    'role',
    'aria-label',
  ])
  const extras = Object.keys(attrs).filter((key) => !shown.has(key))
  if (extras.length > 0) {
    parts.push(extras.map((key) => `${key}="${attrs[key]}"`).join(' '))
  }
  if (element.formAction) parts.push(`form="${element.formAction}"`)
  if (element.text) parts.push(`text="${element.text}"`)
  return parts.join(' ').slice(0, 240)
}

const TEST_ID_ATTRIBUTES = ['data-testid', 'data-test', 'data-cy', 'data-automation-id']

function cssAttribute(attribute: string, value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `[${attribute}="${escaped}"]`
}

/**
 * Deriva un locator determinista a partir del elemento elegido.
 *
 * Prioridad de anclas: `data-qa` (estrategia testid) → otros atributos de
 * test-id → `id` → `aria-label` → `name` → placeholder → texto → rol+nombre.
 * Si el elemento pertenece a un formulario, lo acota con `within`.
 *
 * @param element - Elemento elegido por el modelo.
 * @returns Candidato listo para probarse con Playwright.
 */
export function locatorForElement(element: SnapshotElement): LocatorCandidate {
  const attrs = element.attributes
  const within = element.formAction ? `form[action="${element.formAction}"]` : undefined
  const scope = within ? { within } : {}

  if (attrs['data-qa']) return { strategy: 'testid', value: attrs['data-qa'], ...scope }
  for (const attribute of TEST_ID_ATTRIBUTES) {
    if (attrs[attribute]) {
      return { strategy: 'css', value: cssAttribute(attribute, attrs[attribute]), ...scope }
    }
  }
  if (attrs.id) return { strategy: 'css', value: cssAttribute('id', attrs.id), ...scope }
  if (attrs['aria-label']) {
    return { strategy: 'css', value: cssAttribute('aria-label', attrs['aria-label']), ...scope }
  }
  if (attrs.name) {
    return { strategy: 'css', value: `${element.tag}${cssAttribute('name', attrs.name)}`, ...scope }
  }
  if (attrs.placeholder) return { strategy: 'placeholder', value: attrs.placeholder, ...scope }
  if (element.text) return { strategy: 'text', value: element.text, ...scope }
  if (element.role && element.name) {
    return { strategy: 'role', role: element.role, name: element.name, ...scope }
  }
  return { strategy: 'css', value: element.tag, ...scope }
}

/**
 * Construye el `state` textual que acompaña a las preguntas.
 *
 * Incluye acción, descripción y clave del spec, el contexto JSON de la página
 * (URL, título, encabezados y candidatos) y, en modo híbrido, el árbol de
 * accesibilidad.
 *
 * @param spec - Locator objetivo.
 * @param snapshot - Snapshot capturado.
 * @param elements - Elementos enumerados como candidatos.
 * @param feedback - Error del intento anterior, si lo hay.
 * @returns Texto enviado como `state` en el POST.
 */
export function buildState(
  spec: LocatorSpec,
  snapshot: PageSnapshot,
  elements: SnapshotElement[],
  feedback?: string,
): string {
  const context = {
    url: snapshot.url,
    title: snapshot.title,
    headings: snapshot.headings,
    candidates: elements.map((element) => ({
      id: optionKey(element),
      description: describeElement(element),
    })),
  }

  const lines = [
    `Action: ${spec.action}`,
    `Element description: ${spec.description}`,
    `Locator key: ${spec.key}`,
    'Page context (JSON):',
    JSON.stringify(context).slice(0, MAX_STATE_CHARS),
  ]
  if (snapshot.ariaTree) {
    lines.push('Accessibility tree (YAML):', snapshot.ariaTree.slice(0, MAX_ARIA_STATE_CHARS))
  }
  if (feedback) {
    lines.push(`The previous proposal failed: ${feedback}. Choose a different candidate.`)
  }
  return lines.join('\n')
}

function buildReasoning(answer: SystemOneChoiceAnswer, element: SnapshotElement): string {
  const top = Object.entries(answer.probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, probability]) => `${key}=${probability.toFixed(2)}`)
    .join(', ')
  return `System One eligio ${optionKey(element)} (${describeElement(element)}); distribucion top: ${top}`
}
