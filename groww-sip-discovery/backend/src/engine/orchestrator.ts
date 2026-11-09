/**
 * Pipeline orchestrator: Stage 1 → 2 → 3 → 4.
 *
 * Engine selection
 *   preferredEngine 'deterministic'         → deterministic
 *   'auto' and no API key                   → deterministic
 *   'llm' and no API key                    → deterministic, engineUsed 'fallback' (no_api_key)
 *   'auto' | 'llm' with a key               → LLM for Stage 3; any failure → deterministic, 'fallback'
 * Stages 1 and 4 are always deterministic (PII never leaves the server; SEBI check is always on).
 */
import type { PipelineResponse, PipelineRunRequest, RuleMatch, Stage2Result, Stage3Result } from '@groww-sip/shared'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { runStage1 } from './deterministic/stage1'
import { buildStage2 } from './deterministic/stage2'
import { runStage3 } from './deterministic/stage3'
import { runStage4 } from './deterministic/stage4'
import type { Embedder } from './embedding/bgeEmbedder'
import { stage3Messages } from './llm/prompts'
import { parseBehavioralProfile } from './llm/responseValidator'
import { LLMError, withTimeout, type LLMProviderFactory } from './llm/types'

export interface EngineDeps {
  config: Config
  logger: Logger
  embedder: Embedder | null
  llmFactory: LLMProviderFactory
}

const ms = (start: number) => Math.round((performance.now() - start) * 10) / 10

async function semanticMatches(embedder: Embedder | null, text: string, logger: Logger): Promise<{ rules: RuleMatch[]; themeHints: { themeId: string; similarity: number }[] }> {
  if (!embedder || embedder.status() !== 'ready') return { rules: [], themeHints: [] }
  try {
    const [rules, themes] = await Promise.all([embedder.semanticRuleMatches(text), embedder.themeSimilarities(text)])
    return {
      rules: rules.map((r) => ({ ruleId: r.ruleId, matchedBy: 'semantic' as const, similarity: r.similarity })),
      themeHints: themes.slice(0, 3),
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'semantic matching failed; using keywords only')
    return { rules: [], themeHints: [] }
  }
}

export async function runPipeline(req: PipelineRunRequest, apiKeyFromRequest: string | undefined, deps: EngineDeps): Promise<PipelineResponse> {
  const start = performance.now()
  const preferred = req.preferredEngine ?? 'auto'
  const apiKey = apiKeyFromRequest?.trim() || deps.config.GROQ_API_KEY

  const stage1 = runStage1(req.rawInput)

  const deterministic = (engineUsed: PipelineResponse['engineUsed'], fallbackReason?: PipelineResponse['fallbackReason']): PipelineResponse => {
    const stage2 = buildStage2(stage1)
    const stage3 = runStage3(stage1, stage2)
    const stage4 = runStage4(stage1, stage3)
    return {
      rawInput: req.rawInput, engineUsed, stages: { stage1, stage2, stage3, stage4 }, executionTimeMs: ms(start),
      sebiConstraintTriggered: stage4.constraintFlags.length > 0,
      ...(fallbackReason ? { fallbackReason } : {}),
    }
  }

  if (preferred === 'deterministic' || (preferred === 'auto' && !apiKey)) return deterministic('deterministic')
  if (!apiKey) return deterministic('fallback', 'no_api_key')

  try {
    const semantic = await semanticMatches(deps.embedder, stage1.normalized, deps.logger)
    const stage2: Stage2Result = buildStage2(stage1, semantic.rules)
    const provider = deps.llmFactory(apiKey)
    const raw = await withTimeout(deps.config.LLM_TIMEOUT_MS, (signal) =>
      provider.complete(stage3Messages(stage1, stage2, semantic.themeHints), { signal }))
    const stage3: Stage3Result = { behavioralProfile: parseBehavioralProfile(raw) }
    const stage4 = runStage4(stage1, stage3)
    return {
      rawInput: req.rawInput, engineUsed: 'llm', stages: { stage1, stage2, stage3, stage4 }, executionTimeMs: ms(start),
      sebiConstraintTriggered: stage4.constraintFlags.length > 0,
    }
  } catch (err) {
    const reason = err instanceof LLMError ? err.reason : 'provider_error'
    deps.logger.warn({ reason, message: (err as Error).message }, 'LLM path failed; falling back to deterministic')
    return deterministic('fallback', reason)
  }
}
