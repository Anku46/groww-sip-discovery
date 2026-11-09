/**
 * BGE embeddings (BAAI/bge-small-en-v1.5, ONNX via @xenova/transformers), run in-process: no external API
 * calls and no token cost once the model is cached. The model files are downloaded once into MODEL_CACHE_DIR
 * (the Docker build does this at build time) and the pipeline stays in memory after first load.
 */
import { fileURLToPath } from 'node:url'
import { DOMAIN_RULES, FRICTION_THEMES } from '@groww-sip/shared'
import type { Logger } from '../../logger'

export const MODEL_CACHE_DIR = fileURLToPath(new URL('../../../.models', import.meta.url))

type Status = 'idle' | 'loading' | 'ready' | 'failed'
type Extractor = (texts: string[], opts: { pooling: 'cls' | 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>

export interface Embedder {
  status(): Status
  warmUp(): Promise<void>
  embed(texts: string[]): Promise<number[][]>
  /** Top rules above the threshold, by cosine similarity to rule name + summary. */
  semanticRuleMatches(text: string, threshold?: number, max?: number): Promise<{ ruleId: string; similarity: number }[]>
  /** All themes ranked by similarity to theme name + summary. */
  themeSimilarities(text: string): Promise<{ themeId: string; similarity: number }[]>
}

export const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

// BGE recommends this instruction prefix for short queries matched against passages.
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: '

export function createBgeEmbedder(modelName: string, logger: Logger): Embedder {
  let status: Status = 'idle'
  let loading: Promise<void> | null = null
  let extractor: Extractor | null = null
  let ruleVecs: { id: string; vec: number[] }[] = []
  let themeVecs: { id: string; vec: number[] }[] = []

  const run = async (texts: string[]) => (await extractor!(texts, { pooling: 'cls', normalize: true })).tolist()

  async function load() {
    status = 'loading'
    const started = Date.now()
    try {
      const { pipeline, env } = await import('@xenova/transformers')
      env.cacheDir = MODEL_CACHE_DIR
      env.allowLocalModels = true
      extractor = (await pipeline('feature-extraction', modelName)) as unknown as Extractor
      const rv = await run(DOMAIN_RULES.map((r) => `${r.name}. ${r.summary} ${r.detailedExplanation}`))
      ruleVecs = DOMAIN_RULES.map((r, i) => ({ id: r.id, vec: rv[i]! }))
      const tv = await run(FRICTION_THEMES.map((t) => `${t.name}. ${t.summary}`))
      themeVecs = FRICTION_THEMES.map((t, i) => ({ id: t.id, vec: tv[i]! }))
      status = 'ready'
      logger.info({ model: modelName, ms: Date.now() - started }, 'embedding model ready')
    } catch (err) {
      status = 'failed'
      logger.warn({ err: (err as Error).message }, 'embedding model failed to load; semantic matching disabled')
    }
  }

  const embedder: Embedder = {
    status: () => status,
    warmUp() {
      loading ??= load()
      return loading
    },
    async embed(texts) {
      await embedder.warmUp()
      if (status !== 'ready') throw new Error('embedding model unavailable')
      return run(texts)
    },
    // Calibrated on bge-small: correct rules for clear paraphrases score ~0.75–0.82, neighbouring rules
    // ~0.65–0.72, unrelated text < 0.5. So only confident matches add a rule beyond the keyword matches.
    async semanticRuleMatches(text, threshold = 0.75, max = 1) {
      const [q] = await embedder.embed([QUERY_PREFIX + text])
      return ruleVecs
        .map((r) => ({ ruleId: r.id, similarity: Math.round(cosine(q!, r.vec) * 1000) / 1000 }))
        .filter((r) => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, max)
    },
    async themeSimilarities(text) {
      const [q] = await embedder.embed([QUERY_PREFIX + text])
      return themeVecs
        .map((t) => ({ themeId: t.id, similarity: Math.round(cosine(q!, t.vec) * 1000) / 1000 }))
        .sort((a, b) => b.similarity - a.similarity)
    },
  }
  return embedder
}
