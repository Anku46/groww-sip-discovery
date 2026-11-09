/**
 * Theme Agreement % = exact theme matches / scored items
 * Severity Agreement % = |AI − human| ≤ 0.5 / scored items          (Architecture.md §12 Tab 4)
 *
 * Items without an AI label are skipped; with none at all the result is 'not_scored' (Phase 3 state, before
 * the engine fills AI labels in Phase 4).
 */
import type { AgreementScore, GoldenSetItem, MatchStatus } from '../types/golden'

export const SEVERITY_TOLERANCE = 0.5
const EPS = 1e-9

export function matchStatusFor(item: Pick<GoldenSetItem, 'humanLabel' | 'aiLabel'>, tolerance = SEVERITY_TOLERANCE): MatchStatus | null {
  if (!item.aiLabel) return null
  const theme = item.aiLabel.theme === item.humanLabel.theme
  const severity = Math.abs(item.aiLabel.churnSeverity - item.humanLabel.churnSeverity) <= tolerance + EPS
  return theme && severity ? 'exact' : theme || severity ? 'partial' : 'mismatch'
}

export function computeAgreementScore(
  items: readonly Pick<GoldenSetItem, 'id' | 'humanLabel' | 'aiLabel'>[],
  tolerance = SEVERITY_TOLERANCE,
): AgreementScore {
  let scored = 0
  let themeMatches = 0
  let severityMatches = 0
  const perItem = items.map((item) => {
    const status = matchStatusFor(item, tolerance)
    if (item.aiLabel) {
      scored++
      if (item.aiLabel.theme === item.humanLabel.theme) themeMatches++
      if (Math.abs(item.aiLabel.churnSeverity - item.humanLabel.churnSeverity) <= tolerance + EPS) severityMatches++
    }
    return { id: item.id, matchStatus: status }
  })
  const pct = (n: number) => (scored ? Math.round((n / scored) * 1000) / 10 : null)
  return {
    status: scored ? 'scored' : 'not_scored',
    totalItems: items.length,
    scoredItems: scored,
    themeMatches,
    severityMatches,
    themeAgreementPct: pct(themeMatches),
    severityAgreementPct: pct(severityMatches),
    severityTolerance: tolerance,
    items: perItem,
  }
}
