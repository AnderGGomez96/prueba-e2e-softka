import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Escribe un valor en el campo descrito por el `LocatorSpec`, vía healer. */
export class Fill implements Interaction {
  private constructor(
    private readonly spec: LocatorSpec,
    private readonly value: string,
  ) {}

  static in(spec: LocatorSpec, value: string): Fill {
    return new Fill(spec, value)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.ability(BrowseTheWeb).healer.fill(this.spec, this.value)
  }
}
