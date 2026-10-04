import { test as base, expect } from '@playwright/test'
import { Healer } from '../healing/healer'
import { loadHealingConfig, type HealingConfig } from '../healing/config'
import type { Actor } from '../screenplay/actor'
import { cast } from '../screenplay/cast'
import { createActorSession } from '../screenplay/session'

type HealingFixtures = {
  healingConfig: HealingConfig
  healer: Healer
}

type ThrottleFixtures = {
  testDelay: void
}

type ScreenplayFixtures = {
  actor: Actor
}

type RoleFixtures = {
  invitado: Actor
  cliente: Actor
}

const testDelayMs = Number(process.env.E2E_TEST_DELAY_MS ?? 0)
const actorName = process.env.E2E_ACTOR_NAME ?? 'invitado'

export const test = base.extend<
  HealingFixtures & ThrottleFixtures & ScreenplayFixtures & RoleFixtures
>({

  healingConfig: [
    async ({}, use) => { await use(loadHealingConfig()) },
    { option: true },
  ],

  healer: async ({ page, healingConfig }, use, testInfo) => {
    const healer = new Healer(page, { testInfo, config: healingConfig })
    await use(healer)
    await healer.flush()
  },

  testDelay: [async ({}, use) => {
    await use()
    if (Number.isFinite(testDelayMs) && testDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, testDelayMs))
    }
  }, { auto: true }],

  actor: async ({ page, healer }, use, testInfo) => {
    const actor = cast(page, healer, actorName)
    testInfo.annotations.push({ type: 'actor', description: actor.name })
    await use(actor)
  },

  cliente: async ({ browser, healingConfig }, use, testInfo) => {
    const session = await createActorSession({
      browser,
      healingConfig,
      testInfo,
      name: 'Cliente',
    })
    await use(session.actor)
    await session.close()
  },

  invitado: async ({ browser, healingConfig }, use, testInfo) => {
    const session = await createActorSession({
      browser,
      healingConfig,
      testInfo,
      name: 'Invitado',
    })
    await use(session.actor)
    await session.close()
  },
})

export { expect } from '@playwright/test'
