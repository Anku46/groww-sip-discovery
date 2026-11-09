import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { LLMError } from '../src/engine/llm/types'
import { parseBehavioralProfile } from '../src/engine/llm/responseValidator'
import { makeApp, mockFactory, validProfileJson } from './helpers'

const KEY = 'gsk_test_secret_key_123'
const run = (app: Parameters<typeof request>[0], body: object, key?: string) => {
  const req = request(app).post('/api/pipeline/run').send(body)
  return key ? req.set('x-groq-api-key', key) : req
}

describe('4.8 engine selection & fallback', () => {
  it('P4-8.1 valid key → LLM engine, validated output', async () => {
    let seenKey = ''
    const { app } = makeApp({ llmFactory: mockFactory({ onKey: (k) => (seenKey = k) }) })
    const r = (await run(app, { rawInput: 'autopay shows 15000 for my 500 SIP, why?' }, KEY).expect(200)).body
    expect(r.engineUsed).toBe('llm')
    expect(seenKey).toBe(KEY)
    expect(r.stages.stage3.behavioralProfile.primaryFrictionTheme).toBe('THEME_MANDATE_SETUP_FAILURE')
  })
  it('auto without a key → deterministic', async () => {
    const { app } = makeApp({ llmFactory: mockFactory({}) })
    expect((await run(app, { rawInput: 'what is NAV?' })).body.engineUsed).toBe('deterministic')
  })
  it('P4-8.2 forced LLM without a key → fallback (no_api_key)', async () => {
    const { app } = makeApp({ llmFactory: mockFactory({}) })
    const r = (await run(app, { rawInput: 'what is NAV?', preferredEngine: 'llm' })).body
    expect([r.engineUsed, r.fallbackReason]).toEqual(['fallback', 'no_api_key'])
  })
  it('forced deterministic ignores the key', async () => {
    const { app } = makeApp({ llmFactory: mockFactory({ complete: async () => { throw new Error('should not be called') } }) })
    expect((await run(app, { rawInput: 'what is NAV?', preferredEngine: 'deterministic' }, KEY)).body.engineUsed).toBe('deterministic')
  })
  it('P4-8.3 invalid key → fallback, key not echoed', async () => {
    const { app, logs } = makeApp({ llmFactory: mockFactory({ complete: async () => { throw new LLMError('invalid_api_key', 'rejected') } }) })
    const r = await run(app, { rawInput: 'what is NAV?' }, KEY).expect(200)
    expect([r.body.engineUsed, r.body.fallbackReason]).toEqual(['fallback', 'invalid_api_key'])
    expect(JSON.stringify(r.body)).not.toContain(KEY)
    expect(logs()).not.toContain(KEY)
  })
  it('P4-8.4 timeout → fallback', async () => {
    const slow = mockFactory({ complete: (_m, { signal }) => new Promise((resolve) => {
      const t = setTimeout(() => resolve(validProfileJson()), 2000)
      signal.addEventListener('abort', () => clearTimeout(t))
    }) })
    const { app } = makeApp({ llmFactory: slow, env: { LLM_TIMEOUT_MS: '50' } })
    const r = (await run(app, { rawInput: 'what is NAV?' }, KEY)).body
    expect([r.engineUsed, r.fallbackReason]).toEqual(['fallback', 'timeout'])
  })
  it('P4-8.5 malformed LLM JSON → fallback', async () => {
    for (const bad of ['not json at all', validProfileJson({ primaryFrictionTheme: 'THEME_MADE_UP' }), validProfileJson({ churnSeverity: 9 })]) {
      const { app } = makeApp({ llmFactory: mockFactory({ complete: async () => bad }) })
      const r = (await run(app, { rawInput: 'what is NAV?' }, KEY)).body
      expect([r.engineUsed, r.fallbackReason], bad).toEqual(['fallback', 'invalid_response'])
    }
  })
  it('P4-8.6 SEBI check still runs on the LLM path', async () => {
    const { app } = makeApp({ llmFactory: mockFactory({ complete: async () => validProfileJson({ primaryFrictionTheme: 'THEME_CONCEPT_GAPS' }) }) })
    const r = (await run(app, { rawInput: 'which small cap fund is best and will it give 20% returns?' }, KEY)).body
    expect(r.engineUsed).toBe('llm')
    expect(r.sebiConstraintTriggered).toBe(true)
    expect(r.stages.stage4.addressabilityWeight).toBe(0.2)
  })
  it('the LLM never receives unmasked PII', async () => {
    let prompt = ''
    const { app } = makeApp({ llmFactory: mockFactory({ complete: async (m) => { prompt = m.map((x) => x.content).join('\n'); return validProfileJson() } }) })
    await run(app, { rawInput: 'autopay 15000, my number 9876543210' }, KEY).expect(200)
    expect(prompt).toContain('[PHONE]')
    expect(prompt).not.toContain('9876543210')
  })
})

describe('key validation endpoint', () => {
  it('requires the header', async () => {
    const { app } = makeApp({ llmFactory: mockFactory({}) })
    await request(app).post('/api/llm/validate-key').expect(400)
  })
  it('reports valid / invalid', async () => {
    const good = makeApp({ llmFactory: mockFactory({ validateKey: async () => true }) }).app
    expect((await request(good).post('/api/llm/validate-key').set('x-groq-api-key', KEY)).body.valid).toBe(true)
    const bad = makeApp({ llmFactory: mockFactory({ validateKey: async () => false }) }).app
    expect((await request(bad).post('/api/llm/validate-key').set('x-groq-api-key', KEY)).body.valid).toBe(false)
  })
})

describe('response validator', () => {
  it('accepts JSON wrapped in prose and fixes soft fields', () => {
    const p = parseBehavioralProfile(`Here you go:\n${validProfileJson({ userSegment: 'ALIENS', emotionalSignals: 'x' })}\nThanks`)
    expect(p.userSegment).toBe('UNKNOWN')
    expect(p.emotionalSignals).toEqual([])
  })
})
