/** Domain knowledge and SEBI constraint contracts (Architecture.md §9, §13). */

export const DOMAIN_RULE_CATEGORIES = ['PAYMENT_PLUMBING', 'NAV_MECHANICS', 'REGULATORY', 'UX_CONFUSION'] as const
export type DomainRuleCategory = (typeof DOMAIN_RULE_CATEGORIES)[number]

export interface DomainRule {
  id: string
  name: string
  category: DomainRuleCategory
  summary: string // one line, shown on the rule card
  detailedExplanation: string // shown when the card is expanded
  triggerKeywords: string[] // lowercase; matched by Stage 2 against normalized text
  sebiRelevance: boolean
  relatedConstraintId?: SEBIConstraintId
}

export interface GlossaryEntry {
  term: string
  definition: string
}

export interface HinglishMapping {
  /** Lowercase phrase variants as they appear in the corpus. */
  phrases: string[]
  /** Structured English intent the phrases normalize to. */
  english: string
}

export const SEBI_CONSTRAINT_IDS = ['SEBI_NO_FUND_REC', 'SEBI_NO_FOMO', 'SEBI_NO_RETURN_PRED', 'SEBI_RIA_BOUNDARY'] as const
export type SEBIConstraintId = (typeof SEBI_CONSTRAINT_IDS)[number]

/**
 * BLOCK: opportunity contribution zeroed, red banner.
 * DOWNGRADE: addressability set to the override, amber card.
 * WARN: informational note only, no scoring impact.
 */
export type SEBIPenaltyType = 'BLOCK' | 'DOWNGRADE' | 'WARN'

export interface SEBIConstraint {
  id: SEBIConstraintId
  name: string
  description: string
  detectionPatterns: RegExp[]
  penaltyType: SEBIPenaltyType
  addressabilityOverride?: number
}

export interface ConstraintFlag {
  constraintId: SEBIConstraintId
  penaltyType: SEBIPenaltyType
  /** What triggered it: a text pattern in the input, or the classified theme being SEBI-restricted. */
  triggeredBy: 'input_text' | 'behavioral_profile'
  /** The matched text fragment, when triggered by input text. */
  evidence?: string
  message: string
}

export interface SEBIEnforcementResult {
  flags: ConstraintFlag[]
  /** Lowest override among triggered constraints, or null if none applies. Penalties don't compound. */
  addressabilityOverride: number | null
  /** True when any BLOCK constraint fired: the record's opportunity contribution is zeroed. */
  blocked: boolean
}
