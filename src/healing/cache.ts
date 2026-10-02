/**
 * Caché persistente de curaciones de locators.
 *
 * Evita volver a consultar al motor de IA cuando el mismo locator ya fue
 * curado: guarda el candidato ganador con su confianza y modelo en un archivo
 * JSON (por defecto `.healing/healed-locators.json`).
 */
import fs from 'node:fs'
import path from 'node:path'
import type { LocatorCandidate } from './types'

/** Entrada de caché para un locator curado. */
export interface CachedLocator {
  /** Candidato que resolvió el locator. */
  candidate: LocatorCandidate
  /** Confianza reportada por el motor al curar. */
  confidence: number
  /** Modelo que generó la curación. */
  model?: string
  /** Marca temporal ISO-8601 de la curación. */
  healedAt: string
  /** Origen de la entrada. */
  source: 'ai' | 'manual'
}

/** Caché en disco, indexada por la clave del {@link LocatorSpec}. */
export class HealedLocatorCache {
  /**
   * @param file - Ruta absoluta del archivo JSON de caché.
   */
  constructor(private readonly file: string) {}

  /**
   * Busca la curación registrada para una clave.
   *
   * @param key - Clave del locator.
   * @returns La entrada cacheada, o `undefined` si no existe.
   */
  lookup(key: string): CachedLocator | undefined {
    return this.readAll()[key]
  }

  /**
   * Guarda o reemplaza la curación de una clave.
   *
   * @param key - Clave del locator.
   * @param entry - Entrada a persistir.
   */
  save(key: string, entry: CachedLocator): void {
    const all = this.readAll()
    all[key] = entry
    this.writeAll(all)
  }

  /**
   * Elimina la curación de una clave; útil para forzar una nueva resolución.
   *
   * @param key - Clave del locator a invalidar.
   */
  clear(key: string): void {
    const all = this.readAll()
    if (!(key in all)) return
    delete all[key]
    this.writeAll(all)
  }

  private readAll(): Record<string, CachedLocator> {
    try {
      if (!fs.existsSync(this.file)) return {}
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, CachedLocator>
      return parsed ?? {}
    } catch {
      return {}
    }
  }

  private writeAll(all: Record<string, CachedLocator>): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify(all, null, 2))
  }
}
