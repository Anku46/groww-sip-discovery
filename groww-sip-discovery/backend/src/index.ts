import { createApp } from './app'
import { loadConfig } from './config'
import { createBgeEmbedder } from './engine/embedding/bgeEmbedder'
import { createLogger } from './logger'

const config = loadConfig()
const logger = createLogger(config.LOG_LEVEL)
const embedder = config.EMBEDDINGS_ENABLED ? createBgeEmbedder(config.EMBEDDING_MODEL, logger) : null

const app = createApp({ config, logger, embedder })
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV, corsOrigins: config.corsOrigins, groqKeyConfigured: Boolean(config.GROQ_API_KEY) }, 'server listening')
  // Load the embedding model in the background; the deterministic path doesn't wait for it.
  void embedder?.warmUp()
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down')
    server.close(() => process.exit(0))
  })
}
process.on('unhandledRejection', (err) => logger.error({ err: (err as Error)?.message }, 'unhandled rejection'))
