/**
 * Captura del contexto de página que se envía a los motores de resolución.
 *
 * Ofrece dos vistas combinables:
 * - DOM: elementos interactivos visibles con sus atributos, texto, formulario
 *   contenedor y un nombre accesible aproximado.
 * - A11y: árbol de accesibilidad completo vía `locator.ariaSnapshot()`.
 *
 * En modo `hybrid` cada elemento DOM se enriquece con su nodo de accesibilidad
 * (`a11y.exposed` y `a11y.name`) y con un `ref` (`e0`, `e1`, ...) que actúa como
 * clave común entre ambas vistas.
 */
import type { Page } from '@playwright/test'

/** Vista del contexto que se captura para el motor de resolución. */
export type SnapshotMode = 'dom' | 'hybrid'

/** Nodo simplificado del árbol de accesibilidad. */
export interface A11yNode {
  /** Rol de accesibilidad (button, textbox, link, ...). */
  role: string
  /** Nombre accesible computado por el navegador, si existe. */
  name?: string
}

/** Información de accesibilidad asociada a un elemento DOM. */
export interface SnapshotElementA11y {
  /** Indica si el elemento existe en el árbol de accesibilidad. */
  exposed: boolean
  /** Nombre accesible computado; proviene del árbol cuando hay match. */
  name?: string
}

/** Elemento interactivo capturado, listo para el prompt o el `criteria`. */
export interface SnapshotElement {
  /** Posición en el orden de aparición del DOM. */
  index: number
  /** Clave común con el árbol de accesibilidad (`e0`, `e1`, ...). */
  ref: string
  /** Etiqueta HTML en minúsculas. */
  tag: string
  /** Rol inferido o explícito del elemento. */
  role: string
  /** Nombre del elemento: accesible en modo híbrido, heurístico en modo dom. */
  name?: string
  /** Texto visible recortado. */
  text?: string
  /** Atributo `action` del formulario contenedor, si lo tiene. */
  formAction?: string
  /** Atributos relevantes, sin clases ni estilos. */
  attributes: Record<string, string>
  /** Datos de accesibilidad; solo presentes en modo `hybrid`. */
  a11y?: SnapshotElementA11y
}

/** Contexto de página enviado al motor de resolución. */
export interface PageSnapshot {
  /** URL de la página en el momento de la captura. */
  url: string
  /** Título del documento. */
  title: string
  /** Encabezados visibles `h1`-`h3`, como pistas de contexto. */
  headings: string[]
  /** Marca temporal ISO-8601 de la captura. */
  capturedAt: string
  /** Árbol de accesibilidad en YAML; solo en modo `hybrid`. */
  ariaTree?: string
  /** Elementos interactivos capturados. */
  elements: SnapshotElement[]
}

/** Forma mínima que necesita {@link matchA11yNodes} para emparejar. */
export interface MatchableElement {
  /** Rol inferido del elemento DOM. */
  role: string
  /** Nombre accesible aproximado calculado en el DOM. */
  accessibleName?: string
}

/** Elemento crudo devuelto por el `page.evaluate` interno. */
export interface RawSnapshotElement {
  index: number
  tag: string
  role: string
  name?: string
  accessibleName?: string
  text?: string
  formAction?: string
  attributes: Record<string, string>
}

/** Resultado crudo del `page.evaluate` interno. */
export interface RawPageSnapshot {
  url: string
  title: string
  headings: string[]
  elements: RawSnapshotElement[]
}

/** Presupuesto de caracteres para el YAML del árbol de accesibilidad. */
const MAX_ARIA_CHARS = 12_000

