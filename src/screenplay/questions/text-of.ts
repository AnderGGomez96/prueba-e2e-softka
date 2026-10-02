import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Devuelve el texto del elemento descrito por el `LocatorSpec`, vía healer. */
export class TextOf implements Question<string> {
  private constructor(private readonly spec: LocatorSpec) {}

  static locator(spec: LocatorSpec): TextOf {
    return new TextOf(spec)
  }

  async answeredBy(actor: Actor): Promise<string> {
    return actor.ability(BrowseTheWeb).healer.text(this.spec)
  }
}
