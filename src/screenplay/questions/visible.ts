import { expect } from '@playwright/test'
import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/**
 * Verifica que el elemento del `LocatorSpec` esté visible.
 *
 * Resuelve por la escalera gobernada (camino feliz) y usa `expect` web-first
 * con mensaje de negocio. Equivale a `Element.toBe.visible` de la guía testla.
 */
export class Visible implements Question<boolean> {
  private constructor(
    private readonly spec: LocatorSpec,
    private readonly message: string,
  ) {}

  static of(spec: LocatorSpec, message: string): Visible {
    return new Visible(spec, message)
  }

  async answeredBy(actor: Actor): Promise<boolean> {
    const { healer } = actor.ability(BrowseTheWeb)
    await expect(await healer.resolve(this.spec), this.message).toBeVisible()
    return true
  }
}
