import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Config } from './config'
import { corpusRouter } from './controllers/corpusController'
import { goldenSetRouter, type GoldenAiLabelsFile } from './controllers/goldenSetController'
import { pipelineRouter } from './controllers/pipelineController'
import { themesRouter } from './controllers/themesController'
import type { Embedder } from './engine/embedding/bgeEmbedder'
import { createGroqProvider } from './engine/llm/groqProvider'
import type { LLMProviderFactory } from './engine/llm/types'
import type { Logger } from './logger'
import { errorHandler, notFound } from './middleware/errors'
import { healthRouter } from './routes/health'

export interface AppDeps {
  config: Config
  logger: Logger
  embedder?: Embedder | null
  llmFactory?: LLMProviderFactory
  goldenAiLabels?: GoldenAiLabelsFile | null
}

export function createApp(deps: AppDeps) {
  const { config, logger } = deps
  const embedder = deps.embedder ?? null
  const llmFactory = deps.llmFactory ?? ((key: string) => createGroqProvider(key, config.GROQ_MODEL))

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    allowedHeaders: ['Content-Type', 'x-groq-api-key'],
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  }))
  app.use(express.json({ limit: '16kb' }))

  // Method / path / status / duration only — never bodies or headers.
  app.use((req, res, next) => {
    const start = performance.now()
    res.on('finish', () => logger.info({ method: req.method, path: req.path, status: res.statusCode, ms: Math.round(performance.now() - start) }, 'request'))
    next()
  })

  const api = express.Router()
  api.use(healthRouter(embedder))
  api.use(pipelineRouter({ config, logger, embedder, llmFactory }))
  api.use(corpusRouter())
  api.use(themesRouter())
  api.use(deps.goldenAiLabels === undefined ? goldenSetRouter() : goldenSetRouter(deps.goldenAiLabels))
  app.use('/api', api)

  app.use(notFound)
  app.use(errorHandler(logger))
  return app
}
