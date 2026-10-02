import { expect } from '@playwright/test'
import { cssCandidateIndex, type LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/**
 * Aserción web-first ejecutada por el actor.
 *
 * `isVisible` resuelve por la escalera gobernada (camino feliz). `isAbsent`
 * deriva el locator del `LocatorSpec` con el candidato CSS, sin recorrer la
 * escalera ni gastar curaciones (contrato H-01).
 */
export class Ensure implements Interaction {
  private constructor(
    private readonly spec: LocatorSpec,
    private readonly check: 'visible' | 'absent',
    private readonly message: string,
  ) {}

  static that(spec: LocatorSpec) {
    return {
      isVisible: (message: string): Ensure => new Ensure(spec, 'visible', message),
      isAbsent: (message: string): Ensure => new Ensure(spec, 'absent', message),
    }
  }

  async performAs(actor: Actor): Promise<void> {
    const { healer } = actor.ability(BrowseTheWeb)
    if (this.check === 'absent') {
      await expect(
        healer.locator(this.spec, cssCandidateIndex(this.spec)),
        this.message,
      ).toHaveCount(0)
      return
    }
    await expect(await healer.resolve(this.spec), this.message).toBeVisible()
  }
}
