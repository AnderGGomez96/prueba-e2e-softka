import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test'
import type { HealingConfig } from '../healing/config'
import { Healer } from '../healing/healer'
import { Actor } from './actor'
import { BrowseTheWeb } from './abilities/browse-the-web'

/**
 * Sesión aislada de un actor: contexto, página y healer propios, con su ciclo
 * de vida. Cada actor tiene su propia escalera, caché, eventos y reporte.
 */
export interface ActorSession {
  readonly actor: Actor
  readonly context: BrowserContext
  readonly page: Page
  readonly healer: Healer
  close(): Promise<void>
}

/**
 * Crea una sesión aislada para un rol: contexto nuevo (sesión de navegador
 * independiente), página nueva y su propio `Healer`. `close` vuelca el
 * reporte de healing y cierra el contexto.
 */
export async function createActorSession(options: {
  browser: Browser
  healingConfig: HealingConfig
  testInfo: TestInfo
  name: string
  storageState?: string
}): Promise<ActorSession> {
  const context = await options.browser.newContext({
    storageState: options.storageState,
  })
  const page = await context.newPage()
  const healer = new Healer(page, {
    testInfo: options.testInfo,
    config: options.healingConfig,
  })
  const actor = Actor.named(options.name).can(BrowseTheWeb.using(page, healer))
  options.testInfo.annotations.push({ type: 'actor', description: options.name })

  let closed = false
  return {
    actor,
    context,
    page,
    healer,
    async close(): Promise<void> {
      if (closed) return
      closed = true
      await healer.flush()
      await context.close()
    },
  }
}
