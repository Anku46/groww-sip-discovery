import { Router } from 'express'
import type { Embedder } from '../engine/embedding/bgeEmbedder'

export function healthRouter(embedder: Embedder | null) {
  const r = Router()
  r.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      embeddings: embedder ? embedder.status() : 'disabled',
    })
  })
  return r
}
