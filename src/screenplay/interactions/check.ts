import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/**
 * Marca el radio/checkbox descrito por el `LocatorSpec`, vía healer.
 *
 * `check()` es idempotente y verifica el estado final; un `Click` en un
 * checkbox ya marcado lo destildaría.
 */
export class Check implements Interaction {
  private constructor(private readonly spec: LocatorSpec) {}

  static on(spec: LocatorSpec): Check {
    return new Check(spec)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.ability(BrowseTheWeb).healer.check(this.spec)
  }
}
