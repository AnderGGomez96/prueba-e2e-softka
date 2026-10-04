/**
 * Orquestador del healing: la escalera de resolución de locators.
 *
 * Orden de intentos en {@link Healer.resolve}:
 * 1. Cadena de candidatos del spec (niveles `primary` y `fallback`).
 * 2. Caché persistente de curaciones previas (nivel `cache`).
 * 3. Motor de IA, chat o System One (nivel `ai`), con reintentos y feedback.
 *
 * En cada curación registra el evento, anota el test, escribe el parche y
 * actualiza la caché. Los límites y umbrales los aplica {@link HealingGovernor}.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { loadHealingConfig, type HealingConfig } from './config'
import { HealingExhaustedError, errorMessage } from './errors'
import { HealingGovernor } from './governor'
import { HealedLocatorCache } from './cache'
import { PatchWriter } from './patch-writer'
import { candidateToLocator, describeCandidate } from './locator-factory'
import { proposeLocator } from './ai-resolver'
import { proposeLocatorWithSystemOne } from './systemone-resolver'
import type { PageSnapshot } from './snapshot'
import type { AiProposal, HealingAttempt, HealingEvent, LocatorSpec, SelectOption } from './types'

/** Opciones de construcción del {@link Healer}. */
export interface HealerOptions {
  /** Información del test en curso, para anotaciones y adjuntos en el reporte. */
  testInfo?: TestInfo
  /** Configuración de healing; si se omite se carga del entorno. */
  config?: HealingConfig
}

type WaitState = 'attached' | 'visible'

/**
 * Servicio de resolución de locators ligado a una página.
 *
 * @example
 * ```ts
 * const healer = new Healer(page, { testInfo })
 * await healer.fill(loginLocators.loginEmail, 'user@example.com')
 * await healer.click(loginLocators.loginButton)
 * await healer.flush()
 * ```
 */
export class Healer {
  /** Configuración vigente del healer. */
  readonly config: HealingConfig
  private readonly page: Page
  private readonly testInfo?: TestInfo
  private readonly governor: HealingGovernor
  private readonly cache: HealedLocatorCache
  private readonly patchWriter: PatchWriter
  private flushed = false

  constructor(page: Page, options: HealerOptions = {}) {
    this.page = page
    this.testInfo = options.testInfo
    this.config = options.config ?? loadHealingConfig()
    this.governor = new HealingGovernor(this.config)
    this.cache = new HealedLocatorCache(
      path.join(process.cwd(), this.config.artifactsDir, 'healed-locators.json'),
    )
    this.patchWriter = new PatchWriter(this.config)
  }

  /** Eventos de resolución registrados durante la prueba. */
  get events(): readonly HealingEvent[] {
    return this.governor.events
  }

  /**
   * Invalida la curación cacheada de una clave, forzando una nueva resolución.
   *
   * @param key - Clave del locator a invalidar.
   */
  clearCachedLocator(key: string): void {
    this.cache.clear(key)
  }

  /**
   * Resuelve el locator y escribe el valor en el campo.
   *
   * @param spec - Locator del campo a completar.
   * @param value - Valor a escribir.
   * @param options - Timeout opcional para la acción de Playwright.
   */
  async fill(spec: LocatorSpec, value: string, options?: { timeout?: number }): Promise<void> {
    const locator = await this.resolve(spec)
    await locator.fill(value, options)
  }

  /**
   * Resuelve el locator y selecciona una opción del `<select>`.
   *
   * @param spec - Locator del `<select>` a completar.
   * @param option - Opción a seleccionar (texto/label, value o índice).
   * @param options - Timeout opcional para la acción de Playwright.
   */
  async select(
    spec: LocatorSpec,
    option: SelectOption,
    options?: { timeout?: number },
  ): Promise<void> {
    const locator = await this.resolve(spec)
    await locator.selectOption(option, options)
  }

