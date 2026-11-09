/**
 * Prompt templates. Only Stage 3 (behavioral extraction) goes to the LLM:
 *  - Stage 1 stays deterministic so raw PII never leaves the server.
 *  - Stage 2 is keyword + BGE-semantic matching against the curated rule catalogue (no hallucinated rules).
 *  - Stage 4 is the always-on deterministic SEBI enforcer.
 */
import {
  FRICTION_THEMES, INVESTOR_LIFECYCLE_STAGES, UNCLASSIFIED_THEME, USER_SEGMENTS,
  type Stage1Result, type Stage2Result,
} from '@groww-sip/shared'
import type { ChatMessage } from '../types'

export const SYSTEM_PROMPT = `You are a product-research analyst classifying feedback from first-time mutual fund SIP investors in India.
You read English, Hinglish and Hindi. You never give investment advice, never name or rank funds, and never predict returns.
You respond with a single JSON object and nothing else.`

const SEVERITY_RUBRIC = `churnSeverity (integer 1-5):
1 = positive or curious, no friction
2 = question or confusion, no sign of wanting to stop
3 = frustration or worry about money already committed
4 = money stuck, repeated failure, or explicit fear; trust at risk
5 = wants to stop, cannot stop, or describes someone abandoning SIPs`

export function stage3Messages(stage1: Stage1Result, stage2: Stage2Result, themeHints: { themeId: string; similarity: number }[] = []): ChatMessage[] {
  const themes = FRICTION_THEMES.map((t) => `- ${t.id}: ${t.name}. ${t.summary}`).join('\n')
  const hints = themeHints.length
    ? `\nSemantically closest themes (embedding similarity, a hint only): ${themeHints.map((h) => `${h.themeId} (${h.similarity.toFixed(2)})`).join(', ')}`
    : ''
  const user = `Classify this investor feedback. Personal data has already been masked.

FEEDBACK (Hinglish phrases are followed by their English meaning in the normalized version):
Original (masked): """${stage1.scrubbed}"""
Normalized: """${stage1.normalized}"""

DOMAIN CONTEXT (rules that apply):
${stage2.activeDomainRules.map((r) => `- ${r.id}: ${r.summary}`).join('\n') || '- none matched'}

THEMES (choose exactly one id, or ${UNCLASSIFIED_THEME} if none fits):
${themes}${hints}

${SEVERITY_RUBRIC}

Return JSON with exactly these keys:
{
  "investorLifecycleStage": one of ${JSON.stringify(INVESTOR_LIFECYCLE_STAGES)} (PRE_START = not invested yet),
  "userSegment": one of ${JSON.stringify(USER_SEGMENTS)} (how they came to invest: a creator, friends/family, or on their own),
  "primaryFrictionTheme": theme id,
  "insideAppConfusion": short sentence on what in the app confuses them, or "None detected.",
  "outsideAppWorkaround": short sentence on anything they do outside the app, or null,
  "churnSeverity": integer 1-5,
  "churnSeverityRationale": one sentence,
  "emotionalSignals": array of single words (e.g. "anxiety", "confusion", "frustration", "gratitude")
}`
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ]
}