async function captureRawSnapshot(page: Page, limit: number): Promise<RawPageSnapshot> {
  return page.evaluate((maxElements) => {
    const implicitRole = (element: Element): string => {
      const tag = element.tagName.toLowerCase()
      if (tag === 'a') return 'link'
      if (tag === 'button') return 'button'
      if (tag === 'select') return 'combobox'
      if (tag === 'textarea') return 'textbox'
      if (tag === 'label') return 'label'
      if (tag !== 'input') return 'generic'
      const type = (element.getAttribute('type') ?? 'text').toLowerCase()
      if (['submit', 'button', 'reset', 'image'].includes(type)) return 'button'
      if (['checkbox'].includes(type)) return 'checkbox'
      if (['radio'].includes(type)) return 'radio'
      if (['range'].includes(type)) return 'slider'
      if (['number'].includes(type)) return 'spinbutton'
      if (['search'].includes(type)) return 'searchbox'
      if (['password'].includes(type)) return 'textbox'
      return 'textbox'
    }

    const isVisible = (element: Element): boolean => element.getClientRects().length > 0
    const clean = (value: string | null, max = 120): string | undefined => {
      if (!value) return undefined
      const normalized = value.replace(/\s+/g, ' ').trim()
      return normalized ? normalized.slice(0, max) : undefined
    }

    const accessibleName = (element: Element): string | undefined => {
      const labelledBy = element.getAttribute('aria-labelledby')
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
        const value = clean(text, 120)
        if (value) return value
      }

      const ariaLabel = clean(element.getAttribute('aria-label'), 120)
      if (ariaLabel) return ariaLabel

      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        const labels = element.labels
          ? Array.from(element.labels)
              .map((label) => label.textContent ?? '')
              .join(' ')
          : ''
        const labelText = clean(labels, 120)
        if (labelText) return labelText
        if (
          element instanceof HTMLInputElement &&
          ['submit', 'button', 'reset'].includes(element.type)
        ) {
          const inputValue = clean(element.value, 120)
          if (inputValue) return inputValue
        }
      }

      const placeholder = clean(element.getAttribute('placeholder'), 120)
      if (placeholder) return placeholder
      const alt = clean(element.getAttribute('alt'), 120)
      if (alt) return alt
      const title = clean(element.getAttribute('title'), 120)
      if (title) return title
      return clean(element.textContent, 120)
    }

    const interactive = Array.from(
      document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role], [data-qa], label',
      ),
    ).filter(isVisible)

    const excludedAttributes = new Set(['class', 'style', 'srcdoc'])
    const excludedPrefixes = ['data-v-', 'data-react', 'data-sentry', 'data-next', 'on']
    const booleanAttributes = new Set([
      'disabled',
      'required',
      'readonly',
      'checked',
      'selected',
      'multiple',
    ])

    const elements = interactive.slice(0, maxElements).map((element, index) => {
      const attributes: Record<string, string> = {}
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name
        if (excludedAttributes.has(name)) continue
        if (excludedPrefixes.some((prefix) => name.startsWith(prefix))) continue
        if (booleanAttributes.has(name)) {
          attributes[name] = 'true'
          continue
        }
        if (attribute.value === '') continue
        attributes[name] = attribute.value.slice(0, 120)
      }

      const text = clean(element.textContent, 100)
      const name =
        clean(element.getAttribute('aria-label'), 120) ??
        clean(element.getAttribute('placeholder'), 120) ??
        clean(element.getAttribute('alt'), 120) ??
        clean(element.getAttribute('title'), 120) ??
        (element instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(element.type)
          ? clean(element.value, 120)
          : undefined) ??
        clean(text ?? null, 120)

      const form = element.closest('form')
      const formAction = form?.getAttribute('action') ?? undefined

      return {
        index,
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role') ?? implicitRole(element),
        name,
        accessibleName: accessibleName(element),
        text,
        formAction: formAction ?? undefined,
        attributes,
      }
    })

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter(isVisible)
      .map((heading) => (heading.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 12)

    return {
      url: location.href,
      title: document.title,
      headings,
      elements,
    }
  }, limit)
}

function toPublicElement(element: RawSnapshotElement): SnapshotElement {
  const { accessibleName, ...rest } = element
  void accessibleName
  return { ...rest, ref: `e${element.index}` }
}

function toDomSnapshot(raw: RawPageSnapshot): PageSnapshot {
  return {
    url: raw.url,
    title: raw.title,
    headings: raw.headings,
    capturedAt: new Date().toISOString(),
    elements: raw.elements.map(toPublicElement),
  }
}

/**
 * Captura el contexto de página según el modo configurado.
 *
 * En modo `hybrid` agrega el árbol de accesibilidad y enriquece cada elemento
 * con `a11y` y con el nombre accesible computado. Si el árbol no está
 * disponible (Playwright sin `ariaSnapshot` o error de captura), degrada a
 * modo `dom` sin fallar.
 *
 * @param page - Página a capturar.
 * @param mode - Vista a capturar; por defecto `hybrid`.
 * @param limit - Máximo de elementos interactivos a incluir.
 * @returns Snapshot listo para el prompt del motor.
 * @example
 * ```ts
 * const snapshot = await capturePageSnapshot(page, 'hybrid')
 * const email = snapshot.elements.find((el) => el.attributes['data-qa'] === 'login-email')
 * console.log(email?.a11y?.exposed, email?.ref)
 * ```
 */
