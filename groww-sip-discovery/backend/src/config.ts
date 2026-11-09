import 'dotenv/config'
import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  EMBEDDINGS_ENABLED: bool.default('true'),
  EMBEDDING_MODEL: z.string().default('Xenova/bge-small-en-v1.5'),
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(2000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Config = z.infer<typeof EnvSchema> & { corsOrigins: string[] }

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env)
  return {
    ...parsed,
    GROQ_API_KEY: parsed.GROQ_API_KEY?.trim() || undefined,
    corsOrigins: parsed.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  }
}
