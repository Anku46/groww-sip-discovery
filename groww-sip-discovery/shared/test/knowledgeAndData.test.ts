import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CORPUS_SUMMARY, CORRECTION_CASE_STUDIES, DISCOVERY_ANSWERS, DOMAIN_RULES, DOMAIN_RULES_BY_ID, FRICTION_THEMES, GLOSSARY,
  GOLDEN_SET, HINGLISH_MAP, NO_FRICTION_THEME, normalizeHinglish, QUICK_LOAD_CHIPS, SEBI_CONSTRAINTS_BY_ID, VERBATIMS, enforceSEBIConstraints,
} from '../src'

const phase2 = (f: string) => JSON.parse(readFileSync(new URL(`../../../research/data/phase2/${f}`, import.meta.url), 'utf8'))
const themeIds = new Set(FRICTION_THEMES.map((t) => t.id))

describe('domain rules — C1–C5', () => {
  it('C1 every rule is complete', () => {
    for (const r of DOMAIN_RULES) {
      expect(r.id && r.name && r.summary && r.detailedExplanation, r.id).toBeTruthy()
      expect(r.triggerKeywords.length, r.id).toBeGreaterThan(0)
      if (r.relatedConstraintId) expect(SEBI_CONSTRAINTS_BY_ID[r.relatedConstraintId]).toBeDefined()
    }
  })
  it('C2 rules the Phase 4 tests depend on exist', () => {
    for (const id of ['RULE_NACH_BOUNCE', 'RULE_T3_LOCKOUT']) expect(DOMAIN_RULES_BY_ID[id], id).toBeDefined()
  })
  it('C3 unique IDs', () => expect(new Set(DOMAIN_RULES.map((r) => r.id)).size).toBe(DOMAIN_RULES.length))
  it('C4 every correction case cites a known rule or SEBI constraint', () => {
    for (const c of CORRECTION_CASE_STUDIES) {
      const known = c.domainRuleApplied in DOMAIN_RULES_BY_ID || c.domainRuleApplied in SEBI_CONSTRAINTS_BY_ID
      expect(known, `${c.id} → ${c.domainRuleApplied}`).toBe(true)
    }
  })
  it('C5 keywords are lowercase, trimmed, unique per rule', () => {
    for (const r of DOMAIN_RULES) {
      for (const k of r.triggerKeywords) expect(k, r.id).toBe(k.trim().toLowerCase())
      expect(new Set(r.triggerKeywords).size, r.id).toBe(r.triggerKeywords.length)
    }
  })
})

describe('Hinglish map and glossary — C6–C8', () => {
  it('C6 at least 12 mappings', () => expect(HINGLISH_MAP.length).toBeGreaterThanOrEqual(12))
  it('C7 every phrase normalizes to its English intent in a sentence', () => {
    for (const m of HINGLISH_MAP) {
      for (const p of m.phrases) {
        const { normalized, applied } = normalizeHinglish(`Sir mera SIP ${p} please help`)
        expect(normalized, p).toContain(m.english)
        expect(applied.some((a) => a.english === m.english), p).toBe(true)
      }
    }
  })
  it('C7 normalizes the Phase 4 test verbatim', () => {
    expect(normalizeHinglish('5 months ho gaye portfolio abhi bhi -2%').normalized).toBe('5 months have passed portfolio still -2%')
  })
  it('C7 leaves English text alone and matches whole words only', () => {
    expect(normalizeHinglish('My SIP was debited twice').applied).toEqual([])
    expect(normalizeHinglish('katerina').applied).toEqual([])
  })
  it('C8 glossary covers the required terms', () => {
    const terms = GLOSSARY.map((g) => g.term)
    for (const t of ['NPCI', 'NACH', 'T-3 cutoff', 'UPI Autopay', 'NAV', 'Rupee-cost averaging']) expect(terms).toContain(t)
    for (const g of GLOSSARY) expect(g.definition.length).toBeGreaterThan(20)
  })
})

