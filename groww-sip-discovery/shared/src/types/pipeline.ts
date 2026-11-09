/** 4-stage pipeline contracts (Architecture.md §5, §17). */
import type { ChurnSeverity, InvestorLifecycleStage, ThemeId, UserSegment } from './corpus'
import type { ConstraintFlag, DomainRule } from './domain'

export const ENGINE_MODES = ['deterministic', 'llm', 'fallback'] as const
export type EngineMode = (typeof ENGINE_MODES)[number]

/** What the caller asks for; 'auto' uses the LLM when a key is available, else deterministic. */
export type PreferredEngine = 'auto' | 'deterministic' | 'llm'

export type PIIEntityType = 'phone' | 'email' | 'upi' | 'bank_account' | 'pan' | 'name'

export interface PIIEntity {
  type: PIIEntityType
  /** Placeholder written into the scrubbed text, e.g. "[PHONE]". The original value is never returned. */
  replacement: string
}

export interface HinglishNormalization {
  phrase: string
  english: string
}

export interface Stage1Result {
  original: string
  scrubbed: string
  normalized: string
  piiEntitiesFound: PIIEntity[]
  hinglishTokensNormalized: HinglishNormalization[]
}

export interface RuleMatch {
  ruleId: string
  matchedBy: 'keyword' | 'semantic'
  /** Keywords that matched (keyword matches). */
  keywords?: string[]
  /** Cosine similarity to the rule text (semantic matches via BGE embeddings). */
  similarity?: number
}

export interface Stage2Result {
  activeDomainRules: DomainRule[]
  ruleMatches: RuleMatch[]
  /** Normalized text plus the matched rules' summaries, as context for Stage 3. */
  augmentedContext: string
}

export interface BehavioralProfile {
  investorLifecycleStage: InvestorLifecycleStage
  userSegment: UserSegment
  primaryFrictionTheme: ThemeId // or UNCLASSIFIED_THEME
  insideAppConfusion: string
  outsideAppWorkaround: string | null
  churnSeverity: ChurnSeverity
  churnSeverityRationale: string
  emotionalSignals: string[]
}

export interface Stage3Result {
  behavioralProfile: BehavioralProfile
}

export interface OpportunityContribution {
  themeId: ThemeId
  churnSeverity: number
  addressabilityWeight: number
  /** churnSeverity × addressabilityWeight; 0 when a BLOCK constraint fired. */
  weightedContribution: number
}

export interface Stage4Result {
  constraintFlags: ConstraintFlag[]
  addressabilityWeight: number
  opportunityContribution: OpportunityContribution
}

export interface PipelineRunRequest {
  rawInput: string
  preferredEngine?: PreferredEngine
}

export interface PipelineResponse {
  rawInput: string
  engineUsed: EngineMode
  stages: {
    stage1: Stage1Result
    stage2: Stage2Result
    stage3: Stage3Result
    stage4: Stage4Result
  }
  executionTimeMs: number
  sebiConstraintTriggered: boolean
  /** Why the LLM path wasn't used, when engineUsed is 'fallback'. */
  fallbackReason?: 'no_api_key' | 'invalid_api_key' | 'timeout' | 'invalid_response' | 'provider_error'
}

/** Name used in Architecture.md §17. */
export type PipelineOutput = PipelineResponse