  /**
   * Resuelve el locator y marca el radio/checkbox (idempotente: si ya está
   * marcado no lo destilda, a diferencia de un click).
   *
   * @param spec - Locator del radio o checkbox.
   * @param options - Timeout opcional para la acción de Playwright.
   */
  async check(spec: LocatorSpec, options?: { timeout?: number }): Promise<void> {
    const locator = await this.resolve(spec)
    await locator.check(options)
  }

  /**
   * Resuelve el locator y hace clic en el elemento.
   *
   * @param spec - Locator del elemento a clickear.
   * @param options - Timeout opcional para la acción de Playwright.
   */
  async click(spec: LocatorSpec, options?: { timeout?: number }): Promise<void> {
    const locator = await this.resolve(spec)
    await locator.click(options)
  }

  /**
   * Resuelve el locator y devuelve el texto visible del elemento.
   *
   * @param spec - Locator del elemento a leer.
   * @returns El texto del elemento, o cadena vacía si no tiene.
   */
  async text(spec: LocatorSpec): Promise<string> {
    const locator = await this.resolve(spec)
    return (await locator.textContent()) ?? ''
  }

  /**
   * Deriva un `Locator` de Playwright desde un candidato del `LocatorSpec`,
   * SIN recorrer la escalera de healing (cadena/caché/IA), sin gobernanza,
   * sin eventos, sin parches y sin `waitFor`. Traducción pura para aserciones
   * de ausencia/presencia que no deben gastar curaciones (contrato H-01).
   *
   * @param spec - Spec origen; se usa `spec.candidates[index]`.
   * @param index - Índice del candidato (default 0 = primario).
   * @returns `Locator` con `.first()` para no romper el modo estricto.
   * @throws RangeError si `index` está fuera de `spec.candidates`.
   */
  locator(spec: LocatorSpec, index = 0): Locator {
    if (index < 0 || index >= spec.candidates.length) {
      throw new RangeError(
        `Índice ${index} fuera de rango para el spec "${spec.key}" ` +
          `(candidates.length = ${spec.candidates.length})`,
      )
    }
    return candidateToLocator(this.page, spec.candidates[index]).first()
  }

  /**
   * Deriva un `Locator` multi-match de Playwright desde un candidato del
   * `LocatorSpec`, SIN `.first()`, sin recorrer la escalera de healing
   * (cadena/caché/IA), sin gobernanza, sin eventos, sin parches y sin
   * `waitFor`. Traducción pura para enumerar colecciones (contrato H-01);
   * el consumidor controla el alcance con `.all()`, `.count()` o `.nth()`.
   *
   * @param spec - Spec origen; se usa `spec.candidates[index]`.
   * @param index - Índice del candidato (default 0 = primario).
   * @returns `Locator` sin `.first()`, que puede coincidir con varios elementos.
   * @throws RangeError si `index` está fuera de `spec.candidates`.
   */
  locatorAll(spec: LocatorSpec, index = 0): Locator {
    if (index < 0 || index >= spec.candidates.length) {
      throw new RangeError(
        `Índice ${index} fuera de rango para el spec "${spec.key}" ` +
          `(candidates.length = ${spec.candidates.length})`,
      )
    }
    return candidateToLocator(this.page, spec.candidates[index])
  }

