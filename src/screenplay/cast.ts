import type { Page } from '@playwright/test'
import type { Healer } from '../healing'
import { Actor } from './actor'
import { BrowseTheWeb } from './abilities/browse-the-web'

/**
 * Crea un actor con la habilidad web sobre la página y el healer dados.
 * Para flujos multi-actor, llamar una vez por rol.
 */
export function cast(page: Page, healer: Healer, name: string): Actor {
  return Actor.named(name).can(BrowseTheWeb.using(page, healer))
}
