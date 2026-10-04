import type { LocatorSpec } from '../../healing'
import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'
import { expect } from '@playwright/test'


export class Checked implements Question<void> {
    private constructor(
        private readonly spec: LocatorSpec,
        private readonly message: string,
    ) { }

    static of(spec: LocatorSpec, message:string): Checked {
        return new Checked(spec, message)
    }

    async answeredBy(actor: Actor): Promise<void> {
        const {healer} = actor.ability(BrowseTheWeb);
        await expect(
            await healer.resolve(this.spec), this.message
        ).toBeChecked()
    }
}
