import { expect, type Page } from '@playwright/test'
import type { Healer } from '../healing'
import { cssCandidateIndex } from '../healing/locator-factory'
import { exampleLocators } from '../locators/example.locators'

/**
 * POM de ejemplo: demuestra el contrato Healer + LocatorSpec.
 * Camino feliz por la escalera; ausencias por proyección pura (H-01).
 */
export class ExamplePage {

  constructor(
    private readonly page: Page,
    private readonly healer: Healer,
  ) { }

  async goto() {
    await this.page.goto('/')
  }

  async headingText(): Promise<string> {
    return this.healer.text(exampleLocators.pageHeading)
  }

  async expectHeadingVisible(): Promise<void> {
    const heading = await this.healer.resolve(exampleLocators.pageHeading)
    await expect(heading, 'El encabezado principal debe estar visible').toBeVisible()
  }

  async expectNoErrorBanner(): Promise<void> {
    const spec = exampleLocators.errorBanner
    await expect(
      this.healer.locator(spec, cssCandidateIndex(spec)),
      'No debe aparecer ningún banner de error',
    ).toHaveCount(0)
  }
}
