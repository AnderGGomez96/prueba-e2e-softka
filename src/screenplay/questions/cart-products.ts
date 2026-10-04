import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { expect } from '@playwright/test'
import { MemoryFlow, memoryGet } from '../memory'
import { TextsWithin } from './texts-within'

export class CartProducts implements Question<void> {
    private constructor(
        private readonly spec: LocatorSpec,
        private readonly clave: keyof MemoryFlow,
        private readonly message: string,
    ) { }

    static sameAs(spec: LocatorSpec, clave: keyof MemoryFlow, message: string): CartProducts {
        return new CartProducts(spec, clave, message)
    }

    async answeredBy(actor: Actor): Promise<void> {
        const productsResolve = [...(await actor.asks(TextsWithin.each(this.spec)))].sort()
        const productExpect = [...memoryGet(actor, this.clave)].map(a => a.nombre).sort();
        expect(productsResolve, this.message).toEqual(productExpect)
    }
}