  /**
   * Recorre la escalera de resolución y devuelve el primer locator funcional.
   *
   * @param spec - Locator a resolver.
   * @returns Locator de Playwright ya validado (visible o adjunto según la acción).
   * @throws HealingGovernanceError si se superan los límites de gobernanza.
   * @throws HealingExhaustedError si ningún nivel logra resolver el locator.
   */
  async resolve(spec: LocatorSpec): Promise<Locator> {
    const started = Date.now()
    const attempts: HealingAttempt[] = []
    const waitState: WaitState =
      spec.action === 'click' ||
      spec.action === 'fill' ||
      spec.action === 'select' ||
      spec.action === 'check'
        ? 'visible'
        : 'attached'

    for (let index = 0; index < spec.candidates.length; index++) {
      const candidate = spec.candidates[index]
      try {
        const locator = await this.waitForCandidate(candidate, waitState)
        this.register(
          this.buildEvent(spec, started, attempts, {
            level: index === 0 ? 'primary' : 'fallback',
            provider: 'chain',
            candidateIndex: index,
            candidate,
          }),
        )
        return locator
      } catch (error) {
        attempts.push({
          label: describeCandidate(candidate),
          ok: false,
          error: errorMessage(error),
        })
      }
    }

    const cached = this.config.cacheEnabled ? this.cache.lookup(spec.key) : undefined
    if (cached) {
      const trusted = this.config.mode !== 'ci' || cached.confidence >= this.config.minConfidence
      if (!trusted) {
        attempts.push({
          label: `cache: ${describeCandidate(cached.candidate)}`,
          ok: false,
          error: `omitido por gobernanza: confianza ${cached.confidence} < umbral ${this.config.minConfidence}`,
        })
      } else {
        try {
          const locator = await this.waitForCandidate(cached.candidate, waitState)
          this.governor.assertCanHeal()
          this.register(
            this.buildEvent(spec, started, attempts, {
              level: 'cache',
              provider: 'cache',
              healedCandidate: cached.candidate,
              confidence: cached.confidence,
              model: cached.model,
            }),
          )
          return locator
        } catch (error) {
          attempts.push({
            label: `cache: ${describeCandidate(cached.candidate)}`,
            ok: false,
            error: errorMessage(error),
          })
        }
      }
    }

    this.governor.assertCanHeal()
    if (!this.resolverEnabled) {
      throw new HealingExhaustedError(spec, attempts, this.resolverDisabledReason)
    }

    let feedback: string | undefined
    let lastError = 'sin respuesta de la IA'

    for (let intent = 0; intent <= this.config.llm.retries; intent++) {
      let proposal: AiProposal
      try {
        proposal = await this.propose(spec, feedback)
      } catch (error) {
        throw new HealingExhaustedError(
          spec,
          attempts,
          `Error al consultar el motor de reparacion (${this.config.engine}): ${errorMessage(error)}`,
        )
      }

      await this.saveSnapshot(spec, proposal.snapshot, intent)
      this.governor.assertConfidence(proposal.resolution.confidence)

      try {
        const locator = await this.waitForCandidate(proposal.resolution.candidate, waitState)
        const event = this.buildEvent(spec, started, attempts, {
          level: 'ai',
          provider: this.config.engine === 'systemone' ? 'systemone' : 'llm',
          healedCandidate: proposal.resolution.candidate,
          confidence: proposal.resolution.confidence,
          probabilities: proposal.probabilities,
          usage: proposal.usage,
          reasoning: proposal.resolution.reasoning,
          model: proposal.resolution.model,
        })
        this.register(event)
        await this.writePatch(event, spec)
        return locator
      } catch (error) {
        lastError = errorMessage(error)
        attempts.push({
          label: `ia: ${describeCandidate(proposal.resolution.candidate)}`,
          ok: false,
          error: lastError,
        })
        feedback = lastError
      }
    }

    throw new HealingExhaustedError(
      spec,
      attempts,
      `La IA no logro reparar el locator: ${lastError}`,
    )
  }

