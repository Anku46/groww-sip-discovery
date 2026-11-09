import { describe, expect, it } from 'vitest'
import { computeAgreementScore, FRICTION_THEMES, GOLDEN_SET, matchStatusFor, scoreThemes, type FrictionTheme } from '../src'

const theme = (id: string, recordCount: number, severityScores: number[], flags: Partial<FrictionTheme> = {}): FrictionTheme => ({
  id, name: id, summary: '', recordCount, severityScores, sebiRestricted: false, platformDependent: false, recordIds: [], ...flags,
})

// 10 records: A 5 @ mean 2, B 3 @ mean 4 (platform-dependent), C 2 @ mean 3 (SEBI)
const FIXTURE = [
  theme('A', 5, [1, 2, 2, 2, 3]),
  theme('B', 3, [4, 4, 4], { platformDependent: true }),
  theme('C', 2, [3, 3], { sebiRestricted: true }),
]

describe('scoreThemes — eval cases E1–E9', () => {
  it('E1 matches hand-computed scores', () => {
    const s = Object.fromEntries(scoreThemes(FIXTURE).map((t) => [t.id, t.opportunityScore]))
    expect(s).toEqual({ A: 100, B: 84, C: 12 }) // 50×2×1, 30×4×0.7, 20×3×0.2
  })
  it('E2 sorted descending with ranks', () => {
    const r = scoreThemes(FIXTURE)
    expect(r.map((t) => t.id)).toEqual(['A', 'B', 'C'])
    expect(r.map((t) => t.rank)).toEqual([1, 2, 3])
  })
  it('E2 ties broken by name', () => {
    const r = scoreThemes([theme('Zed', 1, [2]), theme('Alpha', 1, [2])])
    expect(r.map((t) => t.name)).toEqual(['Alpha', 'Zed'])
  })
  it('E3 multiplier 1 equals default', () => expect(scoreThemes(FIXTURE, { severityMultiplier: 1 })).toEqual(scoreThemes(FIXTURE)))
  it('E4 multiplier 2 doubles scores, keeps ranking', () => {
    const base = scoreThemes(FIXTURE)
    const doubled = scoreThemes(FIXTURE, { severityMultiplier: 2 })
    expect(doubled.map((t) => t.id)).toEqual(base.map((t) => t.id))
    doubled.forEach((t, i) => expect(t.opportunityScore).toBeCloseTo(base[i]!.opportunityScore * 2))
  })
  it('E5/E6 SEBI penalty toggle only affects restricted themes', () => {
    const strict = scoreThemes(FIXTURE, { strictSEBIPenalty: true })
    const relaxed = scoreThemes(FIXTURE, { strictSEBIPenalty: false })
    const get = (r: typeof strict, id: string) => r.find((t) => t.id === id)!
    expect(get(strict, 'C').addressabilityWeight).toBe(0.2)
    expect(get(relaxed, 'C').addressabilityWeight).toBe(0.5)
    expect(get(relaxed, 'A').opportunityScore).toBe(get(strict, 'A').opportunityScore)
    expect(get(relaxed, 'B').opportunityScore).toBe(get(strict, 'B').opportunityScore)
  })
  it('E7 zero-record theme scores 0, no NaN', () => {
    const r = scoreThemes([...FIXTURE, theme('Empty', 0, [])])
    const e = r.find((t) => t.id === 'Empty')!
    expect(e.opportunityScore).toBe(0)
    expect(Number.isNaN(e.meanSeverity)).toBe(false)
  })
  it('E8 real themes: one entry each, shares sum to 100', () => {
    const r = scoreThemes(FRICTION_THEMES)
    expect(r).toHaveLength(FRICTION_THEMES.length)
    expect(r.reduce((s, t) => s + t.themeSharePercent, 0)).toBeCloseTo(100, 0)
  })
  it('E9 pure: no mutation, deterministic', () => {
    const before = JSON.stringify(FIXTURE)
    expect(scoreThemes(FIXTURE)).toEqual(scoreThemes(FIXTURE))
    expect(JSON.stringify(FIXTURE)).toBe(before)
  })
  it('rejects a non-positive multiplier', () => expect(() => scoreThemes(FIXTURE, { severityMultiplier: 0 })).toThrow())
})

const item = (id: string, h: [string, number], a: [string, number] | null) => ({
  id, humanLabel: { theme: h[0], churnSeverity: h[1] as 1 }, aiLabel: a && { theme: a[0], churnSeverity: a[1] },
})

describe('computeAgreementScore — eval cases F1–F6', () => {
  it('F1 all match', () => {
    const r = computeAgreementScore([item('1', ['T', 3], ['T', 3]), item('2', ['U', 2], ['U', 2])])
    expect([r.themeAgreementPct, r.severityAgreementPct]).toEqual([100, 100])
  })
  it('F2 none match', () => {
    const r = computeAgreementScore([item('1', ['T', 1], ['U', 5])])
    expect([r.themeAgreementPct, r.severityAgreementPct]).toEqual([0, 0])
  })
  it('F3 severity boundary: 0.5 agrees, 0.51 does not', () => {
    expect(computeAgreementScore([item('1', ['T', 3], ['T', 3.5])]).severityMatches).toBe(1)
    expect(computeAgreementScore([item('1', ['T', 3], ['T', 3.51])]).severityMatches).toBe(0)
  })
  it('F4 mixed fixture 15/20 theme, 12/20 severity', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      item(String(i), ['T', 3], [i < 15 ? 'T' : 'X', i < 12 ? 3 : 5]))
    const r = computeAgreementScore(items)
    expect([r.themeAgreementPct, r.severityAgreementPct]).toEqual([75, 60])
  })
  it('F5 placeholder AI labels give not_scored, no throw', () => {
    const r = computeAgreementScore(GOLDEN_SET)
    expect(r.status).toBe('not_scored')
    expect(r.totalItems).toBe(GOLDEN_SET.length)
    expect(r.themeAgreementPct).toBeNull()
  })
  it('F6 match status per item', () => {
    expect(matchStatusFor(item('1', ['T', 3], ['T', 3]))).toBe('exact')
    expect(matchStatusFor(item('1', ['T', 3], ['T', 5]))).toBe('partial')
    expect(matchStatusFor(item('1', ['T', 3], ['U', 3]))).toBe('partial')
    expect(matchStatusFor(item('1', ['T', 3], ['U', 5]))).toBe('mismatch')
    expect(matchStatusFor(item('1', ['T', 3], null))).toBeNull()
  })
})
