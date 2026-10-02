import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 *
 * Carga `.env` de la raiz (HEAL_* para el sistema de healing,
 * E2E_* para el runner). No sobreescribe variables ya definidas
 * en el entorno: en CI o en un shell con las variables exportadas,
 * esas tienen prioridad.
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Workers del runner: 1 en CI, automático en local.
 * `E2E_WORKERS` lo fija (p. ej. `1` cuando el sitio externo está bajo carga).
 */
function envWorkers(): number | undefined {
  const parsed = Number(process.env.E2E_WORKERS)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return process.env.CI ? 1 : undefined
}

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Plantilla del esqueleto: la `baseURL` sale del entorno (`E2E_BASE_URL`,
 * ver `.env.example`). Sin sesión en el destino: solo `chromium-guest`.
 * Si el sitio destino tiene login, añadir `setup` + `chromium-logged`
 * con `storageState` (ver R13 de la guía de migración).
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Workers: 1 en CI, automático en local; E2E_WORKERS lo fija. */
  workers: envWorkers(),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  //reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. Por entorno (R2). */
    baseURL: process.env.E2E_BASE_URL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    // Si el sitio usa `data-qa` como atributo de test-id en lugar de
    // `data-testid`, descomentar la línea siguiente (ver §6 de la guía):
    // testIdAttribute: 'data-qa',
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'chromium-guest', use: { ...devices['Desktop Chrome'] } },
  ],
});
