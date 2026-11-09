export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface LLMProvider {
  readonly name: string
  readonly model: string
  /** Returns the model's text output (expected to be a JSON object). */
  complete(messages: ChatMessage[], opts: { signal: AbortSignal }): Promise<string>
  /** Cheap authenticated call; resolves true if the key works. */
  validateKey(opts: { signal: AbortSignal }): Promise<boolean>
}

export type LLMProviderFactory = (apiKey: string) => LLMProvider

export class LLMError extends Error {
  constructor(public reason: 'invalid_api_key' | 'timeout' | 'invalid_response' | 'provider_error', message: string) {
    super(message)
  }
}

/** Runs fn with an AbortSignal that fires after timeoutMs; maps the abort to an LLMError('timeout'). */
export async function withTimeout<T>(timeoutMs: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new LLMError('timeout', `LLM call exceeded ${timeoutMs}ms`))
    }, timeoutMs)
  })
  try {
    return await Promise.race([fn(controller.signal), timeout])
  } finally {
    clearTimeout(timer)
  }
}
