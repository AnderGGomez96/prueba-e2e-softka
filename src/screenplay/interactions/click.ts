import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Hace clic en el elemento descrito por el `LocatorSpec`, vía healer. */
export class Click implements Interaction {
  private constructor(private readonly spec: LocatorSpec) {}

  static on(spec: LocatorSpec): Click {
    return new Click(spec)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.ability(BrowseTheWeb).healer.click(this.spec)
  }
}