export async function capturePageSnapshot(
  page: Page,
  mode: SnapshotMode = 'hybrid',
  limit = 80,
): Promise<PageSnapshot> {
  const raw = await captureRawSnapshot(page, limit)
  if (mode === 'dom') return toDomSnapshot(raw)

  const ariaTree = await captureAriaTree(page)
  if (!ariaTree) return toDomSnapshot(raw)

  const nodes = parseAriaTree(ariaTree)
  const matched = matchA11yNodes(
    raw.elements.map((element) => ({ role: element.role, accessibleName: element.accessibleName })),
    nodes,
  )

  const elements = raw.elements.map((element, index) => {
    const node = matched[index]
    return {
      ...toPublicElement(element),
      name: element.accessibleName ?? element.name,
      a11y: node
        ? { exposed: true, name: node.name }
        : { exposed: false, name: element.accessibleName },
    }
  })

  return {
    url: raw.url,
    title: raw.title,
    headings: raw.headings,
    capturedAt: new Date().toISOString(),
    ariaTree,
    elements,
  }
}

/**
 * Captura el árbol de accesibilidad de la página en formato YAML.
 *
 * @param page - Página a capturar.
 * @returns YAML truncado a {@link MAX_ARIA_CHARS}, o `undefined` si la versión
 * de Playwright no soporta `ariaSnapshot` o la captura falla.
 */
export async function captureAriaTree(page: Page): Promise<string | undefined> {
  try {
    const body = page.locator('body') as unknown as {
      ariaSnapshot?: (options?: { timeout?: number }) => Promise<string>
    }
    if (typeof body.ariaSnapshot !== 'function') return undefined
    const yaml = (await body.ariaSnapshot({ timeout: 2_000 })).trim()
    return yaml ? truncateYaml(yaml, MAX_ARIA_CHARS) : undefined
  } catch {
    return undefined
  }
}

function truncateYaml(yaml: string, maxChars: number): string {
  if (yaml.length <= maxChars) return yaml
  const kept: string[] = []
  let size = 0
  for (const line of yaml.split('\n')) {
    if (size + line.length + 1 > maxChars) break
    kept.push(line)
    size += line.length + 1
  }
  return kept.join('\n')
}

/**
 * Extrae rol y nombre de cada nodo del YAML de `ariaSnapshot()`.
 *
 * Ignora propiedades (`/url:`, `/placeholder:`) y nodos de texto.
 *
 * @param yaml - Salida de `locator.ariaSnapshot()`.
 * @returns Nodos en orden de aparición, con el nombre desescapado.
 * @example
 * ```ts
 * parseAriaTree('- form:\n  - textbox "Email"\n  - button "Login"')
 * // [{ role: 'form' }, { role: 'textbox', name: 'Email' }, { role: 'button', name: 'Login' }]
 * ```
 */
export function parseAriaTree(yaml: string): A11yNode[] {
  const nodes: A11yNode[] = []
  for (const line of yaml.split(/\r?\n/)) {
    const item = line.match(/^\s*-\s+(.+)$/)
    if (!item) continue
    const content = item[1]
    if (content.startsWith('/') || content.startsWith('text:')) continue
    const node = content.match(/^([a-z][a-z-]*)(?:\s+"((?:[^"\\]|\\.)*)")?/)
    if (!node) continue
    nodes.push({
      role: node[1],
      name: node[2] !== undefined ? unescapeName(node[2]) : undefined,
    })
  }
  return nodes
}

function unescapeName(value: string): string {
  return value.replace(/\\(.)/g, '$1')
}

/**
 * Empareja elementos DOM con nodos de accesibilidad.
 *
 * Estrategia en dos pasadas sobre elementos en orden de aparición:
 * 1. Coincidencia por rol y nombre normalizado.
 * 2. Coincidencia solo por rol, para tolerar diferencias de nombre.
 *
 * Cada nodo se consume una sola vez.
 *
 * @template T - Forma mínima del elemento, compatible con {@link MatchableElement}.
 * @param elements - Elementos DOM a emparejar.
 * @param nodes - Nodos del árbol de accesibilidad.
 * @returns Array alineado con `elements`; `undefined` cuando no hubo match
 * (elemento no expuesto en el árbol).
 */
export function matchA11yNodes(
  elements: MatchableElement[],
  nodes: A11yNode[],
): Array<A11yNode | undefined> {
  const available = nodes.map((node) => ({ node, used: false }))
  const matched: Array<A11yNode | undefined> = new Array(elements.length).fill(undefined)

  for (let index = 0; index < elements.length; index++) {
    const element = elements[index]
    const candidate = available.find(
      (entry) =>
        !entry.used &&
        entry.node.role === element.role &&
        normalizeName(entry.node.name) === normalizeName(element.accessibleName),
    )
    if (candidate) {
      candidate.used = true
      matched[index] = candidate.node
    }
  }

  for (let index = 0; index < elements.length; index++) {
    if (matched[index]) continue
    const element = elements[index]
    const candidate = available.find((entry) => !entry.used && entry.node.role === element.role)
    if (candidate) {
      candidate.used = true
      matched[index] = candidate.node
    }
  }

  return matched
}

function normalizeName(value?: string): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}
