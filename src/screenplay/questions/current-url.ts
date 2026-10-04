import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'
import { expect } from '@playwright/test';

/** Devuelve la URL actual de la página del actor. */
export class CurrentUrl implements Question<void> {
  private constructor(
    private readonly path : string
  ) {}

  static contain(path:string): CurrentUrl {
    return new CurrentUrl(path)
  }

  async answeredBy(actor: Actor): Promise<void> {
   const url = actor.ability(BrowseTheWeb).page.url();
    expect(url).toContain(this.path)
  }
}
