/** Golden set and agreement contracts (Architecture.md §12 Tab 4, §17). */
import type { ChurnSeverity, Language, SourceChannel, ThemeId } from './corpus'

export interface Label {
  theme: ThemeId
  churnSeverity: number
}

/** exact = theme and severity agree; partial = one agrees; mismatch = neither. */
export type MatchStatus = 'exact' | 'partial' | 'mismatch'

export interface GoldenSetItem {
  id: string // GS-01..
  verbatimId: string
  source: SourceChannel
  language: Language
  rawText: string
  /** PM ground truth. */
  humanLabel: { theme: ThemeId; churnSeverity: ChurnSeverity }
  labelStatus: 'pm_confirmed' | 'draft_pending_pm_review'
  reviewedOn: string | null
  analystDraft: Label
  pmChanged: boolean
  whyTricky: string | null
  /** Filled by the engine in Phase 4. */
  aiLabel: Label | null
  matchStatus?: MatchStatus
  rootCause?: string
}

export interface AgreementScore {
  status: 'scored' | 'not_scored'
  totalItems: number
  /** Items with an AI label; percentages are over these. */
  scoredItems: number
  themeMatches: number
  severityMatches: number
  themeAgreementPct: number | null
  severityAgreementPct: number | null
  severityTolerance: number
  items: { id: string; matchStatus: MatchStatus | null }[]
}

export interface CorrectionCaseStudy {
  id: string
  verbatimId: string
  verbatimText: string
  aiOutput: string
  rejectionReason: string
  correctAnswer: string
  domainRuleApplied: string
}