describe('research data files — G1–G6', () => {
  it('G2 counts', () => {
    expect(VERBATIMS).toHaveLength(25)
    expect(DISCOVERY_ANSWERS).toHaveLength(9)
    expect(GOLDEN_SET.length).toBeGreaterThanOrEqual(20)
    expect(CORRECTION_CASE_STUDIES.length).toBeGreaterThanOrEqual(3)
    expect(QUICK_LOAD_CHIPS.length).toBeGreaterThanOrEqual(5)
    expect(QUICK_LOAD_CHIPS.length).toBeLessThanOrEqual(6)
  })
  it('G3 data files match the Phase 2 exports', () => {
    expect(VERBATIMS).toEqual(phase2('verbatims.json'))
    expect(GOLDEN_SET).toEqual(phase2('golden_set.json'))
    expect(DISCOVERY_ANSWERS).toEqual(phase2('discovery_answers.json'))
    expect(CORRECTION_CASE_STUDIES).toEqual(phase2('correction_case_studies.json'))
    expect(FRICTION_THEMES.map((t) => [t.id, t.recordCount])).toEqual(
      phase2('friction_themes.json').map((t: { id: string; recordCount: number }) => [t.id, t.recordCount]))
  })
  it('G4 references resolve', () => {
    const corpusIds = new Set([...FRICTION_THEMES.flatMap((t) => t.recordIds), ...CORPUS_SUMMARY.noFrictionRecordIds])
    for (const v of VERBATIMS) {
      expect(themeIds.has(v.primaryThemeId) || v.primaryThemeId === NO_FRICTION_THEME, v.id).toBe(true)
      expect(corpusIds.has(v.id), v.id).toBe(true)
    }
    for (const a of DISCOVERY_ANSWERS) {
      for (const id of a.supportingVerbatimIds) expect(corpusIds.has(id), `${a.id} ${id}`).toBe(true)
      for (const t of a.relatedThemeIds) expect(themeIds.has(t), `${a.id} ${t}`).toBe(true)
    }
    for (const g of GOLDEN_SET) {
      expect(themeIds.has(g.humanLabel.theme), g.id).toBe(true)
      expect(corpusIds.has(g.verbatimId), g.id).toBe(true)
      expect(['pm_confirmed', 'draft_pending_pm_review']).toContain(g.labelStatus)
      expect(g.aiLabel).toBeNull()
    }
    // The 20-item golden set required by the plan is PM-confirmed; items added later may await review.
    expect(GOLDEN_SET.filter((g) => g.labelStatus === 'pm_confirmed').length).toBeGreaterThanOrEqual(20)
    for (const c of QUICK_LOAD_CHIPS) expect(corpusIds.has(c.verbatimId), c.label).toBe(true)
  })
  it('G4 every theme has records, severities and a golden item', () => {
    const goldenThemes = new Set(GOLDEN_SET.map((g) => g.humanLabel.theme))
    for (const t of FRICTION_THEMES) {
      expect(t.severityScores, t.id).toHaveLength(t.recordCount)
      expect(t.recordIds, t.id).toHaveLength(t.recordCount)
      expect(goldenThemes.has(t.id), t.id).toBe(true)
    }
  })
  it('G5 corpus summary arithmetic', () => {
    const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((s, v) => s + (v ?? 0), 0)
    expect(sum(CORPUS_SUMMARY.filteredPerChannel)).toBe(CORPUS_SUMMARY.totalFiltered)
    expect(sum(CORPUS_SUMMARY.rawPerChannel)).toBe(CORPUS_SUMMARY.totalRaw)
    expect(FRICTION_THEMES.reduce((s, t) => s + t.recordCount, 0) + CORPUS_SUMMARY.noFrictionRecordIds.length)
      .toBe(CORPUS_SUMMARY.totalFiltered)
    const primary = CORPUS_SUMMARY.primaryResearch
    expect((CORPUS_SUMMARY.filteredPerChannel.Survey ?? 0) + (CORPUS_SUMMARY.filteredPerChannel.Interview ?? 0)).toBe(primary.included)
  })
  it('G6 quick-load chips cover SEBI, Hinglish and mandate paths', () => {
    expect(QUICK_LOAD_CHIPS.some((c) => enforceSEBIConstraints(c.text).flags.length > 0)).toBe(true)
    expect(QUICK_LOAD_CHIPS.some((c) => normalizeHinglish(c.text).applied.length > 0)).toBe(true)
    expect(QUICK_LOAD_CHIPS.some((c) => /mandate|autopay|auto pay/i.test(c.text))).toBe(true)
  })
})