  /**
   * Escribe el reporte de la prueba en `artifactsDir` y lo adjunta al reporte
   * de Playwright. Es idempotente; la fixture lo invoca al terminar el test.
   */
  async flush(): Promise<void> {
    if (this.flushed) return
    this.flushed = true

    const report = {
      generatedAt: new Date().toISOString(),
      mode: this.config.mode,
      minConfidence: this.config.minConfidence,
      maxHealsPerTest: this.config.maxHealsPerTest,
      autoRecoveries: this.governor.autoRecoveryCount,
      events: this.events,
    }

    const dir = path.join(process.cwd(), this.config.artifactsDir)
    fs.mkdirSync(dir, { recursive: true })
    const reportPath = path.join(dir, `healing-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.testInfo?.attach('healing-report.json', {
      contentType: 'application/json',
      body: JSON.stringify(report, null, 2),
    })
  }

  private get resolverEnabled(): boolean {
    return this.config.engine === 'systemone'
      ? this.config.systemone.enabled
      : this.config.llm.enabled
  }

  private get resolverDisabledReason(): string {
    return this.config.engine === 'systemone'
      ? 'Nivel 3 (System One) deshabilitado: falta la API key de Jev (HEAL_JEV_API_KEY) o HEAL_ENGINE no es systemone'
      : 'Nivel 3 (IA) deshabilitado: no hay API key configurada para opencode-go'
  }

  private async propose(spec: LocatorSpec, feedback?: string): Promise<AiProposal> {
    if (this.config.engine === 'systemone') {
      return proposeLocatorWithSystemOne(
        this.page,
        spec,
        this.config.systemone,
        feedback,
        undefined,
        this.config.snapshotMode,
      )
    }
    return proposeLocator(this.page, spec, this.config.llm, feedback, this.config.snapshotMode)
  }

  private async waitForCandidate(candidate: LocatorSpec['candidates'][number], state: WaitState): Promise<Locator> {
    const locator = candidateToLocator(this.page, candidate).first()
    await locator.waitFor({ state, timeout: this.config.candidateTimeoutMs })
    return locator
  }

  private buildEvent(
    spec: LocatorSpec,
    started: number,
    attempts: HealingAttempt[],
    extra: Pick<HealingEvent, 'level' | 'provider'> & Partial<HealingEvent>,
  ): HealingEvent {
    return {
      key: spec.key,
      description: spec.description,
      action: spec.action,
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      pageUrl: this.page.url(),
      attempts: [...attempts],
      ...extra,
    }
  }

  private register(event: HealingEvent): void {
    this.governor.record(event)
    if (event.level === 'primary') return
    this.annotate(event)
  }

  private annotate(event: HealingEvent): void {
    const candidate = event.healedCandidate ?? event.candidate
    const target = candidate ? describeCandidate(candidate) : 'n/a'
    const confidence = event.confidence !== undefined ? ` confianza=${event.confidence.toFixed(2)}` : ''
    this.testInfo?.annotations.push({
      type: 'self-heal',
      description: `[${event.level}/${event.provider}] ${event.key} -> ${target}${confidence}`,
    })
    this.testInfo?.attach(`self-heal-${event.key}.json`, {
      contentType: 'application/json',
      body: JSON.stringify(event, null, 2),
    })
  }

  private async saveSnapshot(
    spec: LocatorSpec,
    snapshot: PageSnapshot,
    intent: number,
  ): Promise<void> {
    const dir = path.join(process.cwd(), this.config.artifactsDir, 'snapshots')
    fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(dir, `${stamp}-${spec.key}-intento-${intent + 1}.json`)
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
    this.testInfo?.attach(`snapshot-ia-${spec.key}-${intent + 1}.json`, {
      contentType: 'application/json',
      body: JSON.stringify(snapshot, null, 2),
    })
  }

  private async writePatch(event: HealingEvent, spec: LocatorSpec): Promise<void> {
    const result = await this.patchWriter.writeHeal(event, spec)

    if (event.healedCandidate) {
      this.cache.save(spec.key, {
        candidate: event.healedCandidate,
        confidence: event.confidence ?? 0,
        model: event.model,
        healedAt: event.timestamp,
        source: 'ai',
      })
    }

    if (result.patchPath) {
      this.testInfo?.attach(`self-heal-${spec.key}.patch`, {
        contentType: 'text/x-patch',
        path: result.patchPath,
      })
    }
  }
}
