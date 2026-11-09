/**
 * Opportunity Score = Theme Share (%) × Mean Severity × Addressability   (Architecture.md §7)
 *
 * Addressability: SEBI-restricted 0.2 (0.5 when strictSEBIPenalty is off), platform-dependent 0.7, else 1.0.
 * Pure: no mutation of inputs, same output for the same input.
 */
import type { FrictionTheme, ScoredTheme } from '../types/corpus'

export const ADDRESSABILITY = {
  SEBI_STRICT: 0.2,
  SEBI_RELAXED: 0.5,
  PLATFORM_DEPENDENT: 0.7,
  FULL: 1.0,
} as const

export interface ScoringOptions {
  /** Defaults to the sum of theme record counts. */
  totalCorpusSize?: number
  /** Scales the severity dimension, 0.5–2 in the UI. Default 1. */
  severityMultiplier?: number
  /** true: SEBI-restricted themes get 0.2; false: 0.5. Default true. */
  strictSEBIPenalty?: boolean
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp

export function addressabilityFor(theme: Pick<FrictionTheme, 'sebiRestricted' | 'platformDependent'>, strictSEBIPenalty = true): number {
  if (theme.sebiRestricted) return strictSEBIPenalty ? ADDRESSABILITY.SEBI_STRICT : ADDRESSABILITY.SEBI_RELAXED
  if (theme.platformDependent) return ADDRESSABILITY.PLATFORM_DEPENDENT
  return ADDRESSABILITY.FULL
}

export function scoreThemes(themes: readonly FrictionTheme[], options: ScoringOptions = {}): ScoredTheme[] {
  const { severityMultiplier = 1, strictSEBIPenalty = true } = options
  if (!(severityMultiplier > 0)) throw new RangeError('severityMultiplier must be > 0')
  const total = options.totalCorpusSize ?? themes.reduce((s, t) => s + t.recordCount, 0)

  const scored = themes.map((t) => {
    const themeSharePercent = total > 0 ? (t.recordCount / total) * 100 : 0
    const meanSeverity = t.severityScores.length ? t.severityScores.reduce((s, v) => s + v, 0) / t.severityScores.length : 0
    const addressabilityWeight = addressabilityFor(t, strictSEBIPenalty)
    const opportunityScore = themeSharePercent * meanSeverity * severityMultiplier * addressabilityWeight
    return {
      ...t,
      severityScores: [...t.severityScores],
      recordIds: [...t.recordIds],
      themeSharePercent: round(themeSharePercent),
      meanSeverity: round(meanSeverity),
      addressabilityWeight,
      opportunityScore: round(opportunityScore),
      rank: 0,
    }
  })

  scored.sort((a, b) => b.opportunityScore - a.opportunityScore || a.name.localeCompare(b.name))
  scored.forEach((t, i) => (t.rank = i + 1))
  return scored
}
