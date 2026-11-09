import { FRICTION_THEMES, INVESTOR_LIFECYCLE_STAGES, UNCLASSIFIED_THEME, USER_SEGMENTS, type BehavioralProfile } from '@groww-sip/shared'
import { z } from 'zod'
import { LLMError } from './types'

const themeIds: [string, ...string[]] = [UNCLASSIFIED_THEME, ...FRICTION_THEMES.map((t) => t.id)]

const ProfileSchema = z.object({
  investorLifecycleStage: z.enum(INVESTOR_LIFECYCLE_STAGES).catch('UNKNOWN'),
  userSegment: z.enum(USER_SEGMENTS).catch('UNKNOWN'),
  primaryFrictionTheme: z.enum(themeIds),
  insideAppConfusion: z.string().min(1).max(400),
  outsideAppWorkaround: z.string().max(400).nullable().catch(null),
  churnSeverity: z.coerce.number().int().min(1).max(5),
  churnSeverityRationale: z.string().min(1).max(400),
  emotionalSignals: z.array(z.string().max(40)).max(10).catch([]),
})

/** Parse and validate the model's JSON. Theme and severity must be valid; softer fields fall back. */
export function parseBehavioralProfile(raw: string): BehavioralProfile {
  let json: unknown
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    json = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw)
  } catch {
    throw new LLMError('invalid_response', 'LLM response is not JSON')
  }
  const parsed = ProfileSchema.safeParse(json)
  if (!parsed.success) {
    throw new LLMError('invalid_response', `LLM response failed validation: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`)
  }
  return { ...parsed.data, churnSeverity: parsed.data.churnSeverity as BehavioralProfile['churnSeverity'] }
}
