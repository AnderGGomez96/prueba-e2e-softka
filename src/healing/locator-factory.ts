/**
 * Fábrica de locators de Playwright a partir de {@link LocatorCandidate}.
 *
 * Traduce cada estrategia del modelo de datos a la API semántica de Playwright
 * y provee utilidades para describir candidatos en mensajes, eventos y prompts.
 */
import type { Locator, Page } from '@playwright/test'
import type { LocatorCandidate, LocatorSpec } from './types'

function requireValue(candidate: LocatorCandidate): string {
  if (!candidate.value) {
    throw new Error(`El candidato "${candidate.strategy}" no tiene valor definido`)
  }
  return candidate.value
}

/**
 * Convierte un candidato en un {@link Locator} de Playwright.
 *
 * @param page - Página sobre la que se resuelve.
 * @param candidate - Candidato a traducir.
 * @returns Locator sin `.first()`; el consumidor decide si acota la búsqueda.
 * @throws Error si la estrategia requiere un valor o rol ausente.
 * @example
 * ```ts
 * const locator = candidateToLocator(page, { strategy: 'testid', value: 'login-email' })
 * await locator.click()
 * ```
 */
export function candidateToLocator(page: Page, candidate: LocatorCandidate): Locator {
  const scope = candidate.within ? page.locator(candidate.within) : page
  const exact = candidate.exact ?? false

  switch (candidate.strategy) {
    case 'testid':
      return scope.getByTestId(requireValue(candidate))
    case 'role': {
      if (!candidate.role) {
        throw new Error('El candidato "role" no tiene rol definido')
      }
      return scope.getByRole(candidate.role as Parameters<Page['getByRole']>[0], {
        name: candidate.name,
        exact,
      })
    }
    case 'label':
      return scope.getByLabel(requireValue(candidate), { exact })
    case 'placeholder':
      return scope.getByPlaceholder(requireValue(candidate), { exact })
    case 'text':
      return scope.getByText(requireValue(candidate), { exact })
    case 'alt':
      return scope.getByAltText(requireValue(candidate), { exact })
    case 'title':
      return scope.getByTitle(requireValue(candidate), { exact })
    case 'css':
      return scope.locator(requireValue(candidate))
  }
}

/**
 * Índice del primer candidato `css` del spec (el ancla estable para las
 * aserciones de ausencia/presencia que no deben gastar la escalera).
 *
 * @param spec - Spec del que se busca el candidato `css`.
 * @returns Índice del primer candidato con `strategy: 'css'`.
 * @throws RangeError si el spec no declara ningún candidato `css`.
 */
export function cssCandidateIndex(spec: LocatorSpec): number {
  const index = spec.candidates.findIndex((candidate) => candidate.strategy === 'css')
  if (index === -1) {
    throw new RangeError(`El spec "${spec.key}" no tiene candidato css`)
  }
  return index
}

/**
 * Describe un candidato en una línea legible, con su scope si lo tiene.
 *
 * @param candidate - Candidato a describir.
 * @returns Representación equivalente a la API de Playwright.
 */
export function describeCandidate(candidate: LocatorCandidate): string {
  const scope = candidate.within ? ` dentro de "${candidate.within}"` : ''
  switch (candidate.strategy) {
    case 'role':
      return `getByRole("${candidate.role}", name="${candidate.name ?? ''}")${scope}`
    case 'css':
      return `locator("${candidate.value ?? ''}")${scope}`
    default:
      return `getBy${candidate.strategy[0].toUpperCase()}${candidate.strategy.slice(1)}("${candidate.value ?? ''}", exact=${candidate.exact ?? false})${scope}`
  }
}

function quote(value: string): string {
  return value.includes("'") ? JSON.stringify(value) : `'${value}'`
}

/**
 * Serializa un candidato como literal TypeScript multilínea.
 *
 * Se usa para reescribir el candidato curado en el archivo fuente
 * (ver {@link PatchWriter}).
 *
 * @param candidate - Candidato a formatear.
 * @returns Literal `{ strategy: '...', ... }` listo para insertar en el código.
 */
export function formatCandidate(candidate: LocatorCandidate): string {
  const parts: string[] = [`strategy: '${candidate.strategy}'`]
  if (candidate.role !== undefined) parts.push(`role: '${candidate.role}'`)
  if (candidate.name !== undefined) parts.push(`name: ${quote(candidate.name)}`)
  if (candidate.value !== undefined) parts.push(`value: ${quote(candidate.value)}`)
  if (candidate.exact !== undefined) parts.push(`exact: ${candidate.exact}`)
  if (candidate.within !== undefined) parts.push(`within: ${quote(candidate.within)}`)
  return `{ ${parts.join(', ')} }`
}
