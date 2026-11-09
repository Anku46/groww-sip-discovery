import {
  CORPUS_SUMMARY, INVESTOR_LIFECYCLE_STAGES, QUICK_LOAD_CHIPS, SOURCE_CHANNELS, USER_SEGMENTS, VERBATIMS,
} from '@groww-sip/shared'
import { Router } from 'express'
import { z } from 'zod'

/** Comma-separated multi-select (e.g. ?channel=YouTube,Forum). Values within a filter are OR'd; filters are AND'd. */
const multi = <T extends string>(allowed: readonly T[]) =>
  z.string().optional().transform((v, ctx) => {
    if (!v) return undefined
    const vals = v.split(',').map((s) => s.trim()).filter(Boolean)
    const bad = vals.filter((x) => !allowed.includes(x as T))
    if (bad.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown value(s): ${bad.join(', ')}` })
    return vals as T[]
  })

const Query = z.object({
  channel: multi(SOURCE_CHANNELS),
  stage: multi(INVESTOR_LIFECYCLE_STAGES),
  segment: multi(USER_SEGMENTS),
  theme: z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export function corpusRouter() {
  const r = Router()

  r.get('/corpus/summary', (_req, res) => res.json(CORPUS_SUMMARY))

  r.get('/corpus/verbatims', (req, res) => {
    const q = Query.parse(req.query)
    const needle = q.search?.toLowerCase()
    const items = VERBATIMS.filter((v) =>
      (!q.channel || q.channel.includes(v.source)) &&
      (!q.stage || q.stage.includes(v.lifecycleStage)) &&
      (!q.segment || q.segment.includes(v.userSegment)) &&
      (!q.theme || q.theme.includes(v.primaryThemeId)) &&
      (!needle || v.rawText.toLowerCase().includes(needle)))
    const start = (q.page - 1) * q.limit
    res.json({
      items: items.slice(start, start + q.limit),
      total: items.length,
      page: q.page,
      limit: q.limit,
      totalPages: Math.max(1, Math.ceil(items.length / q.limit)),
    })
  })

  r.get('/quick-load-chips', (_req, res) => res.json(QUICK_LOAD_CHIPS))

  return r
}
