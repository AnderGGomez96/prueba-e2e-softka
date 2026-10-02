import { test as base, expect } from '@playwright/test'
import { Healer } from '../healing/healer'
import { loadHealingConfig, type HealingConfig } from '../healing/config'
import { ExamplePage } from '../pages/example.page'
import type { Actor } from '../screenplay/actor'
import { cast } from '../screenplay/cast'

type HealingFixtures = {
  healingConfig: HealingConfig
  healer: Healer
}

type ThrottleFixtures = {
  testDelay: void
}

type ExampleFixtures = {
  examplePage: ExamplePage
}

type ScreenplayFixtures = {
  actor: Actor
}

const testDelayMs = Number(process.env.E2E_TEST_DELAY_MS ?? 0)

export const test = base.extend<HealingFixtures & ThrottleFixtures & ExampleFixtures & ScreenplayFixtures>({

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

  examplePage: async ({ page, healer }, use) => {
    const examplePage = new ExamplePage(page, healer)
    await examplePage.goto()
    await use(examplePage)
  },

  actor: async ({ page, healer }, use) => {
    await use(cast(page, healer, 'Cliente'))
  },
})

export { expect } from '@playwright/test'
