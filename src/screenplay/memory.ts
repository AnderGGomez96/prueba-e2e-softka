import type { Actor } from './actor'

export interface ProductoElegido {
  nombre: string
  precio: number
  cantidad: number
}

/** Contrato de la memoria del flujo: qué datos guarda el actor y con qué tipo. */
export interface MemoryFlow {
  productosElegidos: ProductoElegido[]
}

/** Escribe o reemplaza un valor de la memoria (inicialización y cambios de estado). */
export function memorySet<K extends keyof MemoryFlow>(
  actor: Actor,
  key: K,
  value: MemoryFlow[K],
): void {
  actor.remember(key, value)
}

/**
 * Lee un valor que el flujo garantiza. Si falta, es un bug de flujo:
 * falla fuerte con la clave y el actor en el mensaje (no devuelve undefined).
 */
export function memoryGet<K extends keyof MemoryFlow>(
  actor: Actor,
  key: K,
): MemoryFlow[K] {
  const valor = actor.recall<MemoryFlow[K]>(key)
  if (valor === undefined) {
    throw new Error(
      `No se encontró el valor para la clave "${key}" en la memoria del actor "${actor.name}".`,
    )
  }
  return valor
}

/**
 * Agrega un elemento a una lista de la memoria. La ausencia inicial es válida
 * (se parte de `[]`), por eso no pasa por `memoryGet`.
 */
export function memoryAppend<K extends keyof MemoryFlow>(
  actor: Actor,
  key: K,
  item: MemoryFlow[K] extends (infer Elemento)[] ? Elemento : never,
): void {
  const actuales = actor.recall<unknown[]>(key) ?? []
  actor.remember(key, [...actuales, item])
}
