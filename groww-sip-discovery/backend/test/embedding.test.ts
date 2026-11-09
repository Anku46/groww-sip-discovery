/**
 * Loads the real BGE model, so it's opt-in: RUN_EMBEDDING_TESTS=1 pnpm test
 * (run `pnpm model:download` first so nothing is fetched during the test).
 */
import { describe, expect, it } from 'vitest'
import { cosine, createBgeEmbedder } from '../src/engine/embedding/bgeEmbedder'
import { createLogger } from '../src/logger'

describe.skipIf(!process.env.RUN_EMBEDDING_TESTS)('4.8 BGE embeddings', () => {
  const embedder = createBgeEmbedder('Xenova/bge-small-en-v1.5', createLogger('silent'))

  it('P4-8.8 loads, then embeds quickly', async () => {
    await embedder.warmUp()
    expect(embedder.status()).toBe('ready')
    const t = performance.now()
    await embedder.embed(['my sip money was debited but not showing'])
    expect(performance.now() - t).toBeLessThan(100)
  }, 120_000)

  it('P4-8.9 consistent, and related > unrelated', async () => {
    const [a1] = await embedder.embed(['My SIP payment bounced and the bank charged a penalty'])
    const [a2] = await embedder.embed(['My SIP payment bounced and the bank charged a penalty'])
    expect(cosine(a1!, a2!)).toBeCloseTo(1, 5)
    const [b, c] = await embedder.embed(['NACH debit failed for low balance and the bank levied charges', 'What does NAV mean?'])
    expect(cosine(a1!, b!)).toBeGreaterThan(cosine(a1!, c!))
  })

  it('semantic rule matching finds the bounce rule', async () => {
    const matches = await embedder.semanticRuleMatches('the bank cut extra money because my account had no balance on the SIP date', 0.5, 3)
    expect(matches.map((m) => m.ruleId)).toContain('RULE_NACH_BOUNCE')
  })
})
