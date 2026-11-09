/**
 * Stage 2 — domain rule injector. Keyword match of the domain rules' trigger keywords against both the
 * scrubbed text and its Hinglish-normalized form (so "kat gaya" and "was deducted" both count).
 * Semantic (BGE) matches can be merged in by the orchestrator.
 */
import { DOMAIN_RULES, DOMAIN_RULES_BY_ID, type RuleMatch, type Stage1Result, type Stage2Result } from '@groww-sip/shared'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole-word match that tolerates simple suffixes ("charge" → "charges", "charged"), so short keywords
// like "red" or "nav" don't fire inside "credited" or "navigation".
const KEYWORD_RES = DOMAIN_RULES.map((rule) => ({
  rule,
  res: rule.triggerKeywords.map((k) => ({ k, re: new RegExp(`(?<![\\p{L}\\p{N}])${escape(k)}(?:s|es|ed|d)?(?![\\p{L}\\p{N}])`, 'iu') })),
}))

export function matchRulesByKeyword(text: string): RuleMatch[] {
  const matches: RuleMatch[] = []
  for (const { rule, res } of KEYWORD_RES) {
    const hits = res.filter(({ re }) => re.test(text)).map(({ k }) => k)
    if (hits.length) matches.push({ ruleId: rule.id, matchedBy: 'keyword', keywords: hits })
  }
  return matches
}

export function buildStage2(stage1: Stage1Result, extraMatches: RuleMatch[] = []): Stage2Result {
  const keywordMatches = matchRulesByKeyword(`${stage1.scrubbed}\n${stage1.normalized}`)
  const seen = new Set(keywordMatches.map((m) => m.ruleId))
  const ruleMatches = [...keywordMatches, ...extraMatches.filter((m) => !seen.has(m.ruleId))]
  const activeDomainRules = ruleMatches.map((m) => DOMAIN_RULES_BY_ID[m.ruleId]!).filter(Boolean)
  const augmentedContext = activeDomainRules.length
    ? `${stage1.normalized}\n\nRelevant domain rules:\n${activeDomainRules.map((r) => `- ${r.name}: ${r.summary}`).join('\n')}`
    : stage1.normalized
  return { activeDomainRules, ruleMatches, augmentedContext }
}

export const runStage2 = (stage1: Stage1Result): Stage2Result => buildStage2(stage1)
