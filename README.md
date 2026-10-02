# prueba-e2e-softka

Esqueleto base de pruebas E2E de UI con Playwright + TypeScript y
**self-healing/autofix de locators** (escalera: cadena de candidatos →
caché → IA). Es el runtime del framework, sin suite de producto: trae un
test, una página y un locator genéricos de ejemplo listos para adaptar al
sitio destino (`E2E_BASE_URL`).

## Stack

- Node 22 / npm 11
- TypeScript (`strict`, `noEmit`, CommonJS)
- `@playwright/test`
- `dotenv` (carga `.env` desde `playwright.config.ts`)
- `diff` (generación de parches del healing)

## Estructura

```text
src/
  healing/      core self-healing + autofix (no modificar salvo R1)
  locators/     locators como datos (`LocatorSpec` + `@heal-target`)
  pages/        Page Objects (reciben `Healer`, sin selectores literales)
  components/   patrón opcional de componente (recibe solo `Healer`)
  fixtures/     único export de `test` (healer + testDelay + POM de ejemplo)
tests/
  e2e_guest/    specs sin sesión (proyecto chromium-guest)
```

## Cómo correr

```bash
npm install
cp .env.example .env   # completar E2E_BASE_URL y, si aplica, HEAL_* (nunca commitear)
npx playwright install --with-deps
npx playwright test --project=chromium-guest
npx playwright show-report
npx tsc --noEmit       # 0 errores
```

Sin API key el nivel IA queda deshabilitado y el framework sigue operativo
con cadena + caché (escenario de CI). `HEAL_APPLY=1` solo en revisiones
explícitas del diff.

## Self-healing

Cada `LocatorSpec` declara una cadena de candidatos. Si ninguno resuelve,
`Healer` consulta la caché y, como último nivel, a un motor de IA
(`HEAL_ENGINE=chat|systemone`). Cada cura:

- anota el test y escribe `.healing/healing-report-*.json`,
- guarda evento y snapshot en `.healing/`,
- propone un parche en `patches/` (aplicable con `HEAL_APPLY=1`).

Reglas del esqueleto (cadena, `@heal-target`, POM sin `page.locator(`,
un único export de `test`, web-first, gobernanza local/ci): ver la guía
de migración del esqueleto base (§3–§6).

## Adaptación al sitio destino

1. Fijar `E2E_BASE_URL` en `.env` (nunca fija en `playwright.config.ts`).
2. Si el sitio usa otra convención de test-id distinta de `data-qa`,
   ajustar `SYSTEM_PROMPT` (`ai-resolver.ts`), `locatorForElement`
   (`systemone-resolver.ts`) y/o `testIdAttribute` en la config.
3. Reemplazar los valores `<...>` del ejemplo (`example.locators.ts`,
   `example.page.ts`, `example.spec.ts`) por los reales del sitio.
4. Si el sitio tiene login, añadir proyecto `setup` + `chromium-logged`
   con `storageState`; si no, no migrar nada de auth.
