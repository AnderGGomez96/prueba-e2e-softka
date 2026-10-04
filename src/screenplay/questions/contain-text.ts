import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'
import { expect } from '@playwright/test'

/** Devuelve el texto del elemento descrito por el `LocatorSpec`, vía healer. */
export class ContainText implements Question<void> {
    private constructor(
        private readonly spec: LocatorSpec,
        private readonly product: string,
        private readonly message: string,
    ) { }

    static of(spec: LocatorSpec, product: string, message: string): ContainText {
        return new ContainText(spec, product, message)
    }

    async answeredBy(actor: Actor): Promise<void> {
        const {healer} = actor.ability(BrowseTheWeb)
        await expect(await healer.resolve(this.spec), this.message).toContainText(this.product)
    }
}
