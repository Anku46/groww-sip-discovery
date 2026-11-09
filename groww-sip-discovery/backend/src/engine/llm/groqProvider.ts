import Groq from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'
import { LLMError, type ChatMessage, type LLMProvider } from './types'

function classify(err: unknown): LLMError {
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return new LLMError('invalid_api_key', 'Groq rejected the API key')
  if ((err as Error)?.name === 'AbortError' || (err as Error)?.name === 'APIUserAbortError') return new LLMError('timeout', 'Groq call aborted')
  const detail = (err as { error?: { error?: { message?: string } } })?.error?.error?.message
  return new LLMError('provider_error', `Groq call failed${status ? ` (HTTP ${status})` : ''}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
}

// gpt-oss models reason before answering; reasoning tokens count against max_tokens.
const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss') || model.startsWith('qwen/')

export function createGroqProvider(apiKey: string, model: string): LLMProvider {
  const client = new Groq({ apiKey, maxRetries: 0 })
  return {
    name: 'groq',
    model,
    async complete(messages: ChatMessage[], { signal }) {
      try {
        const body = {
          model, messages, temperature: 0, response_format: { type: 'json_object' as const },
          max_tokens: isReasoningModel(model) ? 2000 : 700,
          ...(isReasoningModel(model) ? { reasoning_effort: 'low' } : {}),
        }
        // reasoning_effort isn't in this SDK version's types; Groq's API accepts it.
        const res = await client.chat.completions.create(body as unknown as ChatCompletionCreateParamsNonStreaming, { signal })
        return res.choices[0]?.message?.content ?? ''
      } catch (err) {
        throw classify(err)
      }
    },
    async validateKey({ signal }) {
      try {
        await client.models.list({ signal })
        return true
      } catch (err) {
        const e = classify(err)
        if (e.reason === 'invalid_api_key') return false
        throw e
      }
    },
  }
}
