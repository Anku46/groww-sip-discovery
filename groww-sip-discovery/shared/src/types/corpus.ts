/** Corpus, theme and discovery-answer contracts. Values come from Phase 2 research (see src/data/). */

/** Public channels (scraped) plus primary research (Google Forms survey, in-depth interviews). */
export const SOURCE_CHANNELS = ['PlayStore', 'AppStore', 'YouTube', 'Forum', 'Survey', 'Interview'] as const
export type SourceChannel = (typeof SOURCE_CHANNELS)[number]

export const LANGUAGES = ['English', 'Hinglish', 'Hindi'] as const
export type Language = (typeof LANGUAGES)[number]

/**
 * Investor lifecycle bucket. `PRE_START` is not in Architecture.md §17; Phase 2 found 29 of 70
 * first-time records come from people who haven't started yet, so it is part of the contract.
 */
export const INVESTOR_LIFECYCLE_STAGES = ['PRE_START', 'MONTH_0_1', 'MONTH_2_4', 'MONTH_5_8', 'MONTH_9_12', 'UNKNOWN'] as const
export type InvestorLifecycleStage = (typeof INVESTOR_LIFECYCLE_STAGES)[number]

/**
 * Segment by onboarding trigger. Architecture.md §17 proposed YOUNG_SALARIED / FREELANCER_GIG /
 * FAMILY_INFLUENCED, but the corpus almost never states income type; onboarding trigger is what it reveals.
 */
export const USER_SEGMENTS = ['INFLUENCER_LED', 'PEER_LED', 'SELF_DIRECTED', 'UNKNOWN'] as const
export type UserSegment = (typeof USER_SEGMENTS)[number]

export const AGE_BANDS = ['UNDER_25', 'AGE_25_40', 'OVER_40', 'UNKNOWN'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export type ChurnSeverity = 1 | 2 | 3 | 4 | 5

/** Theme IDs are data, not code: they come from frictionThemes.ts. */
export type ThemeId = string
export const UNCLASSIFIED_THEME = 'UNCLASSIFIED'
/** Corpus records from investors who report no friction (continuers). Counted in the corpus, in no friction theme. */
export const NO_FRICTION_THEME = 'NO_FRICTION'

export interface Verbatim {
  id: string
  source: SourceChannel
  language: Language
  date: string // YYYY-MM-DD or 'unknown'
  url: string
  rawText: string
  lifecycleStage: InvestorLifecycleStage
  userSegment: UserSegment
  primaryThemeId: ThemeId
  churnSeverity: ChurnSeverity
}

export interface FrictionTheme {
  id: ThemeId
  name: string
  summary: string
  recordCount: number
  severityScores: number[] // one per record in the theme
  sebiRestricted: boolean
  platformDependent: boolean
  recordIds: string[]
}

export interface ScoredTheme extends FrictionTheme {
  themeSharePercent: number
  meanSeverity: number
  addressabilityWeight: number
  opportunityScore: number
  rank: number
}

export interface CorpusSummary {
  totalRaw: number
  rawPerChannel: Partial<Record<SourceChannel, number>>
  afterRuleFilter: number
  removedOnAnalystReview: number
  totalFiltered: number
  filteredPerChannel: Partial<Record<SourceChannel, number>>
  filteredPerLanguage: Partial<Record<Language, number>>
  primaryResearch: { surveyResponses: number; interviews: number; included: number; excluded: number }
  /** Records with no friction (continuers); together with theme records they make up totalFiltered. */
  noFrictionRecordIds: string[]
}

export interface SupportingQuote {
  id: string
  source: SourceChannel
  text: string
}

export interface DiscoveryAnswer {
  id: string // Q1..Q9
  questionText: string
  answer: string
  supportingVerbatimIds: string[]
  supportingQuotes: SupportingQuote[]
  relatedThemeIds: ThemeId[]
}

export interface QuickLoadChip {
  label: string
  verbatimId: string
  text: string
}
