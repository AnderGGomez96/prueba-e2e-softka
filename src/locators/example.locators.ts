import type { LocatorSpec } from '../healing/types'

const SOURCE = 'src/locators/example.locators.ts'

/**
 * Locators de ejemplo del esqueleto.
 * Reemplazar los valores por los reales del sitio destino.
 */
export const exampleLocators = {

  pageHeading: {
    key: 'examplePageHeading',
    description: 'Encabezado principal h1 de la página de inicio',
    action: 'read',
    sourceFile: SOURCE,
    candidates: [
      //@heal-target:examplePageHeading
      { strategy: 'role', role: 'heading', name: '<texto real del h1>' },
      { strategy: 'css', value: 'h1' },
    ],
  } satisfies LocatorSpec,

  errorBanner: {
    key: 'exampleErrorBanner',
    description: 'Banner de error visible cuando la página falla',
    action: 'assert',
    sourceFile: SOURCE,
    candidates: [
      //@heal-target:exampleErrorBanner
      { strategy: 'css', value: '[role="alert"]' },
    ],
  } satisfies LocatorSpec,

}
