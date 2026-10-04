import { expect } from '@playwright/test'
import { LocatorSpec } from "../../healing"
import { BrowseTheWeb } from "../abilities/browse-the-web"
import { Actor } from "../actor"
import { Question } from "../types"


export class Enabled implements Question<boolean> {
  private constructor(private readonly spec: LocatorSpec, private readonly message: string) {}
  static of(spec: LocatorSpec, message: string): Enabled { return new Enabled(spec, message) }

  async answeredBy(actor: Actor): Promise<boolean> {
    const { healer } = actor.ability(BrowseTheWeb)
    await expect(await healer.resolve(this.spec), this.message).toBeEnabled()
    return true
  }
}