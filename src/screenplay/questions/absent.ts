import { expect } from '@playwright/test'
import { cssCandidateIndex, type LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/**
 * Verifica que el elemento del `LocatorSpec` no esté en el DOM (contrato H-01).
 *
 * Deriva el locator del candidato CSS con `healer.locator`: no recorre la
 * escalera, no consulta caché/IA y no gasta curaciones. Equivale a
 * `Element.notToBe.visible` de la guía testla.
 */
export class Absent implements Question<boolean> {
  private constructor(
    private readonly spec: LocatorSpec,
    private readonly message: string,
  ) {}

  static of(spec: LocatorSpec, message: string): Absent {
    return new Absent(spec, message)
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    const { healer } = actor.ability(BrowseTheWeb)
    await expect(
      healer.locator(this.spec, cssCandidateIndex(this.spec)),
      this.message,
    ).toHaveCount(0)
    return true
  }
}
