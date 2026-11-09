/**
 * Download the BGE model into backend/.models so the server never fetches it at runtime.
 * The Docker build runs this; run it locally once before using semantic matching.
 */
import { loadConfig } from '../src/config'
import { createBgeEmbedder, cosine, MODEL_CACHE_DIR } from '../src/engine/embedding/bgeEmbedder'
import { createLogger } from '../src/logger'

const config = loadConfig()
const embedder = createBgeEmbedder(config.EMBEDDING_MODEL, createLogger('info'))
await embedder.warmUp()
if (embedder.status() !== 'ready') {
  console.error('Model failed to load.')
  process.exit(1)
}
const [a, b, c] = await embedder.embed([
  'My SIP payment bounced and the bank charged me a penalty',
  'NACH debit failed due to low balance and bank levied charges',
  'What does NAV mean for a mutual fund',
])
console.log(`Model cached in ${MODEL_CACHE_DIR}`)
console.log(`similarity(bounce, bounce) = ${cosine(a!, b!).toFixed(3)}  similarity(bounce, NAV) = ${cosine(a!, c!).toFixed(3)}`)
