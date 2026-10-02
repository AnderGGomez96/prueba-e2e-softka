import type { Actor } from '../actor'
import type { Interaction } from '../types'
import { BrowseTheWeb } from '../abilities/browse-the-web'

/** Navega a una URL relativa a `baseURL` o absoluta. */
export class Navigate implements Interaction {
  private constructor(private readonly url: string) {}

  static to(url: string): Navigate {
    return new Navigate(url)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.ability(BrowseTheWeb).page.goto(this.url)
  }
}
