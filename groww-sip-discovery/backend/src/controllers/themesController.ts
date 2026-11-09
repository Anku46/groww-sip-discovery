import { CORPUS_SUMMARY, DISCOVERY_ANSWERS, DOMAIN_RULES, FRICTION_THEMES, GLOSSARY, scoreThemes } from '@groww-sip/shared'
import { Router } from 'express'
import { z } from 'zod'

const ScoreBody = z.object({
  severityMultiplier: z.number().min(0.5).max(2).default(1),
  strictSEBIPenalty: z.boolean().default(true),
})

export function themesRouter() {
  const r = Router()
  r.get('/themes', (_req, res) => res.json(FRICTION_THEMES))
  r.post('/themes/score', (req, res) => {
    const opts = ScoreBody.parse(req.body ?? {})
    res.json(scoreThemes(FRICTION_THEMES, { ...opts, totalCorpusSize: CORPUS_SUMMARY.totalFiltered }))
  })
  r.get('/discovery-answers', (_req, res) => res.json(DISCOVERY_ANSWERS))
  r.get('/domain-rules', (_req, res) => res.json(DOMAIN_RULES))
  r.get('/glossary', (_req, res) => res.json(GLOSSARY))
  return r
}
