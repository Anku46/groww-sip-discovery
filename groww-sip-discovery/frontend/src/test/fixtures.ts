import type { FrictionTheme, PipelineResponse, ScoredTheme, Verbatim } from '@groww-sip/shared'

export const THEMES: FrictionTheme[] = [
  { id: 'THEME_MANDATE_SETUP_FAILURE', name: 'Autopay mandate setup & execution failures', summary: '', recordCount: 14, severityScores: [3], sebiRestricted: false, platformDependent: true, recordIds: [] },
  { id: 'THEME_ADVICE_SEEKING', name: 'Seeking fund picks & return assurances', summary: '', recordCount: 9, severityScores: [2], sebiRestricted: true, platformDependent: false, recordIds: [] },
  { id: 'THEME_CONCEPT_GAPS', name: 'Basic concept gaps', summary: '', recordCount: 15, severityScores: [2], sebiRestricted: false, platformDependent: false, recordIds: [] },
]

export const SCORED: ScoredTheme[] = [
  { ...THEMES[0]!, themeSharePercent: 20, meanSeverity: 3.29, addressabilityWeight: 0.7, opportunityScore: 46, rank: 1 },
  { ...THEMES[2]!, themeSharePercent: 21.4, meanSeverity: 2, addressabilityWeight: 1, opportunityScore: 42.9, rank: 2 },
  { ...THEMES[1]!, themeSharePercent: 12.9, meanSeverity: 1.89, addressabilityWeight: 0.2, opportunityScore: 4.9, rank: 3 },
]

export const CHIPS = [
  { label: 'Hinglish mandate amount', verbatimId: 'YT-1', text: 'Autopay me 15000 dikha raha hai' },
  { label: 'SEBI: return assurance', verbatimId: 'YT-2', text: '12 % Return Milega Ki nahi' },
]

export const VERBATIMS: Verbatim[] = [
  { id: 'FM-1', source: 'Forum', language: 'English', date: '2024-01-01', url: 'https://example.com/1', rawText: 'What is NAV?', lifecycleStage: 'PRE_START', userSegment: 'SELF_DIRECTED', primaryThemeId: 'THEME_CONCEPT_GAPS', churnSeverity: 2 },
  { id: 'YT-3', source: 'YouTube', language: 'Hinglish', date: '2025-01-01', url: 'https://example.com/2', rawText: 'mandate 15000 kyu', lifecycleStage: 'MONTH_0_1', userSegment: 'UNKNOWN', primaryThemeId: 'THEME_MANDATE_SETUP_FAILURE', churnSeverity: 3 },
]

export function pipelineResponse(overrides: { sebi?: boolean; engine?: PipelineResponse['engineUsed']; fallbackReason?: PipelineResponse['fallbackReason'] } = {}): PipelineResponse {
  const flags = overrides.sebi
    ? [{ constraintId: 'SEBI_NO_RETURN_PRED' as const, penaltyType: 'BLOCK' as const, triggeredBy: 'input_text' as const, evidence: '12 % Return Milega', message: 'Return prediction request.' }]
    : []
  return {
    rawInput: 'x',
    engineUsed: overrides.engine ?? 'deterministic',
    ...(overrides.fallbackReason ? { fallbackReason: overrides.fallbackReason } : {}),
    executionTimeMs: 12,
    sebiConstraintTriggered: Boolean(overrides.sebi),
    stages: {
      stage1: { original: 'call 9876543210, paisa kat gaya', scrubbed: 'call [PHONE], paisa kat gaya', normalized: 'call [PHONE], paisa was deducted', piiEntitiesFound: [{ type: 'phone', replacement: '[PHONE]' }], hinglishTokensNormalized: [{ phrase: 'kat gaya', english: 'was deducted' }] },
      stage2: { activeDomainRules: [{ id: 'RULE_UPI_MANDATE_LIMIT', name: 'Mandate maximum amount ≠ installment amount', category: 'UX_CONFUSION', summary: 'Ceiling, not a charge.', detailedExplanation: 'Long explanation.', triggerKeywords: ['15000'], sebiRelevance: false }], ruleMatches: [{ ruleId: 'RULE_UPI_MANDATE_LIMIT', matchedBy: 'keyword', keywords: ['15000'] }], augmentedContext: '' },
      stage3: { behavioralProfile: { investorLifecycleStage: 'MONTH_0_1', userSegment: 'UNKNOWN', primaryFrictionTheme: 'THEME_MANDATE_SETUP_FAILURE', insideAppConfusion: 'Reads the limit as the debit.', outsideAppWorkaround: null, churnSeverity: 3, churnSeverityRationale: 'Severity 3: worry.', emotionalSignals: ['confusion'] } },
      stage4: { constraintFlags: flags, addressabilityWeight: overrides.sebi ? 0.2 : 0.7, opportunityContribution: { themeId: 'THEME_MANDATE_SETUP_FAILURE', churnSeverity: 3, addressabilityWeight: overrides.sebi ? 0.2 : 0.7, weightedContribution: overrides.sebi ? 0 : 2.1 } },
    },
  }
}
