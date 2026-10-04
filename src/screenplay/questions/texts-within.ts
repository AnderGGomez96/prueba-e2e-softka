import { LocatorSpec } from '../../healing'
import {Question} from '../types'
import {Actor} from '../actor'
import {BrowseTheWeb} from '../abilities/browse-the-web'

export class TextsWithin implements Question<string[]> {
  private constructor(
    private readonly cards: LocatorSpec,
  ) {}

  static each(  cards: LocatorSpec): TextsWithin {
    return new TextsWithin(cards)
  }

  async answeredBy(actor: Actor): Promise<string[]> {
    const { healer } = actor.ability(BrowseTheWeb)
    const textos = await   healer
        .locatorAll(this.cards)
        .allTextContents()
    return textos.map((texto) => texto.trim()).filter((texto) => texto.length > 0)
  }
}