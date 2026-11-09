import { Writable } from 'node:stream'
import { createApp, type AppDeps } from '../src/app'
import { loadConfig } from '../src/config'
import type { LLMProvider, LLMProviderFactory } from '../src/engine/llm/types'
import { createLogger } from '../src/logger'

export const TEST_ORIGIN = 'http://localhost:5173'

export function testConfig(overrides: Record<string, string> = {}) {
  return loadConfig({ NODE_ENV: 'test', EMBEDDINGS_ENABLED: 'false', LOG_LEVEL: 'info', CORS_ORIGIN: TEST_ORIGIN, ...overrides })
}

/** App with captured logs so tests can assert what was (not) logged. */
export function makeApp(opts: Partial<AppDeps> & { env?: Record<string, string> } = {}) {
  const lines: string[] = []
  const sink = new Writable({ write(chunk, _enc, cb) { lines.push(String(chunk)); cb() } })
  const config = opts.config ?? testConfig(opts.env)
  const logger = createLogger('info', sink)
  const app = createApp({ config, logger, embedder: null, ...opts })
  return { app, logs: () => lines.join('') }
}

export const validProfileJson = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  investorLifecycleStage: 'MONTH_0_1',
  userSegment: 'UNKNOWN',
  primaryFrictionTheme: 'THEME_MANDATE_SETUP_FAILURE',
  insideAppConfusion: 'Reads the ₹15,000 mandate limit as the debit amount.',
  outsideAppWorkaround: null,
  churnSeverity: 3,
  churnSeverityRationale: 'Worried about the amount, no money lost.',
  emotionalSignals: ['confusion'],
  ...overrides,
})

export function mockFactory(behaviour: Partial<LLMProvider> & { onKey?: (key: string) => void }): LLMProviderFactory {
  return (key) => {
    behaviour.onKey?.(key)
    return {
      name: 'mock',
      model: 'mock-model',
      complete: behaviour.complete ?? (async () => validProfileJson()),
      validateKey: behaviour.validateKey ?? (async () => true),
    }
  }
}
