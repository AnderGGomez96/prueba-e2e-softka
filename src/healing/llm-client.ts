/**
 * Cliente HTTP del motor `chat` (endpoint compatible con OpenAI).
 *
 * Envía los mensajes al modelo generativo y devuelve el contenido junto con el
 * modelo efectivo y el consumo de tokens. Usado por `ai-resolver`.
 */
import type { LlmConfig } from './config'
import type { TokenUsage } from './types'

/** Mensaje del protocolo de chat. */
export interface ChatMessage {
  /** Rol del emisor dentro de la conversación. */
  role: 'system' | 'user' | 'assistant'
  /** Contenido textual del mensaje. */
  content: string
}

/** Resultado normalizado de una compleción. */
export interface CompletionResult {
  /** Texto devuelto por el modelo. */
  content: string
  /** Modelo que atendió la solicitud. */
  model: string
  /** Tokens consumidos, si la API los reporta. */
  usage?: TokenUsage
}

interface ChatCompletionResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: string | null
      reasoning_content?: string | null
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

/** Cliente de chat con timeout y encabezados de sesión. */
export class OpenCodeGoClient {
  /**
   * @param config - Configuración del backend de chat.
   */
  constructor(private readonly config: LlmConfig) {}

  /**
   * Envía la conversación y espera la compleción.
   *
   * @param messages - Mensajes en orden (system primero).
   * @param sessionId - Identificador de sesión para trazabilidad del proveedor.
   * @returns Contenido, modelo y consumo de tokens.
   * @throws Error si la API responde con error, vacío o excede el timeout.
   */
  async complete(messages: ChatMessage[], sessionId: string): Promise<CompletionResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey ?? ''}`,
          'x-opencode-session': sessionId,
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          max_tokens: this.config.maxOutputTokens,
          messages,
        }),
        signal: controller.signal,
      })

      const text = await response.text()
      if (!response.ok) {
        throw new Error(`La API de IA respondio HTTP ${response.status}: ${text.slice(0, 400)}`)
      }

      const parsed = JSON.parse(text) as ChatCompletionResponse
      const message = parsed.choices?.[0]?.message
      const content =
        (message?.content ?? '').trim() || (message?.reasoning_content ?? '').trim()
      if (!content) {
        throw new Error('La API de IA devolvio una respuesta vacia')
      }

      return {
        content,
        model: parsed.model ?? this.config.model,
        usage: {
          inputTokens: parsed.usage?.prompt_tokens,
          outputTokens: parsed.usage?.completion_tokens,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`La API de IA excedio el timeout de ${this.config.timeoutMs} ms`)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}
