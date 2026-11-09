import type { RuleMatch } from '@groww-sip/shared'
import { Router } from 'express'
import { z } from 'zod'
import { runStage1 } from '../engine/deterministic/stage1'
import { buildStage2 } from '../engine/deterministic/stage2'
import { runStage3 } from '../engine/deterministic/stage3'
import { runStage4 } from '../engine/deterministic/stage4'
import { runPipeline, type EngineDeps } from '../engine/orchestrator'
import { withTimeout } from '../engine/llm/types'

const API_KEY_HEADER = 'x-groq-api-key'

export function pipelineRouter(deps: EngineDeps) {
  const r = Router()
  const RawInput = z.string().trim().min(1, 'rawInput is required').max(deps.config.MAX_INPUT_CHARS)

  const Stage1Schema = z.object({
    original: z.string(), scrubbed: z.string(), normalized: z.string(),
    piiEntitiesFound: z.array(z.object({ type: z.string(), replacement: z.string() })),
    hinglishTokensNormalized: z.array(z.object({ phrase: z.string(), english: z.string() })),
  })
  const Stage2Schema = z.object({
    ruleMatches: z.array(z.object({ ruleId: z.string(), matchedBy: z.enum(['keyword', 'semantic']) }).passthrough()),
  }).passthrough()
  const Stage3Schema = z.object({
    behavioralProfile: z.object({ primaryFrictionTheme: z.string(), churnSeverity: z.number().int().min(1).max(5) }).passthrough(),
  }).passthrough()

  // Each stage endpoint takes either { rawInput } (earlier stages are run for you) or the previous stages' output.
  r.post('/pipeline/stage/1', (req, res) => {
    const { rawInput } = z.object({ rawInput: RawInput }).parse(req.body)
    res.json(runStage1(rawInput))
  })

  r.post('/pipeline/stage/2', (req, res) => {
    const body = z.object({ rawInput: RawInput.optional(), stage1: Stage1Schema.optional() })
      .refine((b) => b.rawInput || b.stage1, 'Provide rawInput or stage1').parse(req.body)
    const stage1 = body.stage1 ?? runStage1(body.rawInput!)
    res.json(buildStage2(stage1 as ReturnType<typeof runStage1>))
  })

  r.post('/pipeline/stage/3', (req, res) => {
    const body = z.object({ rawInput: RawInput.optional(), stage1: Stage1Schema.optional(), stage2: Stage2Schema.optional() })
      .refine((b) => b.rawInput || (b.stage1 && b.stage2), 'Provide rawInput, or stage1 and stage2').parse(req.body)
    const stage1 = (body.stage1 ?? runStage1(body.rawInput!)) as ReturnType<typeof runStage1>
    // Keyword matches are recomputed from stage1; semantic ones (if any) are carried over from the given stage2.
    const semantic = (body.stage2?.ruleMatches ?? []).filter((m) => m.matchedBy === 'semantic') as RuleMatch[]
    res.json(runStage3(stage1, buildStage2(stage1, semantic)))
  })

  r.post('/pipeline/stage/4', (req, res) => {
    const body = z.object({ rawInput: RawInput.optional(), stage1: Stage1Schema.optional(), stage3: Stage3Schema.optional() })
      .refine((b) => b.rawInput || (b.stage1 && b.stage3), 'Provide rawInput, or stage1 and stage3').parse(req.body)
    const stage1 = (body.stage1 ?? runStage1(body.rawInput!)) as ReturnType<typeof runStage1>
    const stage3 = (body.stage3 ?? runStage3(stage1, buildStage2(stage1))) as ReturnType<typeof runStage3>
    res.json(runStage4(stage1, stage3))
  })

  r.post('/pipeline/run', async (req, res, next) => {
    try {
      const body = z.object({
        rawInput: RawInput,
        preferredEngine: z.enum(['auto', 'deterministic', 'llm']).default('auto'),
      }).parse(req.body)
      res.json(await runPipeline(body, req.header(API_KEY_HEADER), deps))
    } catch (err) {
      next(err)
    }
  })

  /** Settings drawer "Validate key". The key comes from the header and is never stored or logged. */
  r.post('/llm/validate-key', async (req, res) => {
    try {
      const key = req.header(API_KEY_HEADER)?.trim()
      if (!key) {
        res.status(400).json({ error: 'missing_api_key', message: `Send the key in the ${API_KEY_HEADER} header.` })
        return
      }
      const provider = deps.llmFactory(key)
      const valid = await withTimeout(deps.config.LLM_TIMEOUT_MS, (signal) => provider.validateKey({ signal }))
      res.json({ valid, provider: provider.name, model: provider.model })
    } catch (err) {
      deps.logger.warn({ message: (err as Error).message }, 'key validation failed')
      res.json({ valid: false, error: 'provider_unreachable' })
    }
  })

  return r
}
