/**
 * Patrón opcional de componente del esqueleto.
 *
 * Los componentes reciben solo `Healer` (nunca `Page` directo) y derivan
 * sus locators del propio `LocatorSpec`, igual que los POM:
 *
 * ```ts
 * import type { Healer } from '../healing'
 * import { homeLocators } from '../locators/home.locators'
 *
 * export class ExampleComponent {
 *   constructor(private readonly healer: Healer) {}
 * }
 * ```
 */
export {}
