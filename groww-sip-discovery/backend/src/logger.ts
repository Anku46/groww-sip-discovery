import pino, { type DestinationStream } from 'pino'

/**
 * Structured logs. API keys and raw investor text never reach the log: keys are redacted, and request
 * logging records method/path/status/duration only.
 */
export function createLogger(level: string, destination?: DestinationStream) {
  const options = {
    level,
    redact: {
      paths: ['req.headers["x-groq-api-key"]', 'req.headers.authorization', 'apiKey', '*.apiKey', 'rawInput', '*.rawInput'],
      censor: '[REDACTED]',
    },
  }
  return destination ? pino(options, destination) : pino(options)
}

export type Logger = ReturnType<typeof createLogger>
