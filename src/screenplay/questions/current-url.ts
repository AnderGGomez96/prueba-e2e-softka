import type { Actor } from '../actor'
import type { Question } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Devuelve la URL actual de la página del actor. */
export class CurrentUrl implements Question<string> {
  private constructor() {}

  static read(): CurrentUrl {
    return new CurrentUrl()
  }

  async answeredBy(actor: Actor): Promise<string> {
    return actor.ability(BrowseTheWeb).page.url()
  }
}
