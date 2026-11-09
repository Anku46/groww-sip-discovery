/**
 * SEBI constraint registry and enforcer (Architecture.md §9). Always-on: the backend runs it after Stage 4
 * whatever the engine. Patterns run on the raw input (English and Hinglish); the behavioral profile adds a
 * DOWNGRADE when the classified theme is itself SEBI-restricted.
 */
import type { BehavioralProfile } from '../types/pipeline'
import type { ConstraintFlag, SEBIConstraint, SEBIConstraintId, SEBIEnforcementResult } from '../types/domain'

// Things an investor asks to have picked for them. FUND includes "SIP" and "company" (as in "best SIP company");
// PRODUCT does not, so "which date for my SIP" or "what is SIP" don't read as recommendation requests.
const PRODUCT = String.raw`(?:funds?|mfs?|mutual funds?|stocks?|shares?|etfs?|schemes?)`
const FUND = String.raw`(?:funds?|mfs?|mutual funds?|stocks?|shares?|sips?|etfs?|company|companies|schemes?)`

export const SEBI_CONSTRAINTS: SEBIConstraint[] = [
  {
    id: 'SEBI_NO_FUND_REC',
    name: 'No fund / stock recommendation',
    description: 'Asks the platform to pick or rank specific funds, stocks or where to invest.',
    penaltyType: 'DOWNGRADE',
    addressabilityOverride: 0.2,
    detectionPatterns: [
      new RegExp(String.raw`\b(?:which|kaun ?sa|konsa|kaunse|konse)\b[^.?!]{0,30}\b${PRODUCT}\b`, 'i'),
      new RegExp(String.raw`\bbest\b(?!\s+(?:way|time|video|explanation|information|info|part)\b)[^.?!]{0,20}\b${FUND}\b`, 'i'),
      new RegExp(String.raw`\b(?:suggest|recommend)\b[^.?!]{0,30}\b(?:${FUND}|area to invest|where to invest|portfolio)\b`, 'i'),
      /\bshould i (?:buy|switch|invest in)\b/i,
      /\bwhere (?:should i|to) invest\b/i,
    ],
  },
  {
    id: 'SEBI_NO_FOMO',
    name: 'No fear / FOMO / urgency nudge',
    description: 'Urgency or herd language; the engine must not echo it back as a nudge.',
    penaltyType: 'WARN',
    detectionPatterns: [
      /\b(?:everyone|everybody|sab log|all my friends)\b[^.?!]{0,30}\b(?:buy|buying|bought|investing|kharid)/i,
      /\b(?:hurry|jaldi|last chance|too late|miss out|fomo|don'?t miss|before it'?s gone)\b/i,
    ],
  },
  {
    id: 'SEBI_NO_RETURN_PRED',
    name: 'No return prediction',
    description: 'Asks for a predicted or guaranteed return.',
    penaltyType: 'BLOCK',
    addressabilityOverride: 0.2,
    detectionPatterns: [
      /\b(?:will|would|can|could|kya)\b[^.?!]{0,30}\b(?:get|give|gives|earn|make|milega|milenge|dega|denge)\b[^.?!]{0,30}\d+(?:\.\d+)? ?%/i,
      /\d+(?:\.\d+)? ?%[^.?!]{0,25}\b(?:returns?|guarantee|guaranteed|assured|milega|pakka)\b/i,
      /\b(?:guaranteed?|assured|pakka)\s+(?:returns?|profit)\b/i,
      /\b(?:how much|kitna)\b[^.?!]{0,20}\b(?:return|returns|milega|profit)\b/i,
      /\breturns?\s+(?:milega|guarantee)/i,
    ],
  },
  {
    id: 'SEBI_RIA_BOUNDARY',
    name: 'RIA licence boundary',
    description: 'Asks for personalised advice about the investor’s own money or situation.',
    penaltyType: 'DOWNGRADE',
    addressabilityOverride: 0.2,
    detectionPatterns: [
      /\b(?:advise|advice) me\b/i,
      /\bpersonal(?:ly)? (?:advice|advise)\b/i,
      /\b(?:plan|manage) my (?:money|portfolio|investments?|savings)\b/i,
      /\b(?:my|all my) (?:whole |entire )?savings\b/i,
      /\bwould you (?:personally )?(?:choose|pick|invest|do|start)\b/i,
      /\bif you were\b[^.?!]{0,40}\b(?:invest|start|choose)/i,
      /\bin my (?:situation|case|position)\b/i,
    ],
  },
]

export const SEBI_CONSTRAINTS_BY_ID = Object.fromEntries(SEBI_CONSTRAINTS.map((c) => [c.id, c])) as Record<
  SEBIConstraintId,
  SEBIConstraint
>

const MESSAGES: Record<SEBIConstraintId, string> = {
  SEBI_NO_FUND_REC: 'Fund or stock recommendation request: the platform can educate but not recommend.',
  SEBI_NO_FOMO: 'Urgency / herd language detected: respond without urgency or fear framing.',
  SEBI_NO_RETURN_PRED: 'Return prediction request: no return can be predicted or assured.',
  SEBI_RIA_BOUNDARY: 'Personalised advice request: needs a SEBI-registered Investment Adviser.',
}

/**
 * @param rawInput the investor's text (raw or normalized)
 * @param behavioralProfile optional Stage 3 output
 * @param sebiRestrictedThemeIds theme IDs that are SEBI-restricted (from frictionThemes data)
 */
export function enforceSEBIConstraints(
  rawInput: string,
  behavioralProfile?: Pick<BehavioralProfile, 'primaryFrictionTheme'> | null,
  sebiRestrictedThemeIds: ReadonlySet<string> = new Set(),
): SEBIEnforcementResult {
  const text = rawInput ?? ''
  const flags: ConstraintFlag[] = []

  for (const c of SEBI_CONSTRAINTS) {
    for (const re of c.detectionPatterns) {
      const m = re.exec(text)
      if (m) {
        flags.push({ constraintId: c.id, penaltyType: c.penaltyType, triggeredBy: 'input_text', evidence: m[0], message: MESSAGES[c.id] })
        break
      }
    }
  }

  const theme = behavioralProfile?.primaryFrictionTheme
  if (theme && sebiRestrictedThemeIds.has(theme) && !flags.some((f) => f.constraintId === 'SEBI_NO_FUND_REC')) {
    flags.push({
      constraintId: 'SEBI_NO_FUND_REC',
      penaltyType: 'DOWNGRADE',
      triggeredBy: 'behavioral_profile',
      message: MESSAGES.SEBI_NO_FUND_REC,
    })
  }

  const overrides = flags
    .map((f) => SEBI_CONSTRAINTS_BY_ID[f.constraintId].addressabilityOverride)
    .filter((v): v is number => typeof v === 'number')

  return {
    flags,
    addressabilityOverride: overrides.length ? Math.min(...overrides) : null,
    blocked: flags.some((f) => f.penaltyType === 'BLOCK'),
  }
}
