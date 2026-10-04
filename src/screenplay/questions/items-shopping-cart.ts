import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'
import { expect } from '@playwright/test'
import { memoryGet } from '../memory'

export class ItemsOnShoppingCart implements Question<void> {
    private constructor(
        private readonly spec: LocatorSpec,
        private readonly message: string,
    ) { }

    static read(spec: LocatorSpec, message: string): ItemsOnShoppingCart {
        return new ItemsOnShoppingCart(spec, message)
    }

    async answeredBy(actor: Actor): Promise<void> {
        const {healer} = actor.ability(BrowseTheWeb)
        const productos = memoryGet( actor,'productosElegidos')
        await (
            expect(
                await healer.resolve(this.spec), this.message
            ).toContainText(String(productos.length))
        )
    }
}
