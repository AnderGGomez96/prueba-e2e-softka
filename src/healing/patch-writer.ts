/**
 * Generación de parches y artefactos del autofix.
 *
 * Por cada curación escribe:
 * - el evento completo en `.healing/events/`,
 * - un `.patch` unificado en `patches/` cuando el spec declara `sourceFile`
 *   y existe el marcador `// @heal-target:clave` (opcionalmente `:indice`),
 * - un archivo `.suggested.json` cuando no se pudo ubicar el marcador.
 *
 * Con `HEAL_APPLY=1` el parche se aplica directamente sobre el archivo fuente.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createTwoFilesPatch } from 'diff'
import type { HealingConfig } from './config'
import { formatCandidate } from './locator-factory'
import type { HealingEvent, LocatorCandidate, LocatorSpec } from './types'

/** Resultado de procesar una curación, con las rutas de los artefactos escritos. */
export interface PatchResult {
  /** Ruta del evento JSON escrito. */
  eventPath: string
  /** Ruta del `.patch` generado, si se pudo ubicar el marcador. */
  patchPath?: string
  /** Ruta de la sugerencia JSON cuando no hubo marcador. */
  suggestionPath?: string
  /** Indica si el parche se aplicó sobre el archivo fuente. */
  applied: boolean
}

/** Escritor de eventos, parches y sugerencias del autofix. */
export class PatchWriter {
  /**
   * @param config - Configuración vigente de healing.
   */
  constructor(private readonly config: HealingConfig) {}

  /**
   * Persiste una curación y genera el parche correspondiente.
   *
   * @param event - Evento de la resolución exitosa.
   * @param spec - Spec que originó el evento.
   * @returns Rutas de los artefactos escritos y si el parche fue aplicado.
   */
  async writeHeal(event: HealingEvent, spec: LocatorSpec): Promise<PatchResult> {
    const root = process.cwd()
    const stamp = event.timestamp.replace(/[:.]/g, '-')
    const eventsDir = path.join(root, this.config.artifactsDir, 'events')
    fs.mkdirSync(eventsDir, { recursive: true })
    const eventPath = path.join(eventsDir, `${stamp}-${spec.key}.json`)
    fs.writeFileSync(eventPath, JSON.stringify({ event, spec }, null, 2))

    const healed = event.healedCandidate
    if (!healed || !spec.sourceFile || !this.config.writePatches) {
      return { eventPath, applied: false }
    }

    const sourceFile = path.resolve(root, spec.sourceFile)
    const patchedSource = this.buildPatchedSource(sourceFile, spec, event, healed)

    if (!patchedSource) {
      const patchesDir = path.join(root, this.config.patchesDir)
      fs.mkdirSync(patchesDir, { recursive: true })
      const suggestionPath = path.join(patchesDir, `${stamp}-${spec.key}.suggested.json`)
      fs.writeFileSync(
        suggestionPath,
        JSON.stringify(
          {
            key: spec.key,
            sourceFile: spec.sourceFile,
            candidate: healed,
            confidence: event.confidence,
            reasoning: event.reasoning,
          },
          null,
          2,
        ),
      )
      return { eventPath, suggestionPath, applied: false }
    }

    const patchesDir = path.join(root, this.config.patchesDir)
    fs.mkdirSync(patchesDir, { recursive: true })
    const patchPath = path.join(patchesDir, `${stamp}-${spec.key}.patch`)
    const patch = createTwoFilesPatch(
      spec.sourceFile,
      spec.sourceFile,
      patchedSource.original,
      patchedSource.patched,
      'original',
      `healed (confianza ${event.confidence?.toFixed(2) ?? 'n/a'})`,
    )
    fs.writeFileSync(patchPath, patch)

    let applied = false
    if (this.config.applyAutofix) {
      fs.writeFileSync(sourceFile, patchedSource.patched)
      applied = true
    }
    return { eventPath, patchPath, applied }
  }

  private buildPatchedSource(
    sourceFile: string,
    spec: LocatorSpec,
    event: HealingEvent,
    healed: LocatorCandidate,
  ): { original: string; patched: string } | null {
    if (!fs.existsSync(sourceFile)) return null

    const original = fs.readFileSync(sourceFile, 'utf8')
    const eol = original.includes('\r\n') ? '\r\n' : '\n'
    const lines = original.split(/\r?\n/)
    const marker = new RegExp(`@heal-target:${escapeRegExp(spec.key)}(?::(\\d+))?`)
    const markerIndex = lines.findIndex((line) => marker.test(line))
    if (markerIndex < 0) return null

    const match = lines[markerIndex].match(marker)
    const target = match?.[1] ? Number(match[1]) : 0

    const candidateLines: number[] = []
    for (let index = markerIndex + 1; index < lines.length; index++) {
      const trimmed = lines[index].trim()
      if (trimmed.startsWith(']')) break
      if (trimmed.startsWith('{')) candidateLines.push(index)
    }

    const lineIndex = candidateLines[target]
    if (lineIndex === undefined) return null

    const current = lines[lineIndex]
    const indent = current.match(/^\s*/)?.[0] ?? ''
    const trailingComma = current.trimEnd().endsWith(',') ? ',' : ''
    const confidence = event.confidence?.toFixed(2) ?? 'n/a'
    lines[lineIndex] = `${indent}${formatCandidate(healed)}${trailingComma} // healed por IA (confianza ${confidence})`

    return { original, patched: lines.join(eol) }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
